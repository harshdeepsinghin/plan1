'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { collaboratorSchema } from '@/lib/validations/event'

export async function inviteCollaborator(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = collaboratorSchema.parse(rawData)

  // Find user by email
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', (await supabase.auth.admin.listUsers()).users.find(u => u.email === validated.email)?.id)
    .single()

  // Better: use auth admin to find user by email
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const targetUser = users.find(u => u.email === validated.email)
  
  if (!targetUser) {
    throw new Error('User not found. They need to sign up first.')
  }

  // Check if already collaborator
  const { data: existing } = await supabase
    .from('event_collaborators')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', targetUser.id)
    .single()

  if (existing) {
    throw new Error('Already a collaborator')
  }

  const { error } = await supabase
    .from('event_collaborators')
    .insert({
      event_id: eventId,
      user_id: targetUser.id,
      role: validated.role,
    })

  if (error) throw new Error(error.message)

  // TODO: Send email invitation (using Supabase Edge Function or email service)
  
  revalidatePath(`/events/${eventId}/settings`)
}

export async function updateCollaboratorRole(eventId: string, collaboratorId: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('event_collaborators')
    .update({ role })
    .eq('id', collaboratorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function removeCollaborator(eventId: string, collaboratorId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function acceptInvitation(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('event_collaborators')
    .update({ accepted_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .is('accepted_at', null)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  redirect(`/events/${eventId}`)
}

export async function getCollaborators(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, profiles(*)')
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  return data || []
}
