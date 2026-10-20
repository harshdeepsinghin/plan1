import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/actions/event"
import { VendorsClient } from "./vendors-client"

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendorsPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  const supabase = await createClient()
  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false })

  return <VendorsClient eventId={id} initialVendors={vendors || []} />
}
