'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { milestoneSchema } from '@/lib/validations/event'

export async function createMilestone(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = milestoneSchema.parse(rawData)

  const { error } = await supabase
    .from('milestones')
    .insert({ ...validated, event_id: eventId, priority: parseInt(validated.priority) })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
}

export async function updateMilestone(milestoneId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = milestoneSchema.partial().parse(rawData)

  if (validated.priority) validated.priority = parseInt(validated.priority)
  if (validated.completed !== undefined) {
    validated.completed_at = validated.completed ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('milestones')
    .update(validated)
    .eq('id', milestoneId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
}

export async function deleteMilestone(milestoneId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
}

export async function reorderMilestones(eventId: string, milestones: { id: string; sort_order: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  for (const m of milestones) {
    await supabase
      .from('milestones')
      .update({ sort_order: m.sort_order })
      .eq('id', m.id)
  }
  
  revalidatePath(`/events/${eventId}/timeline`)
}
