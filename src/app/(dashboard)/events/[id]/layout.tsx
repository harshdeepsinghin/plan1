import { getEvent } from "@/actions/event"
import { EventSidebar } from "@/components/layout/sidebar"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)

  return {
    title: event ? `${event.title} | EventPlanner` : "Event | EventPlanner",
  }
}

export default async function EventLayout({ params, children }: Props) {
  const { id } = await params
  const event = await getEvent(id)

  if (!event) notFound()

  return (
    <div className="lg:flex lg:gap-6">
      <EventSidebar event={event} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
