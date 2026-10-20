import { createClient } from "@/lib/supabase/server"
import { SettingsClient } from "./settings-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function SettingsPageWrapper({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const { data: collaborators } = await supabase
    .from('event_collaborators')
    .select('*, profiles(*)')
    .eq('event_id', id)

  return <SettingsClient params={params} initialData={{ event, collaborators: collaborators || [] }} />
}
