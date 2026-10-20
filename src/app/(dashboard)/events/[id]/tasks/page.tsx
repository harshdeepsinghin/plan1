import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/lib/data/events"
import { TasksClient } from "./tasks-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TasksPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const [{ data: tasks }, { data: owner }, { data: collaborators }] = await Promise.all([
    supabase.from("tasks").select("*").eq("event_id", id).order("sort_order", { ascending: true }),
    supabase.from("profiles").select("id, full_name, email").eq("id", event.user_id).maybeSingle(),
    supabase
      .from("event_collaborators")
      .select("user_id, profiles(id, full_name, email)")
      .eq("event_id", id),
  ])

  const members = [
    owner
      ? { id: owner.id, name: owner.full_name || owner.email || "Event owner" }
      : { id: event.user_id, name: "Event owner" },
    ...(collaborators || []).map((collaborator: any) => ({
      id: collaborator.user_id,
      name:
        collaborator.profiles?.full_name ||
        collaborator.profiles?.email ||
        "Collaborator",
    })),
  ]

  const uniqueMembers = Array.from(new Map(members.map((member) => [member.id, member])).values())

  return <TasksClient eventId={id} initialTasks={tasks || []} members={uniqueMembers} />
}
