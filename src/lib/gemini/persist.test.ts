import { describe, expect, it, vi } from 'vitest'
import {
  persistBudget,
  persistIdea,
  persistTheme,
  persistTimeline,
  toBudgetCategoryRows,
  toMilestoneRows,
} from './persist'

type Db = Parameters<typeof persistIdea>[0]

function createDb(options: { insertError?: { message: string } | null; rpcError?: { message: string } | null } = {}) {
  const inserted: unknown[] = []
  const insert = vi.fn(async (rows: unknown) => {
    inserted.push(rows)
    return { error: options.insertError ?? null }
  })
  const rpc = vi.fn(async () => ({ error: options.rpcError ?? null }))
  const from = vi.fn(() => ({ insert }))

  return { db: { from, rpc } as unknown as Db, from, insert, rpc, inserted }
}

const milestone = {
  title: 'Book the venue',
  description: 'Compare three options.',
  due_date: '2026-11-01',
  category: 'booking' as const,
  priority: 1,
  sort_order: 0,
}

describe('toMilestoneRows', () => {
  it('maps milestones with the fallback date and index order', () => {
    const rows = toMilestoneRows(
      'event-1',
      [
        { ...milestone, title: 'A'.repeat(120), description: 'B'.repeat(700) },
        { ...milestone, title: 'Second', due_date: null },
      ],
      '2026-12-15'
    )

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      event_id: 'event-1',
      title: 'A'.repeat(100),
      description: 'B'.repeat(500),
      sort_order: 0,
    })
    expect(rows[1].due_date).toBe('2026-12-15')
    expect(rows[1].sort_order).toBe(1)
  })

  it('caps the number of rows', () => {
    const rows = toMilestoneRows(
      'event-1',
      Array.from({ length: 25 }, () => milestone),
      '2026-12-15'
    )
    expect(rows).toHaveLength(20)
  })

  it('drops an empty description', () => {
    expect(toMilestoneRows('e', [{ ...milestone, description: '' }], '2026-01-01')[0].description).toBeNull()
  })
})

describe('toBudgetCategoryRows', () => {
  it('prefers an explicit amount and clamps negatives', () => {
    const rows = toBudgetCategoryRows(
      'event-1',
      [
        { name: 'Venue', amount: 2500, percentage: 40 },
        { name: 'Food', amount: -10, percentage: null },
        { name: 'Music', amount: Number.NaN, percentage: 10 },
      ],
      5000
    )

    expect(rows[0].allocated).toBe(2500)
    expect(rows[1].allocated).toBe(0)
    expect(rows[2].allocated).toBe(500)
    expect(rows.map((row) => row.sort_order)).toEqual([0, 1, 2])
  })

  it('falls back to 10 percent when neither amount nor percentage is usable', () => {
    const rows = toBudgetCategoryRows(
      'event-1',
      [{ name: 'Misc' }],
      1000
    )
    expect(rows[0].allocated).toBe(100)
  })

  it('caps the number of rows and names', () => {
    const rows = toBudgetCategoryRows(
      'event-1',
      Array.from({ length: 20 }, () => ({ name: 'x'.repeat(80), amount: 1 })),
      100
    )
    expect(rows).toHaveLength(16)
    expect(rows[0].name).toHaveLength(50)
  })
})

describe('persist helpers', () => {
  it('writes saved ideas', async () => {
    const { db, insert } = createDb()
    await persistIdea(db, 'event-1', 'theme', { a: 1 }, 'generation')

    expect(insert).toHaveBeenCalledWith({
      event_id: 'event-1',
      idea_type: 'theme',
      content: { a: 1 },
      prompt_used: 'generation',
    })
  })

  it('surfaces insert errors', async () => {
    const { db } = createDb({ insertError: { message: 'write failed' } })
    await expect(persistIdea(db, 'event-1', 'theme', {}, 'x')).rejects.toThrow('write failed')
  })

  it('persists themes through the RPC and then saves the idea', async () => {
    const { db, rpc, insert } = createDb()
    const theme = {
      theme_name: 'Golden Hour',
      mood_board_keywords: ['warm'],
      decor_style: 'Garden flowers',
      color_palette: { primary: '#aa8800' },
    }

    await persistTheme(db, 'event-1', theme)
    expect(rpc).toHaveBeenCalledWith('set_event_theme', {
      p_event_id: 'event-1',
      p_theme: theme,
    })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ idea_type: 'theme' }))
  })

  it('stops if the theme RPC fails', async () => {
    const { db, insert } = createDb({ rpcError: { message: 'rpc failed' } })
    await expect(
      persistTheme(db, 'event-1', {
        theme_name: 'x',
        mood_board_keywords: [],
        decor_style: '',
        color_palette: {},
      })
    ).rejects.toThrow('rpc failed')
    expect(insert).not.toHaveBeenCalled()
  })

  it('inserts milestones when requested', async () => {
    const { db, insert } = createDb()
    await persistTimeline(
      db,
      'event-1',
      { milestones: [milestone, { ...milestone, title: 'Second' }] },
      '2026-12-15'
    )

    expect(insert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ event_id: 'event-1' })]))
  })

  it('skips milestone inserts when disabled or empty', async () => {
    const { db, insert } = createDb()
    await persistTimeline(db, 'event-1', { milestones: [milestone] }, '2026-12-15', {
      insertMilestones: false,
    })
    await persistTimeline(db, 'event-1', { milestones: [] }, '2026-12-15')

    expect(insert).toHaveBeenCalledTimes(2)
    expect(insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ idea_type: 'timeline' }))
    expect(insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ idea_type: 'timeline' }))
  })

  it('surfaces timeline insert errors', async () => {
    const { db } = createDb({ insertError: { message: 'timeline failed' } })
    await expect(
      persistTimeline(db, 'event-1', { milestones: [milestone] }, '2026-12-15')
    ).rejects.toThrow('timeline failed')
  })

  it('inserts budget categories when requested', async () => {
    const { db, insert } = createDb()
    await persistBudget(
      db,
      'event-1',
      { categories: [{ name: 'Venue', amount: 2000 }] },
      5000
    )

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({ event_id: 'event-1', name: 'Venue', allocated: 2000 }),
    ])
  })

  it('skips category inserts when disabled', async () => {
    const { db, insert } = createDb()
    await persistBudget(db, 'event-1', { categories: [{ name: 'Venue', amount: 1 }] }, 10, {
      insertCategories: false,
    })
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ idea_type: 'budget_breakdown' }))
  })

  it('surfaces category insert errors', async () => {
    const { db } = createDb({ insertError: { message: 'budget failed' } })
    await expect(
      persistBudget(db, 'event-1', { categories: [{ name: 'Venue', amount: 1 }] }, 10)
    ).rejects.toThrow('budget failed')
  })
})
