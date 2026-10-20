import { z } from 'zod'
import {
  CURRENCIES,
  DATE_FORMATS,
  DEFAULT_EVENT_TYPES,
  TIMEZONES,
} from '@/lib/preferences'

const currencyCodes = CURRENCIES.map((currency) => currency.code) as [string, ...string[]]
const timezoneValues = TIMEZONES.map((timezone) => timezone.value) as [string, ...string[]]
const dateFormatValues = DATE_FORMATS.map((format) => format.value) as [string, ...string[]]
const eventTypeValues = DEFAULT_EVENT_TYPES.map((type) => type.value) as [string, ...string[]]

export const preferencesSchema = z.object({
  currency: z.enum(currencyCodes),
  timezone: z.enum(timezoneValues),
  date_format: z.enum(dateFormatValues),
  default_event_type: z.enum(eventTypeValues),
})

export type PreferencesInput = z.infer<typeof preferencesSchema>
