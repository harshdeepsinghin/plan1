import { createClient } from "@/lib/supabase/server"
import { TimelineClient } from "./timeline-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TimelinePageWrapper({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('event_id', id)
    .order('sort_order')

  return <TimelineClient params={params} initialData={{ event, milestones: milestones || [] }} />
}
