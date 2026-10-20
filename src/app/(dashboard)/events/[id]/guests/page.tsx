import { createClient } from "@/lib/supabase/server"
import { GuestsClient } from "./guests-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function GuestsPageWrapper({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const { data: guests } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  return <GuestsClient params={params} initialData={{ event, guests: guests || [] }} />
}
