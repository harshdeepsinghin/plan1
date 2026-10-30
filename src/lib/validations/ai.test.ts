import { describe, expect, it } from 'vitest'
import { aiEventIdSchema, chatHistoryItemSchema, chatInputSchema, speechInputSchema } from './ai'

const eventId = '123e4567-e89b-12d3-a456-426614174000'

describe('aiEventIdSchema', () => {
  it('requires a UUID', () => {
    expect(aiEventIdSchema.safeParse(eventId).success).toBe(true)
    expect(aiEventIdSchema.safeParse('event-1').success).toBe(false)
  })
})

describe('chatInputSchema', () => {
  it('trims the message and defaults history', () => {
    expect(chatInputSchema.parse({ eventId, message: '  Help with the budget  ' })).toEqual({
      eventId,
      message: 'Help with the budget',
      history: [],
    })
  })

  it('rejects empty and oversized messages', () => {
    expect(chatInputSchema.safeParse({ eventId, message: '   ' }).success).toBe(false)
    expect(chatInputSchema.safeParse({ eventId, message: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('caps history length and validates each entry', () => {
    const history = Array.from({ length: 21 }, () => ({ role: 'user', content: 'hi' }))
    expect(chatInputSchema.safeParse({ eventId, message: 'hi', history }).success).toBe(false)
    expect(chatHistoryItemSchema.safeParse({ role: 'system', content: 'x' }).success).toBe(false)
  })
})

describe('speechInputSchema', () => {
  it('applies defaults and accepts known options', () => {
    expect(
      speechInputSchema.parse({ eventId, role: 'friend', tone: 'heartfelt' })
    ).toEqual({
      eventId,
      role: 'friend',
      tone: 'heartfelt',
      relationship: '',
      keyMemories: '',
    })
  })

  it('rejects unknown roles, tones, and oversized memories', () => {
    expect(speechInputSchema.safeParse({ eventId, role: 'stranger', tone: 'funny' }).success).toBe(
      false
    )
    expect(speechInputSchema.safeParse({ eventId, role: 'friend', tone: 'shouty' }).success).toBe(
      false
    )
    expect(
      speechInputSchema.safeParse({
        eventId,
        role: 'friend',
        tone: 'funny',
        keyMemories: 'x'.repeat(2001),
      }).success
    ).toBe(false)
  })
})
