import { getEvent } from "@/actions/event"
import { EventSidebar } from "@/components/layout/sidebar"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export default async function EventLayout({ params, children }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  
  if (!event) notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:flex">
        <EventSidebar event={event} />
        <div className="flex-1 lg:ml-0">
          {children}
        </div>
      </div>
    </div>
  )
}
