import { describe, expect, it } from 'vitest'
import { preferencesSchema } from './preferences'

describe('preferencesSchema', () => {
  it('accepts supported preferences', () => {
    expect(
      preferencesSchema.parse({
        currency: 'GBP',
        timezone: 'Europe/London',
        date_format: 'D_MMM_YYYY',
        default_event_type: 'birthday',
      })
    ).toEqual({
      currency: 'GBP',
      timezone: 'Europe/London',
      date_format: 'D_MMM_YYYY',
      default_event_type: 'birthday',
    })
  })

  it('rejects unsupported values', () => {
    expect(
      preferencesSchema.safeParse({
        currency: 'XYZ',
        timezone: 'Europe/London',
        date_format: 'D_MMM_YYYY',
        default_event_type: 'birthday',
      }).success
    ).toBe(false)
    expect(
      preferencesSchema.safeParse({
        currency: 'GBP',
        timezone: 'Europe/London',
        date_format: 'BAD',
        default_event_type: 'birthday',
      }).success
    ).toBe(false)
  })
})
