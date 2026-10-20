"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  DollarSign,
  CalendarDays,
  Users,
  Truck,
  ClipboardList,
  Bot,
  Settings,
  ArrowLeft,
  MapPin,
} from "lucide-react"
import { cn, getEventTypeLabel, getDaysUntil } from "@/lib/utils"
import { usePreferences } from "@/components/providers/preferences-provider"
import { IntentLink } from "@/components/navigation/intent-link"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Overview", segment: "overview", icon: LayoutDashboard },
  { name: "Budget", segment: "budget", icon: DollarSign },
  { name: "Timeline", segment: "timeline", icon: CalendarDays },
  { name: "Vendors", segment: "vendors", icon: Truck },
  { name: "Guests", segment: "guests", icon: Users },
  { name: "Tasks", segment: "tasks", icon: ClipboardList },
  { name: "Assistant", segment: "ai-assistant", icon: Bot },
  { name: "Settings", segment: "settings", icon: Settings },
]

export function EventSidebar({ event }: { event: any }) {
  const pathname = usePathname()
  const { formatDate } = usePreferences()
  const base = `/events/${event.id}`
  const daysLeft = getDaysUntil(event.event_date)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All events
            </Link>
            <h2 className="line-clamp-2 text-lg font-semibold leading-tight">{event.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="capitalize">
                {getEventTypeLabel(event.event_type)}
              </Badge>
              {daysLeft >= 0 ? (
                <Badge variant="outline">{daysLeft} days left</Badge>
              ) : (
                <Badge variant="outline">Completed</Badge>
              )}
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(event.event_date)}
              </p>
              {event.venue ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-1">{event.venue}</span>
                </p>
              ) : null}
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const href = `${base}/${item.segment}`
              const isActive = pathname === href
              const Icon = item.icon

              return (
                <IntentLink
                  key={item.segment}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </IntentLink>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile navigation */}
      <nav className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {navigation.map((item) => {
          const href = `${base}/${item.segment}`
          const isActive = pathname === href
          const Icon = item.icon

          return (
            <IntentLink
              key={item.segment}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.name}
            </IntentLink>
          )
        })}
      </nav>
    </>
  )
}
