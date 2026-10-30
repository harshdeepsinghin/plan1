import { describe, expect, it } from 'vitest'
import {
  budgetBreakdownIdeaSchema,
  checklistIdeaSchema,
  colorEntrySchema,
  paletteIdeaSchema,
  speechIdeaSchema,
  themeIdeaSchema,
  timelineIdeaSchema,
  vendorSuggestionsIdeaSchema,
} from './schemas'

describe('themeIdeaSchema', () => {
  it('accepts a role-keyed palette', () => {
    const parsed = themeIdeaSchema.parse({
      theme_name: '  Golden Hour  ',
      description: 'Warm light and wildflowers.',
      color_palette: { primary: '#aa8800', secondary: '#222222' },
      mood_board_keywords: ['warm', 'gold'],
      decor_style: 'Loose garden flowers.',
    })

    expect(parsed.theme_name).toBe('Golden Hour')
    expect(parsed.color_palette).toEqual({ primary: '#aa8800', secondary: '#222222' })
  })

  it('rejects empty theme names and oversized fields', () => {
    expect(themeIdeaSchema.safeParse({ theme_name: '   ' }).success).toBe(false)
    expect(themeIdeaSchema.safeParse({ theme_name: 'x'.repeat(121) }).success).toBe(false)
  })

  it('caps the number of keywords', () => {
    expect(
      themeIdeaSchema.safeParse({
        theme_name: 'x',
        mood_board_keywords: Array.from({ length: 13 }, () => 'word'),
      }).success
    ).toBe(false)
  })
})

describe('colour schema', () => {
  it('falls back to a safe hex when the model returns junk', () => {
    expect(colorEntrySchema.parse({ hex: 'not-a-colour' }).hex).toBe('#eeeeee')
    expect(colorEntrySchema.parse({ hex: '#abc' }).hex).toBe('#abc')
  })

  it('accepts either an array or a record palette', () => {
    expect(paletteIdeaSchema.parse({ palette: [{ hex: '#000000' }] }).palette).toHaveLength(1)
    expect(paletteIdeaSchema.parse({ palette: { primary: '#000000' } }).palette).toEqual({
      primary: '#000000',
    })
  })
})

describe('timelineIdeaSchema', () => {
  it('normalises dates, categories, and priorities', () => {
    const parsed = timelineIdeaSchema.parse({
      milestones: [
        {
          title: 'Book venue',
          due_date: '2026-11-01',
          category: 'booking',
          priority: '1',
        },
        {
          title: 'Send invites',
          due_date: 'not-a-date',
          category: 'made-up',
          priority: 99,
        },
      ],
    })

    expect(parsed.milestones[0].priority).toBe(1)
    expect(parsed.milestones[1]).toMatchObject({
      due_date: null,
      category: 'other',
      priority: 2,
    })
  })

  it('requires a title for each milestone', () => {
    expect(timelineIdeaSchema.safeParse({ milestones: [{ title: '' }] }).success).toBe(false)
  })
})

describe('budgetBreakdownIdeaSchema', () => {
  it('coerces numeric strings and caps percentages', () => {
    const parsed = budgetBreakdownIdeaSchema.parse({
      categories: [{ name: 'Venue', amount: '2500', percentage: '40' }],
      total_allocated: '6000',
    })

    expect(parsed.categories[0].amount).toBe(2500)
    expect(parsed.total_allocated).toBe(6000)
    expect(
      budgetBreakdownIdeaSchema.parse({ categories: [{ name: 'x', percentage: 101 }] }).categories[0]
        .percentage
    ).toBeNull()
  })
})

describe('vendorSuggestionsIdeaSchema', () => {
  it('accepts a full suggestion', () => {
    const parsed = vendorSuggestionsIdeaSchema.parse({
      vendors: [
        {
          category: 'Photography',
          priority: 'high',
          budget_percentage: '15',
          search_queries: ['wedding photographer'],
          questions_to_ask: ['Do you carry backup gear?'],
          tips: ['Book early'],
        },
      ],
    })

    expect(parsed.vendors[0].budget_percentage).toBe(15)
  })

  it('caps list sizes', () => {
    expect(
      vendorSuggestionsIdeaSchema.safeParse({
        vendors: [{ category: 'x', tips: Array.from({ length: 13 }, () => 'tip') }],
      }).success
    ).toBe(false)
  })
})

describe('checklistIdeaSchema', () => {
  it('defaults priority and requires phases', () => {
    const parsed = checklistIdeaSchema.parse({
      checklist: [{ phase: 'Two weeks before', items: [{ task: 'Confirm headcount' }] }],
    })
    expect(parsed.checklist[0].items[0].priority).toBe(2)
    expect(checklistIdeaSchema.safeParse({ checklist: [{ items: [] }] }).success).toBe(false)
  })
})

describe('speechIdeaSchema', () => {
  it('accepts drafts with duration and outline', () => {
    const parsed = speechIdeaSchema.parse({
      drafts: [
        {
          variation: 'heartfelt',
          title: 'A few words',
          estimated_duration_minutes: '2',
          outline: ['Meet-cute', 'Advice'],
          full_text: 'Hello everyone.',
        },
      ],
    })

    expect(parsed.drafts?.[0].estimated_duration_minutes).toBe(2)
  })

  it('rejects overly long drafts', () => {
    expect(
      speechIdeaSchema.safeParse({ drafts: [{ full_text: 'x'.repeat(20_001) }] }).success
    ).toBe(false)
  })
})
