import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/lib/data/events"
import { AIAssistantClient } from "./ai-assistant-client"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}

export default async function AIAssistantPage({ params, searchParams }: Props) {
  const { id } = await params
  const { action } = await searchParams
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const { data: ideas } = await supabase
    .from("ai_ideas")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .limit(30)

  return (
    <AIAssistantClient
      eventId={id}
      event={event}
      initialIdeas={ideas || []}
      initialAction={action}
    />
  )
}
