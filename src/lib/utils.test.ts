import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cn,
  getDaysUntil,
  getEventTypeLabel,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  getThemeColors,
  getThemeKeywords,
} from './utils'

afterEach(() => {
  vi.useRealTimers()
})

describe('cn', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2', false && 'hidden', 'px-4')).toBe('px-4')
  })
})

describe('getDaysUntil', () => {
  it('counts calendar days from today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 9, 0, 0))

    expect(getDaysUntil('2026-10-30')).toBe(0)
    expect(getDaysUntil('2026-11-02')).toBe(3)
    expect(getDaysUntil('2026-10-25')).toBe(-5)
  })
})

describe('theme helpers', () => {
  it('reads a role-keyed palette in display order', () => {
    const colors = getThemeColors({
      color_palette: {
        accent: '#333333',
        primary: '#111111',
        secondary: '#222222',
      },
    })

    expect(colors.map((color) => color.hex)).toEqual(['#111111', '#222222', '#333333'])
    expect(colors[0]).toMatchObject({ role: 'primary', name: 'Primary' })
  })

  it('reads an array palette and drops entries without a hex', () => {
    expect(
      getThemeColors({
        color_palette: [{ hex: '#abcdef', name: 'Sand' }, { name: 'No hex' }],
      })
    ).toEqual([{ hex: '#abcdef', name: 'Sand' }])
  })

  it('reads a nested colors array', () => {
    expect(getThemeColors({ color_palette: { colors: [{ hex: '#000000' }] } })).toEqual([
      { hex: '#000000' },
    ])
  })

  it('handles missing or malformed themes', () => {
    expect(getThemeColors(null)).toEqual([])
    expect(getThemeColors({})).toEqual([])
    expect(getThemeColors({ color_palette: 'nope' })).toEqual([])
  })

  it('reads mood keywords from either field', () => {
    expect(getThemeKeywords({ mood_keywords: ['warm', 3] })).toEqual(['warm'])
    expect(getThemeKeywords({ mood_board_keywords: ['bold'] })).toEqual(['bold'])
    expect(getThemeKeywords(undefined)).toEqual([])
  })
})

describe('label helpers', () => {
  it('labels known and unknown event types', () => {
    expect(getEventTypeLabel('wedding')).toBe('Wedding')
    expect(getEventTypeLabel('community')).toBe('Community Event')
    expect(getEventTypeLabel('reunion')).toBe('reunion')
  })

  it('returns a colour class for known statuses and a fallback', () => {
    expect(getStatusColor('booked')).toContain('green')
    expect(getStatusColor('unknown')).toBe('bg-gray-100 text-gray-800')
  })

  it('maps priorities to labels and colours', () => {
    expect(getPriorityLabel(1)).toBe('High')
    expect(getPriorityLabel(9)).toBe('Medium')
    expect(getPriorityColor(3)).toContain('green')
    expect(getPriorityColor(9)).toBe('bg-gray-100 text-gray-800')
  })
})
