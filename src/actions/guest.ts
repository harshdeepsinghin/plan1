'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { guestSchema } from '@/lib/validations/event'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function createGuest(eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = guestSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('guests').insert({
    ...validated,
    event_id: eventId,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
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
  const { supabase } = await requireUser()

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

  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateGuest(guestId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = guestSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('guests')
    .update(validated)
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateGuestRsvp(guestId: string, eventId: string, rsvpStatus: string) {
  const { supabase } = await requireUser()

  const allowed = ['pending', 'yes', 'no', 'maybe']
  if (!allowed.includes(rsvpStatus)) throw new Error('Invalid RSVP status')

  const { error } = await supabase
    .from('guests')
    .update({ rsvp_status: rsvpStatus })
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteGuest(guestId: string, eventId: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
  revalidatePath(`/events/${eventId}/overview`)
}
