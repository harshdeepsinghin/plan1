/**
 * Small, dependency-free CSV helpers used by guest import/export and the
 * settings exports. The parser handles quoted fields, escaped quotes, CRLF,
 * and newlines inside quoted cells.
 */

export function toCsvValue(value: unknown): string {
  const stringValue = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue
}

export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(toCsvValue).join(',')).join('\n')
}

export function parseCsv(text: string): string[][] {
  // Spreadsheets often prepend a UTF-8 BOM. Drop it so the first header is
  // still "name" rather than "\uFEFFname".
  const input = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char === '\r') {
      // CRLF is handled by the \n branch.
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''))
}

/** Reject oversized imports before they reach the server action. */
export const MAX_CSV_ROWS = 5000
export const MAX_CSV_BYTES = 2 * 1024 * 1024
