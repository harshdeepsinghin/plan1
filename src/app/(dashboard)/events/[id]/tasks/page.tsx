import { createClient } from "@/lib/supabase/server"
import { TasksClient } from "./tasks-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TasksPageWrapper({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const [{ data: tasks }, { data: milestones }, { data: collaborators }] = await Promise.all([
    supabase.from('tasks').select('*').eq('event_id', id).order('sort_order'),
    supabase.from('milestones').select('*').eq('event_id', id).order('sort_order'),
    supabase.from('event_collaborators').select('*, profiles(*)').eq('event_id', id),
  ])

  return <TasksClient params={params} initialData={{ event, tasks: tasks || [], milestones: milestones || [], collaborators: collaborators || [] }} />
}
