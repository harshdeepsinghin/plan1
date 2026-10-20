import type { EventType } from "@/types/database"

export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "NZD", label: "New Zealand Dollar", symbol: "NZ$" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]["code"]

export const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Kolkata", label: "India (Mumbai, New Delhi, IST)" },
  { value: "Asia/Dubai", label: "UAE (Dubai, GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Japan (Tokyo, JST)" },
  { value: "Asia/Shanghai", label: "China (Shanghai, CST)" },
  { value: "Europe/London", label: "UK (London, GMT/BST)" },
  { value: "Europe/Paris", label: "Europe (Paris, CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe (Berlin, CET/CEST)" },
  { value: "Europe/Madrid", label: "Europe (Madrid, CET/CEST)" },
  { value: "America/New_York", label: "US (New York, ET)" },
  { value: "America/Chicago", label: "US (Chicago, CT)" },
  { value: "America/Denver", label: "US (Denver, MT)" },
  { value: "America/Los_Angeles", label: "US (Los Angeles, PT)" },
  { value: "America/Toronto", label: "Canada (Toronto, ET)" },
  { value: "America/Sao_Paulo", label: "Brazil (São Paulo, BRT)" },
  { value: "Australia/Sydney", label: "Australia (Sydney, AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "New Zealand (Auckland, NZST/NZDT)" },
] as const

export const DATE_FORMATS = [
  { value: "MMM_D_YYYY", label: "Dec 15, 2026" },
  { value: "D_MMM_YYYY", label: "15 Dec 2026" },
  { value: "MM_DD_YYYY", label: "12/15/2026" },
  { value: "DD_MM_YYYY", label: "15/12/2026" },
  { value: "YYYY_MM_DD", label: "2026-12-15" },
] as const

export type DateFormat = (typeof DATE_FORMATS)[number]["value"]

export const DEFAULT_EVENT_TYPES: Array<{ value: EventType; label: string }> = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "community", label: "Community event" },
  { value: "other", label: "Other celebration" },
]

export interface UserPreferences {
  currency: CurrencyCode
  timezone: string
  dateFormat: DateFormat
  defaultEventType: EventType
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  currency: "USD",
  timezone: "UTC",
  dateFormat: "MMM_D_YYYY",
  defaultEventType: "wedding",
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((currency) => currency.code === value)
}

export function isTimezone(value: unknown): value is string {
  return TIMEZONES.some((timezone) => timezone.value === value)
}

export function isDateFormat(value: unknown): value is DateFormat {
  return DATE_FORMATS.some((format) => format.value === value)
}

export function isEventType(value: unknown): value is EventType {
  return DEFAULT_EVENT_TYPES.some((type) => type.value === value)
}

/** Resolve database profile fields into a safe, fully-populated preferences object. */
export function resolvePreferences(
  profile:
    | {
        currency?: string | null
        timezone?: string | null
        date_format?: string | null
        default_event_type?: string | null
      }
    | null
    | undefined
): UserPreferences {
  return {
    currency: isCurrencyCode(profile?.currency) ? profile.currency : DEFAULT_PREFERENCES.currency,
    timezone: isTimezone(profile?.timezone) ? profile.timezone : DEFAULT_PREFERENCES.timezone,
    dateFormat: isDateFormat(profile?.date_format)
      ? profile.date_format
      : DEFAULT_PREFERENCES.dateFormat,
    defaultEventType: isEventType(profile?.default_event_type)
      ? profile.default_event_type
      : DEFAULT_PREFERENCES.defaultEventType,
  }
}

export function currencyLabel(code: string): string {
  return CURRENCIES.find((currency) => currency.code === code)?.label || code
}

export function formatCurrency(
  amount: number | null | undefined,
  preferences: UserPreferences = DEFAULT_PREFERENCES
): string {
  const value = Number(amount)
  const currency = isCurrencyCode(preferences.currency) ? preferences.currency : "USD"

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0)
  } catch {
    return `${currency} ${Number.isFinite(value) ? value.toLocaleString() : 0}`
  }
}

function parseDate(value: string | Date): { date: Date; dateOnly: boolean } | null {
  if (value instanceof Date) return { date: value, dateOnly: false }
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    // Noon UTC keeps the calendar day stable in every timezone.
    return { date: new Date(Date.UTC(year, month - 1, day, 12)), dateOnly: true }
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false }
}

export function formatDate(
  value: string | Date | null | undefined,
  preferences: UserPreferences = DEFAULT_PREFERENCES
): string {
  if (!value) return "Not set"

  const parsed = parseDate(value)
  if (!parsed) return "Not set"

  const timeZone = parsed.dateOnly
    ? "UTC"
    : isTimezone(preferences.timezone)
      ? preferences.timezone
      : "UTC"
  const format = isDateFormat(preferences.dateFormat)
    ? preferences.dateFormat
    : DEFAULT_PREFERENCES.dateFormat

  try {
    if (format === "YYYY_MM_DD") {
      const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone,
      }).formatToParts(parsed.date)
      const year = parts.find((part) => part.type === "year")?.value
      const month = parts.find((part) => part.type === "month")?.value
      const day = parts.find((part) => part.type === "day")?.value
      return `${year}-${month}-${day}`
    }

    if (format === "D_MMM_YYYY") {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone,
      }).format(parsed.date)
    }

    if (format === "DD_MM_YYYY") {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone,
      }).format(parsed.date)
    }

    if (format === "MM_DD_YYYY") {
      return new Intl.DateTimeFormat("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        timeZone,
      }).format(parsed.date)
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone,
    }).format(parsed.date)
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(parsed.date)
  }
}

export interface Formatters {
  formatCurrency: (amount: number | null | undefined) => string
  formatDate: (value: string | Date | null | undefined) => string
}

export function createFormatters(preferences: UserPreferences): Formatters {
  return {
    formatCurrency: (amount) => formatCurrency(amount, preferences),
    formatDate: (value) => formatDate(value, preferences),
  }
}
