'use server'

import { revalidatePath } from 'next/cache'
import { requireEventEdit } from '@/lib/authorization'
import { MAX_CSV_ROWS } from '@/lib/csv'
import { guestSchema } from '@/lib/validations/event'

const RSVP_VALUES = ['pending', 'yes', 'no', 'maybe'] as const

function revalidateGuests(eventId: string) {
  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function createGuest(eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)
  const validated = guestSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('guests').insert({
    ...validated,
    event_id: eventId,
  })

  if (error) throw new Error(error.message)
  revalidateGuests(eventId)
}

export async function createGuestsBulk(
  eventId: string,
  guests: Array<{
    name: string
    email?: string | null
    phone?: string | null
    category?: string | null
    plus_one?: boolean
    plus_one_name?: string | null
    rsvp_status?: string
    dietary_restrictions?: string | null
    notes?: string | null
  }>
) {
  const { supabase } = await requireEventEdit(eventId)

  if (guests.length > MAX_CSV_ROWS) {
    throw new Error(`Import at most ${MAX_CSV_ROWS.toLocaleString()} guests at a time`)
  }

  const cleaned = guests
    .filter((guest) => guest.name?.trim())
    .map((guest) => {
      const parsed = guestSchema.parse({
        ...guest,
        name: guest.name.trim(),
        plus_one: guest.plus_one ? 'true' : 'false',
      })
      return { ...parsed, event_id: eventId }
    })

  if (!cleaned.length) throw new Error('No valid guests found in the CSV')

  const { error } = await supabase.from('guests').insert(cleaned)
  if (error) throw new Error(error.message)

  revalidateGuests(eventId)
}

export async function updateGuest(guestId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)
  const validated = guestSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('guests')
    .update(validated)
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidateGuests(eventId)
}

export async function updateGuestRsvp(guestId: string, eventId: string, rsvpStatus: string) {
  const { supabase } = await requireEventEdit(eventId)

  if (!RSVP_VALUES.includes(rsvpStatus as (typeof RSVP_VALUES)[number])) {
    throw new Error('Invalid RSVP status')
  }

  const { error } = await supabase
    .from('guests')
    .update({ rsvp_status: rsvpStatus })
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidateGuests(eventId)
}

export async function deleteGuest(guestId: string, eventId: string) {
  const { supabase } = await requireEventEdit(eventId)

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidateGuests(eventId)
}
