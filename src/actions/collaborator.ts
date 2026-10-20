'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { collaboratorSchema } from '@/lib/validations/event'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

async function requireEventOwner(eventId: string, userId: string) {
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!event) throw new Error('Only the event owner can manage collaborators')
  return supabase
}

export async function inviteCollaborator(eventId: string, formData: FormData) {
  const { user } = await requireUser()
  const supabase = await requireEventOwner(eventId, user.id)

  const validated = collaboratorSchema.parse(Object.fromEntries(formData.entries()))

  if (validated.email.toLowerCase() === (user.email || '').toLowerCase()) {
    throw new Error('You cannot invite yourself')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', validated.email)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!profile) {
    throw new Error('No planner found with that email. Ask them to sign up first.')
  }

  const { data: existing } = await supabase
    .from('event_collaborators')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing) throw new Error('That person is already a collaborator')

  const { error } = await supabase.from('event_collaborators').insert({
    event_id: eventId,
    user_id: profile.id,
    role: validated.role,
    // Invitations are addressed to an existing planner account, so grant
    // access immediately instead of leaving them stuck in a pending state.
    accepted_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/settings`)
}

export async function updateCollaboratorRole(
  eventId: string,
  collaboratorId: string,
  role: string
) {
  const { user } = await requireUser()
  const supabase = await requireEventOwner(eventId, user.id)

  if (!['editor', 'viewer'].includes(role)) throw new Error('Invalid role')

  const { error } = await supabase
    .from('event_collaborators')
    .update({ role })
    .eq('id', collaboratorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function removeCollaborator(eventId: string, collaboratorId: string) {
  const { user } = await requireUser()
  const supabase = await requireEventOwner(eventId, user.id)

  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('id', collaboratorId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function acceptInvitation(eventId: string) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('event_collaborators')
    .update({ accepted_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .is('accepted_at', null)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect(`/events/${eventId}/overview`)
}

export async function getCollaborators(eventId: string) {
  const { supabase } = await requireUser()

  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, profiles(*)')
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  return data || []
}
