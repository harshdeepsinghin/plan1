'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireEventEdit } from '@/lib/authorization'
import { budgetCategorySchema, budgetItemSchema } from '@/lib/validations/event'

async function refreshBudget(supabase: SupabaseClient, eventId: string) {
  const { error } = await supabase.rpc('refresh_event_budget_spent', {
    p_event_id: eventId,
  })

  if (error) throw new Error(error.message)
}

async function assertCategoryInEvent(
  supabase: SupabaseClient,
  categoryId: string,
  eventId: string
) {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Budget category not found')
}

async function assertItemInEvent(supabase: SupabaseClient, itemId: string, eventId: string) {
  const { data, error } = await supabase
    .from('budget_items')
    .select('id, budget_categories!inner(event_id)')
    .eq('id', itemId)
    .eq('budget_categories.event_id', eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Budget item not found')
}

function revalidateBudget(eventId: string) {
  revalidatePath(`/events/${eventId}/budget`)
  revalidatePath(`/events/${eventId}/overview`)
}

export async function createBudgetCategory(eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)
  const validated = budgetCategorySchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_categories')
    .insert({ ...validated, event_id: eventId })

  if (error) throw new Error(error.message)
  revalidateBudget(eventId)
}

export async function updateBudgetCategory(
  categoryId: string,
  eventId: string,
  formData: FormData
) {
  const { supabase } = await requireEventEdit(eventId)
  const validated = budgetCategorySchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_categories')
    .update(validated)
    .eq('id', categoryId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)
  revalidateBudget(eventId)
}

export async function deleteBudgetCategory(categoryId: string, eventId: string) {
  const { supabase } = await requireEventEdit(eventId)

  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', categoryId)
    .eq('event_id', eventId)

  if (error) throw new Error(error.message)

  await refreshBudget(supabase, eventId)
  revalidateBudget(eventId)
}

export async function createBudgetItem(categoryId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)
  await assertCategoryInEvent(supabase, categoryId, eventId)

  const validated = budgetItemSchema.parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase
    .from('budget_items')
    .insert({ ...validated, category_id: categoryId })

  if (error) throw new Error(error.message)

  await refreshBudget(supabase, eventId)
  revalidateBudget(eventId)
}

export async function updateBudgetItem(itemId: string, eventId: string, formData: FormData) {
  const { supabase } = await requireEventEdit(eventId)
  await assertItemInEvent(supabase, itemId, eventId)

  const validated = budgetItemSchema.partial().parse(Object.fromEntries(formData.entries()))

  const { error } = await supabase.from('budget_items').update(validated).eq('id', itemId)

  if (error) throw new Error(error.message)

  await refreshBudget(supabase, eventId)
  revalidateBudget(eventId)
}

export async function deleteBudgetItem(itemId: string, eventId: string) {
  const { supabase } = await requireEventEdit(eventId)
  await assertItemInEvent(supabase, itemId, eventId)

  const { error } = await supabase.from('budget_items').delete().eq('id', itemId)

  if (error) throw new Error(error.message)

  await refreshBudget(supabase, eventId)
  revalidateBudget(eventId)
}

export async function reorderBudgetCategories(
  eventId: string,
  categories: { id: string; sort_order: number }[]
) {
  const { supabase } = await requireEventEdit(eventId)

  const results = await Promise.all(
    categories.map((category) =>
      supabase
        .from('budget_categories')
        .update({ sort_order: category.sort_order })
        .eq('id', category.id)
        .eq('event_id', eventId)
    )
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(failed.error.message)

  revalidatePath(`/events/${eventId}/budget`)
}
