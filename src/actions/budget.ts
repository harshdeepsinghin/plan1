'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { budgetCategorySchema, budgetItemSchema } from '@/lib/validations/event'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

/** Keep budget_categories.spent and events.budget_spent in sync with line items. */
async function recalcBudget(eventId: string) {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('event_id', eventId)

  if (!categories?.length) {
    await supabase.from('events').update({ budget_spent: 0 }).eq('id', eventId)
    return
  }

  let eventTotal = 0
  for (const category of categories) {
    const { data: items } = await supabase
      .from('budget_items')
      .select('actual_cost, estimated_cost, status')
      .eq('category_id', category.id)

    const spent = (items || [])
      .filter((item) => item.status !== 'cancelled')
      .reduce((sum, item) => sum + Number(item.actual_cost ?? 0), 0)

    eventTotal += spent
    await supabase.from('budget_categories').update({ spent }).eq('id', category.id)
  }

  await supabase.from('events').update({ budget_spent: eventTotal }).eq('id', eventId)
}

export async function createBudgetCategory(eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = budgetCategorySchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_categories')
    .insert({ ...validated, event_id: eventId })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateBudgetCategory(
  categoryId: string,
  eventId: string,
  formData: FormData
) {
  const { supabase } = await requireUser()

  const validated = budgetCategorySchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_categories')
    .update(validated)
    .eq('id', categoryId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteBudgetCategory(categoryId: string, eventId: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', categoryId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  await recalcBudget(eventId)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function createBudgetItem(categoryId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = budgetItemSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_items')
    .insert({ ...validated, category_id: categoryId })

  if (error) throw new Error(error.message)

  await recalcBudget(eventId)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function updateBudgetItem(itemId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireUser()

  const validated = budgetItemSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_items')
    .update(validated)
    .eq('id', itemId)

  if (error) throw new Error(error.message)

  await recalcBudget(eventId)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function deleteBudgetItem(itemId: string, eventId: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('budget_items').delete().eq('id', itemId)

  if (error) throw new Error(error.message)

  await recalcBudget(eventId)
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function reorderBudgetCategories(
  eventId: string,
  categories: { id: string; sort_order: number }[]
) {
  const { supabase } = await requireUser()

  await Promise.all(
    categories.map((category) =>
      supabase
        .from('budget_categories')
        .update({ sort_order: category.sort_order })
        .eq('id', category.id)
        .eq('event_id', eventId)
    )
  )

  revalidatePath(`/events/${eventId}/budget`)
}
