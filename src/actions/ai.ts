'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateJSON, generateText } from '@/lib/gemini/client'
import { 
  buildThemePrompt, 
  buildColorPalettePrompt, 
  buildVendorSuggestionsPrompt,
  buildTimelinePrompt,
  buildBudgetBreakdownPrompt,
  buildActivityIdeasPrompt,
  buildChecklistPrompt,
  buildSpeechPrompt,
  buildChatPrompt 
} from '@/lib/gemini/prompts'

interface EventContext {
  event_type: string
  title: string
  event_date: string
  venue?: string
  guest_count: number
  budget_total: number
  budget_spent: number
}

async function getEventContext(eventId: string): Promise<EventContext | null> {
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  
  if (!event) return null
  
  return {
    event_type: event.event_type,
    title: event.title,
    event_date: event.event_date,
    venue: event.venue,
    guest_count: event.guest_count,
    budget_total: event.budget_total,
    budget_spent: event.budget_spent,
  }
}

export async function generateTheme(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const theme = await generateJSON(buildThemePrompt(context))
  
  await supabase.from('events').update({ ai_generated_theme: theme }).eq('id', eventId)
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'theme',
    content: theme,
    prompt_used: 'theme_generation',
  })

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/ai-assistant`)
  return theme
}

export async function generateColorPalette(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const { data: event } = await supabase
    .from('events')
    .select('ai_generated_theme')
    .eq('id', eventId)
    .single()

  const palette = await generateJSON(buildColorPalettePrompt(context, event?.ai_generated_theme))
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'color_palette',
    content: palette,
    prompt_used: 'color_palette',
  })

  revalidatePath(`/events/${eventId}/ai-assistant`)
  return palette
}

export async function generateVendorSuggestions(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const suggestions = await generateJSON(buildVendorSuggestionsPrompt(context))
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'vendor_suggestions',
    content: suggestions,
    prompt_used: 'vendor_suggestions',
  })

  revalidatePath(`/events/${eventId}/ai-assistant`)
  revalidatePath(`/events/${eventId}/vendors`)
  return suggestions
}

export async function generateTimeline(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const timeline = await generateJSON(buildTimelinePrompt(context))
  
  if (timeline.milestones?.length) {
    await supabase.from('milestones').insert(
      timeline.milestones.map((m: any, i: number) => ({
        ...m,
        event_id: eventId,
        priority: m.priority || 2,
        sort_order: i,
      }))
    )
  }
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'timeline',
    content: timeline,
    prompt_used: 'timeline_generation',
  })

  revalidatePath(`/events/${eventId}/timeline`)
  revalidatePath(`/events/${eventId}/ai-assistant`)
  return timeline
}

export async function generateBudgetBreakdown(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const budget = await generateJSON(buildBudgetBreakdownPrompt(context))
  
  if (budget.categories?.length) {
    const categories = await supabase.from('budget_categories').insert(
      budget.categories.map((c: any, i: number) => ({
        event_id: eventId,
        name: c.name,
        allocated: c.amount || Math.round(context.budget_total * ((c.percentage || 10) / 100)),
        sort_order: i,
      }))
    ).select()
  }
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'budget_breakdown',
    content: budget,
    prompt_used: 'budget_breakdown',
  })

  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/ai-assistant`)
  return budget
}

export async function generateActivityIdeas(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const activities = await generateJSON(buildActivityIdeasPrompt(context))
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'activities',
    content: activities,
    prompt_used: 'activity_ideas',
  })

  revalidatePath(`/events/${eventId}/ai-assistant`)
  return activities
}

export async function generateChecklist(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const checklist = await generateJSON(buildChecklistPrompt(context))
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'checklist',
    content: checklist,
    prompt_used: 'checklist',
  })

  revalidatePath(`/events/${eventId}/ai-assistant`)
  return checklist
}

export async function generateSpeech(eventId: string, role: string, relationship: string, tone: string, keyMemories: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const speech = await generateJSON(buildSpeechPrompt(context, role, relationship, tone, keyMemories))
  
  await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: 'speech',
    content: speech,
    prompt_used: `speech_${role}`,
  })

  revalidatePath(`/events/${eventId}/ai-assistant`)
  return speech
}

export async function chatWithAI(eventId: string, message: string, history: Array<{role: string, content: string}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const context = await getEventContext(eventId)
  if (!context) throw new Error('Event not found')

  const response = await generateText(buildChatPrompt(context, message, history))
  
  return response
}

export async function getAIIdeas(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('ai_ideas')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
