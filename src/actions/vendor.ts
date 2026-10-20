'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { vendorSchema } from '@/lib/validations/event'

export async function createVendor(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = vendorSchema.parse(rawData)

  const { error } = await supabase
    .from('vendors')
    .insert({ ...validated, event_id: eventId })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
}

export async function updateVendor(vendorId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = vendorSchema.partial().parse(rawData)

  const { error } = await supabase
    .from('vendors')
    .update(validated)
    .eq('id', vendorId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
}

export async function deleteVendor(vendorId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
}

export async function reorderVendors(eventId: string, vendors: { id: string; sort_order: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  for (const v of vendors) {
    await supabase
      .from('vendors')
      .update({ sort_order: v.sort_order })
      .eq('id', v.id)
  }
  
  revalidatePath(`/events/${eventId}/vendors`)
}
