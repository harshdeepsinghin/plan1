'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { preferencesSchema } from '@/lib/validations/preferences'

export interface UpdatePreferencesState {
  ok?: boolean
  savedAt?: number
}

export async function updatePreferences(
  _previousState: UpdatePreferencesState | null,
  formData: FormData
): Promise<UpdatePreferencesState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const validated = preferencesSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('profiles')
    .update({
      currency: validated.currency,
      timezone: validated.timezone,
      date_format: validated.date_format,
      default_event_type: validated.default_event_type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Currency and date preferences affect every page, so refresh the whole
  // authenticated layout rather than a single route.
  revalidatePath('/profile')
  revalidatePath('/', 'layout')

  // The client calls router.refresh() after this resolves, which starts a new
  // request and guarantees the preference controls read the saved values.
  return { ok: true, savedAt: Date.now() }
}
