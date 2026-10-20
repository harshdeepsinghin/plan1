'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { budgetCategorySchema, budgetItemSchema } from '@/lib/validations/event'

export async function createBudgetCategory(eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = budgetCategorySchema.parse(rawData)

  const { error } = await supabase
    .from('budget_categories')
    .insert({ ...validated, event_id: eventId })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function updateBudgetCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = budgetCategorySchema.partial().parse(rawData)

  const { error } = await supabase
    .from('budget_categories')
    .update(validated)
    .eq('id', categoryId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function deleteBudgetCategory(categoryId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function createBudgetItem(categoryId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = budgetItemSchema.parse(rawData)

  const { error } = await supabase
    .from('budget_items')
    .insert({ ...validated, category_id: categoryId })

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function updateBudgetItem(itemId: string, eventId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const rawData = Object.fromEntries(formData.entries())
  const validated = budgetItemSchema.partial().parse(rawData)

  const { error } = await supabase
    .from('budget_items')
    .update(validated)
    .eq('id', itemId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function deleteBudgetItem(itemId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('budget_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}/budget`)
}

export async function reorderBudgetCategories(eventId: string, categories: { id: string; sort_order: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  for (const cat of categories) {
    await supabase
      .from('budget_categories')
      .update({ sort_order: cat.sort_order })
      .eq('id', cat.id)
  }
  
  revalidatePath(`/events/${eventId}/budget`)
}
