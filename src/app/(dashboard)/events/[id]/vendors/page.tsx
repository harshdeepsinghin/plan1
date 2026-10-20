import { createClient } from "@/lib/supabase/server"
import { VendorsClient } from "./vendors-client"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendorsPageWrapper({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) redirect("/dashboard")

  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .eq('event_id', id)
    .order('sort_order')

  return <VendorsClient params={params} initialData={{ event, vendors: vendors || [] }} />
}
