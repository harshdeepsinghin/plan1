'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { guestSchema } from '@/lib/validations/event'

export async function createGuest(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = guestSchema.parse(rawData)

  const { error } = await supabase
    .from('guests')
    .insert({ ...validated, event_id: eventId })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
}

export async function createGuestsBulk(eventId: string, guests: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const guestsWithEvent = guests.map(g => ({ ...g, event_id: eventId }))
  
  const { error } = await supabase
    .from('guests')
    .insert(guestsWithEvent)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
}

export async function updateGuest(guestId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = guestSchema.partial().parse(rawData)

  const { error } = await supabase
    .from('guests')
    .update(validated)
    .eq('id', guestId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
}

export async function deleteGuest(guestId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/guests`)
}
