import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { CollaboratorRole } from '@/types/database'

export class AuthorizationError extends Error {
  constructor(message = 'You do not have access to this event') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

type Db = SupabaseClient

export interface ActionUser {
  id: string
  email?: string
}

export interface ActionContext {
  supabase: Db
  user: ActionUser
}

/** Every server action starts here. RLS is the final gate, not the only one. */
export async function requireUser(): Promise<ActionContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthorizationError('Your session expired. Please sign in again.')
  }

  return { supabase, user }
}

/**
 * Resolve the caller's role on an event. Pending invitations deliberately do
 * not grant access until the invitee accepts.
 */
export async function getEventRole(
  eventId: string,
  userId: string
): Promise<CollaboratorRole | null> {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('user_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return null
  if (event.user_id === userId) return 'owner'

  const { data: collaborator } = await supabase
    .from('event_collaborators')
    .select('role, accepted_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  const role = collaborator?.role
  return role === 'editor' || role === 'viewer' ? role : null
}

export async function requireEventAccess(eventId: string): Promise<ActionContext & { role: CollaboratorRole }> {
  const context = await requireUser()
  const role = await getEventRole(eventId, context.user.id)

  if (!role) throw new AuthorizationError()

  return { ...context, role }
}

export async function requireEventEdit(eventId: string): Promise<ActionContext & { role: 'owner' | 'editor' }> {
  const context = await requireEventAccess(eventId)

  if (context.role !== 'owner' && context.role !== 'editor') {
    throw new AuthorizationError('Only owners and editors can change this event')
  }

  return { ...context, role: context.role }
}

export async function requireEventOwner(eventId: string): Promise<ActionContext> {
  const context = await requireUser()
  const role = await getEventRole(eventId, context.user.id)

  if (role !== 'owner') {
    throw new AuthorizationError('Only the event owner can do that')
  }

  return context
}
