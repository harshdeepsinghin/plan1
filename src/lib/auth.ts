import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

/**
 * Request-scoped auth helpers. The dashboard layout, page, and metadata all
 * call these; React cache() ensures Supabase Auth and the profile query run
 * once per navigation instead of once per component.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  return (data as Profile | null) || null
})
