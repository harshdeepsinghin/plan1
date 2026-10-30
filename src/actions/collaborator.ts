'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  AuthorizationError,
  requireEventAccess,
  requireEventOwner,
  requireUser,
} from '@/lib/authorization'
import { collaboratorSchema } from '@/lib/validations/event'

export async function inviteCollaborator(eventId: string, formData: FormData) {
  const { supabase, user } = await requireEventOwner(eventId)
  const validated = collaboratorSchema.parse(Object.fromEntries(formData.entries()))

  if (validated.email === (user.email || '').toLowerCase()) {
    throw new Error('You cannot invite yourself')
  }

  // The profiles table is no longer a directory. This SECURITY DEFINER RPC
  // returns at most one exact email match and nothing else.
  const { data: matches, error: lookupError } = await supabase.rpc('find_profile_by_email', {
    p_email: validated.email,
  })

  if (lookupError) throw new Error(lookupError.message)

  const profile = Array.isArray(matches) ? matches[0] : null
  if (!profile) {
    throw new Error('No planner found with that email. Ask them to sign up first.')
  }

  const { data: existing } = await supabase
    .from('event_collaborators')
    .select('id, accepted_at')
    .eq('event_id', eventId)
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing) {
    throw new Error(
      existing.accepted_at
        ? 'That person is already a collaborator'
        : 'That person already has a pending invitation'
    )
  }

  const { error } = await supabase.from('event_collaborators').insert({
    event_id: eventId,
    user_id: profile.id,
    role: validated.role,
    // Invitees must accept before gaining access. Until then, RLS only lets
    // them see their own invitation row.
    accepted_at: null,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}/settings`)
}

export async function updateCollaboratorRole(
  eventId: string,
  collaboratorId: string,
  role: string
) {
  const { supabase } = await requireEventOwner(eventId)

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
  const { supabase } = await requireEventOwner(eventId)

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

  const { data, error } = await supabase
    .from('event_collaborators')
    .update({ accepted_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .is('accepted_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new AuthorizationError('That invitation is no longer available')

  revalidatePath('/dashboard')
  redirect(`/events/${eventId}/overview`)
}

export async function declineInvitation(eventId: string) {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('event_collaborators')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .is('accepted_at', null)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function getCollaborators(eventId: string) {
  const { supabase } = await requireEventAccess(eventId)

  const { data, error } = await supabase
    .from('event_collaborators')
    .select('*, profiles(full_name, email, avatar_url)')
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  return data || []
}
