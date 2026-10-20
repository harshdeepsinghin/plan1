'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createEventSchema, updateEventSchema } from '@/lib/validations/event'
import { generateJSON } from '@/lib/gemini/client'
import { buildThemePrompt, buildTimelinePrompt, buildBudgetBreakdownPrompt, buildVendorSuggestionsPrompt, buildActivityIdeasPrompt, buildChecklistPrompt } from '@/lib/gemini/prompts'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  const rawData = {
    title: formData.get('title'),
    event_type: formData.get('event_type'),
    event_date: formData.get('event_date'),
    venue: formData.get('venue') || null,
    guest_count: formData.get('guest_count') || 0,
    budget_total: formData.get('budget_total') || 0,
  }

  const validated = createEventSchema.parse(rawData)

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      ...validated,
      user_id: user.id,
      guest_count: validated.guest_count,
      budget_total: validated.budget_total,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Generate AI-powered initial data in background
  generateInitialAIData(event.id, validated)

  revalidatePath('/dashboard')
  redirect(`/events/${event.id}`)
}

async function generateInitialAIData(eventId: string, eventData: any) {
  const supabase = await createClient()
  const context = {
    event_type: eventData.event_type,
    title: eventData.title,
    event_date: eventData.event_date,
    venue: eventData.venue,
    guest_count: eventData.guest_count,
    budget_total: eventData.budget_total,
    budget_spent: 0,
  }

  try {
    // Generate theme
    const theme = await generateJSON(buildThemePrompt(context))
    await supabase.from('events').update({ ai_generated_theme: theme }).eq('id', eventId)
    await supabase.from('ai_ideas').insert({
      event_id: eventId,
      idea_type: 'theme',
      content: theme,
      prompt_used: 'theme_generation',
    })

    // Generate timeline
    const timeline = await generateJSON(buildTimelinePrompt(context))
    if (timeline.milestones?.length) {
      await supabase.from('milestones').insert(
        timeline.milestones.map((m: any, i: number) => ({
          ...m,
          event_id: eventId,
          sort_order: i,
        }))
      )
    }

    // Generate budget categories
    const budget = await generateJSON(buildBudgetBreakdownPrompt(context))
    if (budget.categories?.length) {
      const categories = await supabase.from('budget_categories').insert(
        budget.categories.map((c: any, i: number) => ({
          event_id: eventId,
          name: c.name,
          allocated: c.amount || Math.round(eventData.budget_total * (c.percentage / 100)),
          sort_order: i,
        }))
      ).select()
      
      // Store budget breakdown as AI idea
      await supabase.from('ai_ideas').insert({
        event_id: eventId,
        idea_type: 'budget_breakdown',
        content: budget,
        prompt_used: 'budget_breakdown',
      })
    }

    // Generate vendor suggestions
    const vendors = await generateJSON(buildVendorSuggestionsPrompt(context))
    await supabase.from('ai_ideas').insert({
      event_id: eventId,
      idea_type: 'vendor_suggestions',
      content: vendors,
      prompt_used: 'vendor_suggestions',
    })

    // Generate activities
    const activities = await generateJSON(buildActivityIdeasPrompt(context))
    await supabase.from('ai_ideas').insert({
      event_id: eventId,
      idea_type: 'activities',
      content: activities,
      prompt_used: 'activity_ideas',
    })

    // Generate checklist
    const checklist = await generateJSON(buildChecklistPrompt(context))
    await supabase.from('ai_ideas').insert({
      event_id: eventId,
      idea_type: 'checklist',
      content: checklist,
      prompt_used: 'checklist',
    })

  } catch (error) {
    console.error('AI generation error:', error)
    // Fail silently - user can regenerate later
  }
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = updateEventSchema.parse(rawData)

  const { error } = await supabase
    .from('events')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
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

export async function getEvents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .or(`user_id.eq.${user.id},id.in.(select event_id from event_collaborators where user_id = '${user.id}' and accepted_at is not null)`)
    .single()

  if (error) return null
  return data
}
