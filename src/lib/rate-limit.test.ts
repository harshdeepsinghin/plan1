import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_RATE_LIMITS, AiRateLimitError, enforceAiRateLimit } from './rate-limit'

interface QueryResult {
  count?: number | null
  error?: { message: string } | null
}

type Db = Parameters<typeof enforceAiRateLimit>[0]

function createDb(results: QueryResult[], insertError: { message: string } | null = null) {
  let index = 0
  const insert = vi.fn(async () => ({ error: insertError }))

  const from = vi.fn(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      insert,
      then: (resolve: (value: QueryResult) => unknown) => {
        const result = results[index++] ?? { count: 0, error: null }
        return Promise.resolve(result).then(resolve)
      },
    }
    return builder
  })

  return { db: { from } as unknown as Db, insert }
}

describe('enforceAiRateLimit', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('records usage when both windows are under the limit', async () => {
    const { db, insert } = createDb([{ count: 1 }, { count: 5 }])

    await expect(enforceAiRateLimit(db, 'user-1', 'event-1', 'theme')).resolves.toBeUndefined()
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      event_id: 'event-1',
      kind: 'theme',
    })
  })

  it('throws when the per-minute limit is reached', async () => {
    const { db, insert } = createDb([
      { count: AI_RATE_LIMITS.perMinute },
      { count: 10 },
    ])

    await expect(enforceAiRateLimit(db, 'user-1', 'event-1', 'theme')).rejects.toBeInstanceOf(
      AiRateLimitError
    )
    expect(insert).not.toHaveBeenCalled()
  })

  it('throws when the hourly limit is reached', async () => {
    const { db, insert } = createDb([
      { count: 1 },
      { count: AI_RATE_LIMITS.perHour },
    ])

    await expect(enforceAiRateLimit(db, 'user-1', 'event-1', 'theme')).rejects.toThrow(
      /hourly limit/i
    )
    expect(insert).not.toHaveBeenCalled()
  })

  it('fails open when the ledger is unavailable', async () => {
    const { db, insert } = createDb([
      { error: { message: 'relation missing' } },
      { count: 2 },
    ])

    await expect(enforceAiRateLimit(db, 'user-1', 'event-1', 'theme')).resolves.toBeUndefined()
    expect(insert).not.toHaveBeenCalled()
  })

  it('does not block generation when recording usage fails', async () => {
    const { db } = createDb([{ count: 0 }, { count: 0 }], { message: 'write failed' })

    await expect(enforceAiRateLimit(db, 'user-1', 'event-1', 'theme')).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledWith('Could not record AI usage:', 'write failed')
  })

  it('truncates long kind labels before storing them', async () => {
    const { db, insert } = createDb([{ count: 0 }, { count: 0 }])

    await enforceAiRateLimit(db, 'user-1', 'event-1', 'x'.repeat(120))
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'x'.repeat(50) })
    )
  })
})
