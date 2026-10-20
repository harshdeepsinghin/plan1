'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { milestoneSchema } from '@/lib/validations/event'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function createMilestone(eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

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
  const { supabase } = await requireUser()

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
  const { supabase } = await requireUser()

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
  const { supabase } = await requireUser()

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
  const { supabase } = await requireUser()

  await Promise.all(
    milestones.map((milestone) =>
      supabase
        .from('milestones')
        .update({ sort_order: milestone.sort_order })
        .eq('id', milestone.id)
        .eq('event_id', eventId)
    )
  )

  revalidatePath(`/events/${eventId}/timeline`)
}
