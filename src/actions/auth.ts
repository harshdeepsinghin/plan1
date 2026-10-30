'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/authorization'
import { createClient } from '@/lib/supabase/server'
import { profileUpdateSchema } from '@/lib/validations/profile'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser()

  const raw = {
    full_name: formData.get('full_name') ?? '',
    avatar_url: formData.get('avatar_url') ?? '',
  }
  const validated = profileUpdateSchema.parse(raw)

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: validated.full_name || null,
      avatar_url: validated.avatar_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
