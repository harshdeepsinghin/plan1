'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth'
import { resolvePreferences } from '@/lib/preferences'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createEventSchema, updateEventSchema } from '@/lib/validations/event'
import { generateJSON } from '@/lib/gemini/client'
import {
  buildThemePrompt,
  buildTimelinePrompt,
  buildBudgetBreakdownPrompt,
} from '@/lib/gemini/prompts'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const profile = await getCurrentProfile()
  const preferences = resolvePreferences(profile)

  const rawData = Object.fromEntries(formData.entries())
  const validated = createEventSchema.parse(rawData)

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: validated.title,
      event_type: validated.event_type,
      event_date: validated.event_date,
      venue: validated.venue ?? null,
      guest_count: validated.guest_count,
      budget_total: validated.budget_total,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Generate the first draft. Failures are non-fatal so a temporary Gemini
  // outage never blocks event creation.
  await generateInitialAIData(event.id, {
    ...validated,
    venue: validated.venue ?? undefined,
    currency: preferences.currency,
  })

  revalidatePath('/dashboard')
  redirect(`/events/${event.id}/overview`)
}

interface InitialEventData {
  title: string
  event_type: string
  event_date: string
  venue?: string | null
  guest_count: number
  budget_total: number
  currency: string
}

async function generateInitialAIData(eventId: string, eventData: InitialEventData) {
  const supabase = await createClient()
  const context = {
    event_type: eventData.event_type,
    title: eventData.title,
    event_date: eventData.event_date,
    venue: eventData.venue || undefined,
    guest_count: eventData.guest_count,
    budget_total: eventData.budget_total,
    budget_spent: 0,
    currency: eventData.currency,
  }

  try {
    const [themeResult, timelineResult, budgetResult] = await Promise.allSettled([
      generateJSON<any>(buildThemePrompt(context)),
      generateJSON<any>(buildTimelinePrompt(context)),
      generateJSON<any>(buildBudgetBreakdownPrompt(context)),
    ])

    if (themeResult.status === 'fulfilled' && themeResult.value) {
      const theme = themeResult.value
      await supabase.from('events').update({ ai_generated_theme: theme }).eq('id', eventId)
      await supabase.from('ai_ideas').insert({
        event_id: eventId,
        idea_type: 'theme',
        content: theme,
        prompt_used: 'theme_generation',
      })
    }

    if (timelineResult.status === 'fulfilled' && timelineResult.value?.milestones?.length) {
      const timeline = timelineResult.value
      await supabase.from('milestones').insert(
        timeline.milestones.slice(0, 20).map((milestone: any, index: number) => ({
          event_id: eventId,
          title: String(milestone.title || `Milestone ${index + 1}`).slice(0, 100),
          description: milestone.description ? String(milestone.description).slice(0, 500) : null,
          due_date: milestone.due_date || eventData.event_date,
          category: ['booking', 'payments', 'design', 'logistics', 'other'].includes(milestone.category)
            ? milestone.category
            : 'other',
          priority: [1, 2, 3].includes(Number(milestone.priority)) ? Number(milestone.priority) : 2,
          sort_order: index,
        }))
      )
      await supabase.from('ai_ideas').insert({
        event_id: eventId,
        idea_type: 'timeline',
        content: timeline,
        prompt_used: 'timeline_generation',
      })
    }

    if (budgetResult.status === 'fulfilled' && budgetResult.value?.categories?.length) {
      const budget = budgetResult.value
      await supabase.from('budget_categories').insert(
        budget.categories.slice(0, 16).map((category: any, index: number) => ({
          event_id: eventId,
          name: String(category.name || `Category ${index + 1}`).slice(0, 50),
          allocated:
            Number(category.amount) ||
            Math.round((eventData.budget_total * (Number(category.percentage) || 10)) / 100),
          sort_order: index,
        }))
      )
      await supabase.from('ai_ideas').insert({
        event_id: eventId,
        idea_type: 'budget_breakdown',
        content: budget,
        prompt_used: 'budget_breakdown',
      })
    }
  } catch (error) {
    console.error('Initial draft generation failed:', error)
  }
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = updateEventSchema.parse(rawData)

  const { error } = await supabase
    .from('events')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/overview`)
  revalidatePath(`/events/${eventId}/settings`)
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
