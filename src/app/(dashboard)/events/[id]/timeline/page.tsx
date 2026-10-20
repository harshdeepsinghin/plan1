import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/lib/data/events"
import { TimelineClient } from "./timeline-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TimelinePage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("event_id", id)
    .order("due_date", { ascending: true })

  return (
    <TimelineClient
      eventId={id}
      eventDate={event.event_date}
      initialMilestones={milestones || []}
    />
  )
}
