import { describe, expect, it } from 'vitest'
import {
  budgetItemSchema,
  collaboratorSchema,
  createEventSchema,
  guestSchema,
  milestoneSchema,
  taskSchema,
  updateEventSchema,
  vendorSchema,
} from './event'

const baseEvent = {
  title: '  Summer party  ',
  event_type: 'birthday',
  event_date: '2026-12-15',
}

describe('createEventSchema', () => {
  it('trims text and applies defaults', () => {
    const parsed = createEventSchema.parse(baseEvent)
    expect(parsed.title).toBe('Summer party')
    expect(parsed.guest_count).toBe(0)
    expect(parsed.budget_total).toBe(0)
    expect(parsed.venue).toBeUndefined()
    expect(parsed.notes).toBeUndefined()
  })

  it('accepts ISO dates and rejects malformed ones', () => {
    expect(createEventSchema.safeParse(baseEvent).success).toBe(true)
    expect(
      createEventSchema.safeParse({ ...baseEvent, event_date: '15/12/2026' }).success
    ).toBe(false)
  })

  it('rejects an empty title and unknown event type', () => {
    expect(createEventSchema.safeParse({ ...baseEvent, title: '   ' }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...baseEvent, event_type: 'party' }).success).toBe(false)
  })

  it('caps guest count and budget', () => {
    expect(createEventSchema.safeParse({ ...baseEvent, guest_count: 100_001 }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...baseEvent, budget_total: 2_000_000_000 }).success).toBe(
      false
    )
  })

  it('treats empty optional strings as null', () => {
    const parsed = createEventSchema.parse({ ...baseEvent, venue: '   ', notes: '' })
    expect(parsed.venue).toBeNull()
    expect(parsed.notes).toBeNull()
  })
})

describe('updateEventSchema', () => {
  it('allows partial updates and status changes', () => {
    expect(updateEventSchema.parse({})).toEqual({})
    expect(updateEventSchema.parse({ status: 'completed' }).status).toBe('completed')
  })

  it('rejects an unknown status', () => {
    expect(updateEventSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })
})

describe('budgetItemSchema', () => {
  it('coerces numbers and defaults to pending', () => {
    const parsed = budgetItemSchema.parse({
      name: 'Venue',
      estimated_cost: '1200',
      actual_cost: '',
    })
    expect(parsed.estimated_cost).toBe(1200)
    expect(parsed.actual_cost).toBeNull()
    expect(parsed.status).toBe('pending')
  })

  it('rejects negative costs', () => {
    expect(budgetItemSchema.safeParse({ name: 'Venue', actual_cost: -1 }).success).toBe(false)
  })
})

describe('milestoneSchema', () => {
  it('normalises checkbox values and defaults', () => {
    const parsed = milestoneSchema.parse({
      title: 'Book venue',
      due_date: '2026-11-01',
      completed: 'on',
    })
    expect(parsed.completed).toBe(true)
    expect(parsed.priority).toBe(2)
    expect(parsed.category).toBe('other')
  })

  it('rejects priorities outside 1-3', () => {
    expect(
      milestoneSchema.safeParse({ title: 'x', due_date: '2026-11-01', priority: 4 }).success
    ).toBe(false)
  })
})

describe('vendorSchema', () => {
  it('validates optional email and website fields', () => {
    const parsed = vendorSchema.parse({
      name: 'Bloom Studio',
      category: 'Flowers',
      email: 'hello@bloom.example',
      website: 'https://bloom.example',
      quote_amount: '450.50',
      rating: '5',
    })
    expect(parsed.email).toBe('hello@bloom.example')
    expect(parsed.quote_amount).toBe(450.5)
    expect(parsed.rating).toBe(5)
  })

  it('rejects an invalid email, URL, or rating', () => {
    expect(
      vendorSchema.safeParse({ name: 'x', category: 'y', email: 'not-an-email' }).success
    ).toBe(false)
    expect(
      vendorSchema.safeParse({ name: 'x', category: 'y', website: 'not a url' }).success
    ).toBe(false)
    expect(
      vendorSchema.safeParse({ name: 'x', category: 'y', rating: 6 }).success
    ).toBe(false)
  })
})

describe('guestSchema', () => {
  it('normalises the plus-one checkbox', () => {
    expect(guestSchema.parse({ name: 'Ada', plus_one: 'true' }).plus_one).toBe(true)
    expect(guestSchema.parse({ name: 'Ada', plus_one: undefined }).plus_one).toBe(false)
  })
})

describe('taskSchema', () => {
  it('accepts empty due dates and assignees', () => {
    const parsed = taskSchema.parse({
      title: 'Send invites',
      due_date: '',
      assignee_id: '',
      priority: '1',
    })
    expect(parsed.due_date).toBeNull()
    expect(parsed.assignee_id).toBeNull()
    expect(parsed.priority).toBe(1)
  })

  it('rejects malformed due dates', () => {
    expect(taskSchema.safeParse({ title: 'x', due_date: 'tomorrow' }).success).toBe(false)
  })
})

describe('collaboratorSchema', () => {
  it('lowercases and trims email addresses', () => {
    expect(collaboratorSchema.parse({ email: '  ADA@Example.com ' }).email).toBe(
      'ada@example.com'
    )
  })

  it('only allows editor or viewer roles', () => {
    expect(collaboratorSchema.parse({ email: 'a@b.co' }).role).toBe('editor')
    expect(collaboratorSchema.safeParse({ email: 'a@b.co', role: 'owner' }).success).toBe(false)
  })
})
