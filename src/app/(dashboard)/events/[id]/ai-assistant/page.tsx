import { createClient } from "@/lib/supabase/server"
import { AIAssistantClient } from "./ai-assistant-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}

export default async function AIAssistantPageWrapper({ params, searchParams }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const { data: aiIdeas } = await supabase
    .from('ai_ideas')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  return <AIAssistantClient params={params} initialData={{ event, aiIdeas: aiIdeas || [] }} searchParams={searchParams} />
}
