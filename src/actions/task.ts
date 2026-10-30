'use server'

import { revalidatePath } from 'next/cache'
import { requireEventEdit } from '@/lib/authorization'
import { taskSchema } from '@/lib/validations/event'


export async function createTask(eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)

  const validated = taskSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('tasks').insert({
    ...validated,
    event_id: eventId,
  })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateTask(taskId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)

  const validated = taskSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('tasks')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateTaskStatus(taskId: string, eventId: string, status: string) {
  const { supabase } = await requireEventEdit(eventId)

  const allowed = ['todo', 'in_progress', 'review', 'done']
  if (!allowed.includes(status)) throw new Error('Invalid status')

  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteTask(taskId: string, eventId: string) {
  const { supabase } = await requireEventEdit(eventId)

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function reorderTasks(
  eventId: string,
  tasks: { id: string; sort_order: number; status?: string }[]
) {
  const { supabase } = await requireEventEdit(eventId)

  const results = await Promise.all(
    tasks.map((task) => {
      const update: Record<string, unknown> = {
        sort_order: task.sort_order,
        updated_at: new Date().toISOString(),
      }
      if (task.status) update.status = task.status
      return supabase
        .from('tasks')
        .update(update)
        .eq('id', task.id)
        .eq('event_id', eventId)
    })
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/events/${eventId}/tasks`)
}
