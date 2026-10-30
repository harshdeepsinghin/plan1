'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireEventAccess, requireEventEdit } from '@/lib/authorization'
import { generateJSON, generateText } from '@/lib/gemini/client'
import {
  persistBudget,
  persistIdea,
  persistTheme,
  persistTimeline,
} from '@/lib/gemini/persist'
import {
  activityIdeasIdeaSchema,
  budgetBreakdownIdeaSchema,
  checklistIdeaSchema,
  paletteIdeaSchema,
  speechIdeaSchema,
  themeIdeaSchema,
  timelineIdeaSchema,
  vendorSuggestionsIdeaSchema,
} from '@/lib/gemini/schemas'
import {
  buildActivityIdeasPrompt,
  buildBudgetBreakdownPrompt,
  buildChatPrompt,
  buildChecklistPrompt,
  buildColorPalettePrompt,
  buildSpeechPrompt,
  buildThemePrompt,
  buildTimelinePrompt,
  buildVendorSuggestionsPrompt,
} from '@/lib/gemini/prompts'
import { enforceAiRateLimit } from '@/lib/rate-limit'
import {
  aiEventIdSchema,
  chatInputSchema,
  speechInputSchema,
} from '@/lib/validations/ai'

interface EventContext {
  event_type: string
  title: string
  event_date: string
  venue?: string
  guest_count: number
  budget_total: number
  budget_spent: number
  currency: string
  notes?: string
}

async function loadEventContext(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventContext> {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error || !event) throw new Error('Event not found')

  const { data: owner } = await supabase
    .from('profiles')
    .select('currency')
    .eq('id', event.user_id)
    .maybeSingle()

  return {
    event_type: event.event_type,
    title: event.title,
    event_date: event.event_date,
    venue: event.venue || undefined,
    guest_count: event.guest_count,
    budget_total: Number(event.budget_total) || 0,
    budget_spent: Number(event.budget_spent) || 0,
    currency: owner?.currency || 'USD',
    notes: event.notes || undefined,
  }
}

async function prepare(eventId: string) {
  const parsedId = aiEventIdSchema.parse(eventId)
  const { supabase, user } = await requireEventEdit(parsedId)
  const context = await loadEventContext(supabase, parsedId)
  return { supabase, user, context, eventId: parsedId }
}

export async function generateTheme(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'theme')

  const theme = await generateJSON(buildThemePrompt(context), themeIdeaSchema)
  await persistTheme(supabase, id, theme)

  revalidatePath(`/events/${id}/overview`)
  revalidatePath(`/events/${id}/ai-assistant`)
  return theme
}

export async function generateColorPalette(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'color_palette')

  const { data: event } = await supabase
    .from('events')
    .select('ai_generated_theme')
    .eq('id', id)
    .maybeSingle()

  const palette = await generateJSON(
    buildColorPalettePrompt(context, event?.ai_generated_theme || undefined),
    paletteIdeaSchema
  )

  await persistIdea(supabase, id, 'color_palette', palette, 'color_palette')
  revalidatePath(`/events/${id}/ai-assistant`)
  return palette
}

export async function generateVendorSuggestions(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'vendor_suggestions')

  const suggestions = await generateJSON(
    buildVendorSuggestionsPrompt(context),
    vendorSuggestionsIdeaSchema
  )

  await persistIdea(supabase, id, 'vendor_suggestions', suggestions, 'vendor_suggestions')
  revalidatePath(`/events/${id}/ai-assistant`)
  revalidatePath(`/events/${id}/vendors`)
  return suggestions
}

export async function generateTimeline(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'timeline')

  const timeline = await generateJSON(buildTimelinePrompt(context), timelineIdeaSchema)

  const { count } = await supabase
    .from('milestones')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  await persistTimeline(supabase, id, timeline, context.event_date, {
    insertMilestones: !count,
  })

  revalidatePath(`/events/${id}/timeline`)
  revalidatePath(`/events/${id}/ai-assistant`)
  return timeline
}

export async function generateBudgetBreakdown(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'budget_breakdown')

  const budget = await generateJSON(
    buildBudgetBreakdownPrompt(context),
    budgetBreakdownIdeaSchema
  )

  const { count } = await supabase
    .from('budget_categories')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)

  await persistBudget(supabase, id, budget, context.budget_total, {
    insertCategories: !count,
  })

  revalidatePath(`/events/${id}/budget`)
  revalidatePath(`/events/${id}/ai-assistant`)
  return budget
}

export async function generateActivityIdeas(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'activity_ideas')

  const activities = await generateJSON(
    buildActivityIdeasPrompt(context),
    activityIdeasIdeaSchema
  )

  await persistIdea(supabase, id, 'activities', activities, 'activity_ideas')
  revalidatePath(`/events/${id}/ai-assistant`)
  return activities
}

export async function generateChecklist(eventId: string) {
  const { supabase, user, context, eventId: id } = await prepare(eventId)
  await enforceAiRateLimit(supabase, user.id, id, 'checklist')

  const checklist = await generateJSON(buildChecklistPrompt(context), checklistIdeaSchema)
  await persistIdea(supabase, id, 'checklist', checklist, 'checklist')
  revalidatePath(`/events/${id}/ai-assistant`)
  return checklist
}

export async function generateSpeech(
  eventId: string,
  role: string,
  relationship: string,
  tone: string,
  keyMemories: string
) {
  const input = speechInputSchema.parse({ eventId, role, relationship, tone, keyMemories })
  const { supabase, user, context } = await prepare(input.eventId)
  await enforceAiRateLimit(supabase, user.id, input.eventId, 'speech')

  const speech = await generateJSON(
    buildSpeechPrompt(context, input.role, input.relationship, input.tone, input.keyMemories),
    speechIdeaSchema
  )

  await persistIdea(
    supabase,
    input.eventId,
    'speech',
    speech,
    `speech_${input.role}`.slice(0, 100)
  )
  revalidatePath(`/events/${input.eventId}/ai-assistant`)
  return speech
}

export async function chatWithAI(
  eventId: string,
  message: string,
  history: Array<{ role: string; content: string }>
) {
  const input = chatInputSchema.parse({ eventId, message, history })
  const { supabase, user } = await requireEventAccess(input.eventId)
  const context = await loadEventContext(supabase, input.eventId)
  await enforceAiRateLimit(supabase, user.id, input.eventId, 'chat')

  return generateText(
    buildChatPrompt(context, input.message, input.history),
    2048
  )
}

export async function getAIIdeas(eventId: string) {
  const id = aiEventIdSchema.parse(eventId)
  const { supabase } = await requireEventAccess(id)

  const { data, error } = await supabase
    .from('ai_ideas')
    .select('id, idea_type, content, created_at')
    .eq('event_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data || []
}
