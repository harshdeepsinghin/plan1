import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { getEvent } from "@/lib/data/events"
import { SettingsClient } from "./settings-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  const supabase = await createClient()

  if (!user) redirect("/auth/login")

  const event = await getEvent(id)
  if (!event) notFound()

  const [collaboratorsResult, categories, guests, milestones, vendors, tasks] = await Promise.all([
    supabase
      .from("event_collaborators")
      .select("*, profiles(full_name, email, avatar_url)")
      .eq("event_id", id),
    supabase.from("budget_categories").select("*, budget_items(*)").eq("event_id", id),
    supabase.from("guests").select("*").eq("event_id", id),
    supabase.from("milestones").select("*").eq("event_id", id),
    supabase.from("vendors").select("*").eq("event_id", id),
    supabase.from("tasks").select("*").eq("event_id", id),
  ])

  return (
    <SettingsClient
      event={event}
      collaborators={collaboratorsResult.data || []}
      exportData={{
        categories: categories.data || [],
        guests: guests.data || [],
        milestones: milestones.data || [],
        vendors: vendors.data || [],
        tasks: tasks.data || [],
      }}
      isOwner={event.user_id === user.id}
    />
  )
}
