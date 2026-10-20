"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Users,
  Truck,
  ClipboardList,
  Bot,
  Settings,
  PlusCircle,
} from "lucide-react"

const navigation = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Budget", href: "/budget", icon: DollarSign },
  { name: "Timeline", href: "/timeline", icon: Calendar },
  { name: "Vendors", href: "/vendors", icon: Truck },
  { name: "Guests", href: "/guests", icon: Users },
  { name: "Tasks", href: "/tasks", icon: ClipboardList },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function EventSidebar({ event }: { event: any }) {
  const pathname = usePathname()
  const eventId = event.id

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <PlusCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="truncate font-semibold">{event.title}</h1>
          <p className="text-xs text-muted-foreground capitalize">{event.event_type}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Event navigation">
        {navigation.map((item) => {
          const href = `/events/${eventId}${item.href}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground mb-2">Event Date</p>
        <p className="font-medium">{new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p className="text-xs text-muted-foreground mt-2">{getDaysUntil(event.event_date)} days remaining</p>
      </div>
    </aside>
  )
}

function getDaysUntil(date: string): number {
  const target = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
