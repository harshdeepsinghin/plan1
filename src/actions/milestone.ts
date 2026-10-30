'use server'

import { revalidatePath } from 'next/cache'
import { requireEventEdit } from '@/lib/authorization'
import { milestoneSchema } from '@/lib/validations/event'


export async function createMilestone(eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)

  const validated = milestoneSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('milestones').insert({
    ...validated,
    event_id: eventId,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateMilestone(
  milestoneId: string,
  eventId: string,
  formData: FormData
) {
  const { supabase } = await requireEventEdit(eventId)

  const validated = milestoneSchema.partial().parse(Object.fromEntries(formData.entries()))

  const update: Record<string, unknown> = { ...validated }
  if (validated.completed !== undefined) {
    update.completed_at = validated.completed ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('milestones')
    .update(update)
    .eq('id', milestoneId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function toggleMilestone(milestoneId: string, eventId: string, completed: boolean) {
  const { supabase } = await requireEventEdit(eventId)

  const { error } = await supabase
    .from('milestones')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', milestoneId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteMilestone(milestoneId: string, eventId: string) {
  const { supabase } = await requireEventEdit(eventId)

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/timeline`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function reorderMilestones(
  eventId: string,
  milestones: { id: string; sort_order: number }[]
) {
  const { supabase } = await requireEventEdit(eventId)

  const results = await Promise.all(
    milestones.map((milestone) =>
      supabase
        .from('milestones')
        .update({ sort_order: milestone.sort_order })
        .eq('id', milestone.id)
        .eq('event_id', eventId)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/events/${eventId}/timeline`)
}
