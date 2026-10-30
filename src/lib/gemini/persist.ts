import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BudgetBreakdownIdea,
  BudgetCategoryIdea,
  TimelineIdea,
  TimelineMilestoneIdea,
  ThemeIdea,
} from '@/lib/gemini/schemas'

type Db = SupabaseClient

export interface MilestoneRow {
  event_id: string
  title: string
  description: string | null
  due_date: string
  category: TimelineMilestoneIdea['category']
  priority: number
  sort_order: number
}

export interface BudgetCategoryRow {
  event_id: string
  name: string
  allocated: number
  sort_order: number
}

export function toMilestoneRows(
  eventId: string,
  milestones: TimelineMilestoneIdea[],
  fallbackDate: string
): MilestoneRow[] {
  return milestones.slice(0, 20).map((milestone, index) => ({
    event_id: eventId,
    title: milestone.title.slice(0, 100),
    description: milestone.description ? milestone.description.slice(0, 500) : null,
    due_date: milestone.due_date || fallbackDate,
    category: milestone.category,
    priority: milestone.priority,
    sort_order: index,
  }))
}

export function toBudgetCategoryRows(
  eventId: string,
  categories: BudgetCategoryIdea[],
  budgetTotal: number
): BudgetCategoryRow[] {
  return categories.slice(0, 16).map((category, index) => {
    const amount = Number(category.amount)
    const percentage = Number(category.percentage)
    const allocated = Number.isFinite(amount)
      ? amount
      : Math.round((budgetTotal * (Number.isFinite(percentage) ? percentage : 10)) / 100)

    return {
      event_id: eventId,
      name: category.name.slice(0, 50),
      allocated: Math.max(0, allocated),
      sort_order: index,
    }
  })
}

export async function persistIdea(
  supabase: Db,
  eventId: string,
  ideaType: string,
  content: unknown,
  promptUsed: string
): Promise<void> {
  const { error } = await supabase.from('ai_ideas').insert({
    event_id: eventId,
    idea_type: ideaType,
    content,
    prompt_used: promptUsed,
  })

  if (error) throw new Error(error.message)
}

export async function persistTheme(
  supabase: Db,
  eventId: string,
  theme: ThemeIdea
): Promise<void> {
  const { error } = await supabase.rpc('set_event_theme', {
    p_event_id: eventId,
    p_theme: theme,
  })

  if (error) throw new Error(error.message)

  await persistIdea(supabase, eventId, 'theme', theme, 'theme_generation')
}

export async function persistTimeline(
  supabase: Db,
  eventId: string,
  timeline: TimelineIdea,
  fallbackDate: string,
  options: { insertMilestones?: boolean } = {}
): Promise<void> {
  const insertMilestones = options.insertMilestones ?? true

  if (insertMilestones && timeline.milestones.length > 0) {
    const { error } = await supabase
      .from('milestones')
      .insert(toMilestoneRows(eventId, timeline.milestones, fallbackDate))

    if (error) throw new Error(error.message)
  }

  await persistIdea(supabase, eventId, 'timeline', timeline, 'timeline_generation')
}

export async function persistBudget(
  supabase: Db,
  eventId: string,
  budget: BudgetBreakdownIdea,
  budgetTotal: number,
  options: { insertCategories?: boolean } = {}
): Promise<void> {
  const insertCategories = options.insertCategories ?? true

  if (insertCategories && budget.categories.length > 0) {
    const { error } = await supabase
      .from('budget_categories')
      .insert(toBudgetCategoryRows(eventId, budget.categories, budgetTotal))

    if (error) throw new Error(error.message)
  }

  await persistIdea(supabase, eventId, 'budget_breakdown', budget, 'budget_breakdown')
}
