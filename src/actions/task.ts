'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { taskSchema } from '@/lib/validations/event'

export async function createTask(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = taskSchema.parse(rawData)

  const { error } = await supabase
    .from('tasks')
    .insert({ ...validated, event_id: eventId, priority: parseInt(validated.priority) })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
}

export async function updateTask(taskId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = taskSchema.partial().parse(rawData)

  if (validated.priority) validated.priority = parseInt(validated.priority)

  const { error } = await supabase
    .from('tasks')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
}

export async function updateTaskStatus(taskId: string, eventId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
}

export async function deleteTask(taskId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/tasks`)
}

export async function reorderTasks(eventId: string, tasks: { id: string; sort_order: number; status?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  for (const t of tasks) {
    const update: any = { sort_order: t.sort_order, updated_at: new Date().toISOString() }
    if (t.status) update.status = t.status
    await supabase
      .from('tasks')
      .update(update)
      .eq('id', t.id)
  }
  
  revalidatePath(`/events/${eventId}/tasks`)
}
