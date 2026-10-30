'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireEventOwner, requireUser } from '@/lib/authorization'
import { getCurrentProfile } from '@/lib/auth'
import { generateJSON } from '@/lib/gemini/client'
import { persistBudget, persistTheme, persistTimeline } from '@/lib/gemini/persist'
import {
  budgetBreakdownIdeaSchema,
  themeIdeaSchema,
  timelineIdeaSchema,
} from '@/lib/gemini/schemas'
import {
  buildBudgetBreakdownPrompt,
  buildThemePrompt,
  buildTimelinePrompt,
} from '@/lib/gemini/prompts'
import { resolvePreferences } from '@/lib/preferences'
import { createEventSchema, updateEventSchema } from '@/lib/validations/event'
import type { SupabaseClient } from '@supabase/supabase-js'

interface InitialEventData {
  title: string
  event_type: string
  event_date: string
  venue?: string | null
  guest_count: number
  budget_total: number
  notes?: string | null
  currency: string
}

export async function createEvent(formData: FormData) {
  const { supabase, user } = await requireUser()
  const profile = await getCurrentProfile()
  const preferences = resolvePreferences(profile)

  const validated = createEventSchema.parse(Object.fromEntries(formData.entries()))

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: validated.title,
      event_type: validated.event_type,
      event_date: validated.event_date,
      venue: validated.venue ?? null,
      guest_count: validated.guest_count,
      budget_total: validated.budget_total,
      notes: validated.notes ?? null,
      user_id: user.id,
    })
    .select('id')
    .single()

  if (error || !event) {
    throw new Error(error?.message || 'Could not create the event')
  }

  // Generate the first draft. Failures are non-fatal so a temporary Gemini
  // outage never blocks event creation.
  await generateInitialAIData(supabase, event.id, {
    ...validated,
    venue: validated.venue ?? undefined,
    currency: preferences.currency,
  })

  revalidatePath('/dashboard')
  redirect(`/events/${event.id}/overview`)
}

async function generateInitialAIData(
  supabase: SupabaseClient,
  eventId: string,
  eventData: InitialEventData
) {
  const context = {
    event_type: eventData.event_type,
    title: eventData.title,
    event_date: eventData.event_date,
    venue: eventData.venue || undefined,
    guest_count: eventData.guest_count,
    budget_total: eventData.budget_total,
    budget_spent: 0,
    currency: eventData.currency,
    notes: eventData.notes || undefined,
  }

  const results = await Promise.allSettled([
    generateJSON(buildThemePrompt(context), themeIdeaSchema).then((theme) =>
      persistTheme(supabase, eventId, theme)
    ),
    generateJSON(buildTimelinePrompt(context), timelineIdeaSchema).then((timeline) =>
      persistTimeline(supabase, eventId, timeline, eventData.event_date)
    ),
    generateJSON(buildBudgetBreakdownPrompt(context), budgetBreakdownIdeaSchema).then((budget) =>
      persistBudget(supabase, eventId, budget, eventData.budget_total)
    ),
  ])

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Initial draft generation failed:', result.reason)
    }
  }
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase } = await requireEventOwner(eventId)

  const validated = updateEventSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('events')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', eventId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/overview`)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function deleteEvent(eventId: string) {
  const { supabase } = await requireEventOwner(eventId)

  const { error } = await supabase.from('events').delete().eq('id', eventId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
