import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/lib/data/events"
import { BudgetClient } from "./budget-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BudgetPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("budget_categories")
    .select("*, budget_items(*)")
    .eq("event_id", id)
    .order("sort_order", { ascending: true })

  return (
    <BudgetClient
      eventId={id}
      initialCategories={categories || []}
      eventBudget={Number(event.budget_total) || 0}
    />
  )
}
