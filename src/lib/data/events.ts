import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Cached per request so the event layout, generateMetadata, and the active
 * page share one event query.
 */
export const getEvent = cache(async (eventId: string) => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error || !data) return null
  return data
})
