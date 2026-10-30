import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Database-backed AI limits. The ledger lives in `ai_requests` and clients
 * cannot delete rows, so the counter survives page reloads and local storage
 * tampering.
 */
export const AI_RATE_LIMITS = {
  perMinute: 6,
  perHour: 40,
} as const

export class AiRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiRateLimitError'
  }
}

type Db = Pick<SupabaseClient, 'from'>

async function countSince(db: Db, userId: string, since: string): Promise<number | null> {
  const { count, error } = await db
    .from('ai_requests')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  if (error) return null
  return count ?? 0
}

export async function enforceAiRateLimit(
  db: Db,
  userId: string,
  eventId: string,
  kind: string
): Promise<void> {
  const now = Date.now()
  const minuteAgo = new Date(now - 60_000).toISOString()
  const hourAgo = new Date(now - 60 * 60_000).toISOString()

  const [lastMinute, lastHour] = await Promise.all([
    countSince(db, userId, minuteAgo),
    countSince(db, userId, hourAgo),
  ])

  // Fail open if the ledger is unavailable (for example, before migration 005
  // has been applied). The alternative is taking the whole assistant offline.
  if (lastMinute === null || lastHour === null) return

  if (lastMinute >= AI_RATE_LIMITS.perMinute) {
    throw new AiRateLimitError(
      'You are generating too quickly. Wait a minute, then try again.'
    )
  }

  if (lastHour >= AI_RATE_LIMITS.perHour) {
    throw new AiRateLimitError(
      'You have reached the hourly limit for AI drafts. Try again later.'
    )
  }

  const { error } = await db.from('ai_requests').insert({
    user_id: userId,
    event_id: eventId,
    kind: kind.slice(0, 50),
  })

  if (error) {
    console.warn('Could not record AI usage:', error.message)
  }
}
