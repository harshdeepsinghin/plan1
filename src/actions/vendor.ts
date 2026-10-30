'use server'

import { revalidatePath } from 'next/cache'
import { requireEventEdit } from '@/lib/authorization'
import { vendorSchema } from '@/lib/validations/event'


export async function createVendor(eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)

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
  const { supabase } = await requireEventEdit(eventId)

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
  const { supabase } = await requireEventEdit(eventId)

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
  const { supabase } = await requireEventEdit(eventId)

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
  const { supabase } = await requireEventEdit(eventId)

  const results = await Promise.all(
    vendors.map((vendor) =>
      supabase
        .from('vendors')
        .update({ sort_order: vendor.sort_order })
        .eq('id', vendor.id)
        .eq('event_id', eventId)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/events/${eventId}/vendors`)
}
