import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/lib/data/events"
import { GuestsClient } from "./guests-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GuestsPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const { data: guests } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false })

  return <GuestsClient eventId={id} initialGuests={guests || []} />
}
