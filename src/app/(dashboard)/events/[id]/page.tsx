import { redirect } from "next/navigation"
import { getEvent } from "@/actions/event"
import { createClient } from "@/lib/supabase/server"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  
  if (!event) redirect("/dashboard")

  const supabase = await createClient()
  
  const [
    { data: categories },
    { data: milestones },
    { data: vendors },
    { data: guests },
    { data: tasks },
    { data: aiIdeas },
    { data: collaborators },
  ] = await Promise.all([
    supabase.from('budget_categories').select('*, budget_items(*)').eq('event_id', id).order('sort_order'),
    supabase.from('milestones').select('*').eq('event_id', id).order('sort_order'),
    supabase.from('vendors').select('*').eq('event_id', id).order('sort_order'),
    supabase.from('guests').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*').eq('event_id', id).order('sort_order'),
    supabase.from('ai_ideas').select('*').eq('event_id', id).order('created_at', { ascending: false }),
    supabase.from('event_collaborators').select('*, profiles(*)').eq('event_id', id),
  ])

  return (
    <EventDashboard 
      event={event}
      categories={categories || []}
      milestones={milestones || []}
      vendors={vendors || []}
      guests={guests || []}
      tasks={tasks || []}
      aiIdeas={aiIdeas || []}
      collaborators={collaborators || []}
    />
  )
}

function EventDashboard({ event, categories, milestones, vendors, guests, tasks, aiIdeas, collaborators }: any) {
  return (
    <div>
      <div className="p-6">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">Select a tab from the sidebar to manage your event</p>
      </div>
    </div>
  )
}
