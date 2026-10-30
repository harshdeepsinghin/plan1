import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PREFERENCES,
  createFormatters,
  currencyLabel,
  formatCurrency,
  formatDate,
  isCurrencyCode,
  isDateFormat,
  isEventType,
  isTimezone,
  resolvePreferences,
} from './preferences'

describe('preference guards', () => {
  it('accepts only supported values', () => {
    expect(isCurrencyCode('EUR')).toBe(true)
    expect(isCurrencyCode('XYZ')).toBe(false)
    expect(isTimezone('Europe/London')).toBe(true)
    expect(isTimezone('Mars/Olympus')).toBe(false)
    expect(isDateFormat('YYYY_MM_DD')).toBe(true)
    expect(isDateFormat('nope')).toBe(false)
    expect(isEventType('wedding')).toBe(true)
    expect(isEventType('party')).toBe(false)
  })
})

describe('resolvePreferences', () => {
  it('keeps valid stored preferences', () => {
    expect(
      resolvePreferences({
        currency: 'GBP',
        timezone: 'Europe/London',
        date_format: 'D_MMM_YYYY',
        default_event_type: 'birthday',
      })
    ).toEqual({
      currency: 'GBP',
      timezone: 'Europe/London',
      dateFormat: 'D_MMM_YYYY',
      defaultEventType: 'birthday',
    })
  })

  it('falls back for missing or invalid profiles', () => {
    expect(resolvePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(
      resolvePreferences({
        currency: 'XYZ',
        timezone: 'Nowhere',
        date_format: 'BAD',
        default_event_type: 'party',
      })
    ).toEqual(DEFAULT_PREFERENCES)
  })
})

describe('formatCurrency', () => {
  it('formats using the requested currency without decimals', () => {
    expect(formatCurrency(1234.56, { ...DEFAULT_PREFERENCES, currency: 'USD' })).toBe('$1,235')
    expect(formatCurrency(1000, { ...DEFAULT_PREFERENCES, currency: 'EUR' })).toBe('€1,000')
  })

  it('treats missing or invalid amounts as zero', () => {
    expect(formatCurrency(null)).toBe('$0')
    expect(formatCurrency(Number.NaN)).toBe('$0')
  })

  it('returns a readable label for currencies', () => {
    expect(currencyLabel('INR')).toBe('Indian Rupee')
    expect(currencyLabel('XYZ')).toBe('XYZ')
  })
})

describe('formatDate', () => {
  it('keeps date-only values on the same calendar day', () => {
    expect(formatDate('2026-12-15')).toBe('Dec 15, 2026')
    expect(
      formatDate('2026-12-15', { ...DEFAULT_PREFERENCES, dateFormat: 'YYYY_MM_DD' })
    ).toBe('2026-12-15')
    expect(
      formatDate('2026-12-15', { ...DEFAULT_PREFERENCES, dateFormat: 'D_MMM_YYYY' })
    ).toBe('15 Dec 2026')
    expect(
      formatDate('2026-12-15', { ...DEFAULT_PREFERENCES, dateFormat: 'DD_MM_YYYY' })
    ).toBe('15/12/2026')
    expect(
      formatDate('2026-12-15', { ...DEFAULT_PREFERENCES, dateFormat: 'MM_DD_YYYY' })
    ).toBe('12/15/2026')
  })

  it('returns "Not set" for empty or invalid values', () => {
    expect(formatDate(null)).toBe('Not set')
    expect(formatDate('not-a-date')).toBe('Not set')
  })

  it('formats timestamps in the selected timezone', () => {
    expect(
      formatDate('2026-12-15T23:30:00Z', {
        ...DEFAULT_PREFERENCES,
        timezone: 'America/New_York',
      })
    ).toBe('Dec 15, 2026')
  })

  it('exposes bound formatters', () => {
    const formatters = createFormatters({ ...DEFAULT_PREFERENCES, currency: 'JPY' })
    expect(formatters.formatCurrency(500)).toBe('¥500')
    expect(formatters.formatDate('2026-01-02')).toBe('Jan 2, 2026')
  })
})
