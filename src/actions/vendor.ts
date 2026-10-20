'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { vendorSchema } from '@/lib/validations/event'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function createVendor(eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = vendorSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('vendors').insert({
    ...validated,
    event_id: eventId,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateVendor(vendorId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = vendorSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('vendors')
    .update(validated)
    .eq('id', vendorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateVendorStatus(vendorId: string, eventId: string, status: string) {
  const { supabase } = await requireUser()

  const allowed = ['researching', 'contacted', 'quoted', 'negotiating', 'booked', 'rejected']
  if (!allowed.includes(status)) throw new Error('Invalid status')

  const { error } = await supabase
    .from('vendors')
    .update({ status })
    .eq('id', vendorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteVendor(vendorId: string, eventId: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/vendors`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function reorderVendors(
  eventId: string,
  vendors: { id: string; sort_order: number }[]
) {
  const { supabase } = await requireUser()

  await Promise.all(
    vendors.map((vendor) =>
      supabase
        .from('vendors')
        .update({ sort_order: vendor.sort_order })
        .eq('id', vendor.id)
        .eq('event_id', eventId)
    )
  )

  revalidatePath(`/events/${eventId}/vendors`)
}
