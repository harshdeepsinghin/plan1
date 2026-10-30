import { z } from 'zod'

/**
 * Gemini is an untrusted external service. Every JSON response is parsed with
 * these schemas before it reaches the database or the UI, so a prompt-injected
 * or malformed response cannot smuggle unexpected fields, huge strings, or
 * script payloads into the app.
 */

const shortText = (max = 200) => z.string().trim().max(max)
const requiredText = (max = 200) => z.string().trim().min(1).max(max)
const hexCatch = z
  .string()
  .trim()
  .max(20)
  .refine((value) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value), {
    message: 'Expected a hex colour',
  })
  .catch('#eeeeee')

const keyword = z.string().trim().min(1).max(40)

export const colorEntrySchema = z.object({
  role: shortText(40).optional(),
  name: shortText(60).optional(),
  hex: hexCatch.optional(),
  usage: shortText(300).optional(),
})

export const themeIdeaSchema = z.object({
  theme_name: requiredText(120),
  description: shortText(1200).optional(),
  color_palette: z
    .union([
      z.record(z.string(), z.string().trim().max(20)),
      z.array(colorEntrySchema).max(10),
    ])
    .optional(),
  mood_board_keywords: z.array(keyword).max(12).optional(),
  mood_keywords: z.array(keyword).max(12).optional(),
  decor_style: shortText(1200).optional(),
})

export const paletteIdeaSchema = z.object({
  palette: z.union([z.array(colorEntrySchema).max(10), z.record(z.string(), z.string())]).optional(),
  colors: z.array(colorEntrySchema).max(10).optional(),
})

export const timelineMilestoneSchema = z.object({
  title: requiredText(120),
  description: shortText(600).nullable().optional(),
  due_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
    .catch(null),
  category: z.enum(['booking', 'payments', 'design', 'logistics', 'other']).catch('other'),
  priority: z.coerce.number().int().min(1).max(3).catch(2),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
})

export const timelineIdeaSchema = z.object({
  milestones: z.array(timelineMilestoneSchema).max(30),
})

export const budgetCategoryIdeaSchema = z.object({
  name: requiredText(60),
  percentage: z.coerce.number().min(0).max(100).nullable().optional().catch(null),
  amount: z.coerce.number().min(0).max(1_000_000_000).nullable().optional().catch(null),
  description: shortText(500).optional(),
  items: z.array(shortText(120)).max(20).optional(),
  tips: z.array(shortText(240)).max(10).optional(),
})

export const budgetBreakdownIdeaSchema = z.object({
  categories: z.array(budgetCategoryIdeaSchema).max(20),
  total_allocated: z.coerce.number().min(0).optional().catch(undefined),
  contingency_percentage: z.coerce.number().min(0).max(100).optional().catch(undefined),
})

export const vendorSuggestionSchema = z.object({
  category: requiredText(80),
  priority: shortText(20).optional(),
  budget_percentage: z.coerce.number().min(0).max(100).nullable().optional().catch(null),
  search_queries: z.array(shortText(120)).max(8).optional(),
  questions_to_ask: z.array(shortText(240)).max(12).optional(),
  red_flags: z.array(shortText(240)).max(12).optional(),
  tips: z.array(shortText(240)).max(12).optional(),
})

export const vendorSuggestionsIdeaSchema = z.object({
  vendors: z.array(vendorSuggestionSchema).max(20),
})

export const activityIdeaSchema = z.object({
  title: requiredText(120),
  description: shortText(600).optional(),
  category: shortText(60).optional(),
  duration_minutes: z.coerce.number().int().min(0).max(1440).optional().catch(undefined),
  materials_needed: z.array(shortText(120)).max(20).optional(),
  setup_complexity: shortText(20).optional(),
  guest_appeal: shortText(20).optional(),
  estimated_cost: z.coerce.number().min(0).optional().catch(undefined),
})

export const activityIdeasIdeaSchema = z.object({
  activities: z.array(activityIdeaSchema).max(20),
})

export const checklistItemSchema = z.object({
  task: requiredText(160),
  category: shortText(60).optional(),
  priority: z.coerce.number().int().min(1).max(3).catch(2),
})

export const checklistPhaseSchema = z.object({
  phase: requiredText(80),
  items: z.array(checklistItemSchema).max(40),
})

export const checklistIdeaSchema = z.object({
  checklist: z.array(checklistPhaseSchema).max(15),
})

export const speechDraftSchema = z.object({
  variation: shortText(40).optional(),
  title: shortText(120).optional(),
  estimated_duration_minutes: z.coerce.number().min(0).max(60).optional().catch(undefined),
  outline: z.array(shortText(120)).max(20).optional(),
  full_text: z.string().trim().max(20_000).optional(),
  content: z.string().trim().max(20_000).optional(),
})

export const speechIdeaSchema = z.object({
  drafts: z.array(speechDraftSchema).max(5).optional(),
  title: shortText(120).optional(),
  content: z.string().trim().max(20_000).optional(),
  speech: z.string().trim().max(20_000).optional(),
})

export type ColorEntry = z.infer<typeof colorEntrySchema>
export type ThemeIdea = z.infer<typeof themeIdeaSchema>
export type PaletteIdea = z.infer<typeof paletteIdeaSchema>
export type TimelineIdea = z.infer<typeof timelineIdeaSchema>
export type TimelineMilestoneIdea = z.infer<typeof timelineMilestoneSchema>
export type BudgetBreakdownIdea = z.infer<typeof budgetBreakdownIdeaSchema>
export type BudgetCategoryIdea = z.infer<typeof budgetCategoryIdeaSchema>
export type VendorSuggestionsIdea = z.infer<typeof vendorSuggestionsIdeaSchema>
export type ActivityIdeasIdea = z.infer<typeof activityIdeasIdeaSchema>
export type ChecklistIdea = z.infer<typeof checklistIdeaSchema>
export type SpeechIdea = z.infer<typeof speechIdeaSchema>

export type GeneratedIdea =
  | ThemeIdea
  | PaletteIdea
  | TimelineIdea
  | BudgetBreakdownIdea
  | VendorSuggestionsIdea
  | ActivityIdeasIdea
  | ChecklistIdea
  | SpeechIdea
