import { describe, expect, it } from 'vitest'
import { MAX_CSV_BYTES, MAX_CSV_ROWS, parseCsv, rowsToCsv, toCsvValue } from './csv'

describe('toCsvValue', () => {
  it('leaves simple values untouched', () => {
    expect(toCsvValue('Ada Lovelace')).toBe('Ada Lovelace')
    expect(toCsvValue(42)).toBe('42')
  })

  it('renders null and undefined as empty cells', () => {
    expect(toCsvValue(null)).toBe('')
    expect(toCsvValue(undefined)).toBe('')
  })

  it('quotes commas, quotes, and newlines', () => {
    expect(toCsvValue('Lovelace, Ada')).toBe('"Lovelace, Ada"')
    expect(toCsvValue('She said "hello"')).toBe('"She said ""hello"""')
    expect(toCsvValue('line one\nline two')).toBe('"line one\nline two"')
  })
})

describe('parseCsv', () => {
  it('parses a simple table', () => {
    expect(parseCsv('name,email\nAda,ada@example.com\nGrace,grace@example.com')).toEqual([
      ['name', 'email'],
      ['Ada', 'ada@example.com'],
      ['Grace', 'grace@example.com'],
    ])
  })

  it('handles quoted commas, escaped quotes, and embedded newlines', () => {
    expect(parseCsv('name,note\n"Lovelace, Ada","Said ""hello"""\n"Multi\nline",ok')).toEqual([
      ['name', 'note'],
      ['Lovelace, Ada', 'Said "hello"'],
      ['Multi\nline', 'ok'],
    ])
  })

  it('handles CRLF and a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFFname,rsvp\r\nAda,yes\r\n')).toEqual([
      ['name', 'rsvp'],
      ['Ada', 'yes'],
    ])
  })

  it('drops blank rows and trailing empty lines', () => {
    expect(parseCsv('name,email\n\n , \nAda,\n')).toEqual([
      ['name', 'email'],
      ['Ada', ''],
    ])
  })

  it('handles an empty string', () => {
    expect(parseCsv('')).toEqual([])
  })
})

describe('rowsToCsv', () => {
  it('joins rows with newlines and escapes values', () => {
    expect(
      rowsToCsv([
        ['name', 'note'],
        ['Ada', 'hello, world'],
      ])
    ).toBe('name,note\nAda,"hello, world"')
  })
})

describe('import limits', () => {
  it('exposes conservative limits', () => {
    expect(MAX_CSV_ROWS).toBe(5000)
    expect(MAX_CSV_BYTES).toBe(2 * 1024 * 1024)
  })
})
