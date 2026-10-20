import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getEvent } from "@/actions/event"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  CalendarDays,
  DollarSign,
  Users,
  Truck,
  ClipboardList,
  Bot,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ListChecks,
  CalendarPlus,
  Palette,
} from "lucide-react"
import {
  cn,
  formatCurrency,
  formatDate,
  getDaysUntil,
  getEventTypeLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getThemeColors,
  getThemeKeywords,
} from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

function googleCalendarUrl(event: any) {
  const date = String(event.event_date).replace(/-/g, "")
  const next = new Date(event.event_date)
  next.setDate(next.getDate() + 1)
  const endDate = next.toISOString().split("T")[0].replace(/-/g, "")
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${date}/${endDate}`,
    details: `Planned with EventPlanner.${event.venue ? ` Venue: ${event.venue}` : ""}`,
    location: event.venue || "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default async function EventOverviewPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const supabase = await createClient()
  const [categoriesResult, milestonesResult, vendorsResult, guestsResult, tasksResult] =
    await Promise.all([
      supabase.from("budget_categories").select("*, budget_items(*)").eq("event_id", id),
      supabase
        .from("milestones")
        .select("*")
        .eq("event_id", id)
        .order("due_date", { ascending: true }),
      supabase.from("vendors").select("*").eq("event_id", id),
      supabase.from("guests").select("*").eq("event_id", id),
      supabase.from("tasks").select("*").eq("event_id", id),
    ])

  const categories = categoriesResult.data || []
  const milestones = milestonesResult.data || []
  const vendors = vendorsResult.data || []
  const guests = guestsResult.data || []
  const tasks = tasksResult.data || []

  const spent = categories.reduce(
    (sum, category) =>
      sum +
      (category.budget_items || []).reduce(
        (categorySum: number, item: any) => categorySum + Number(item.actual_cost || 0),
        0
      ),
    0
  )
  const budget = Number(event.budget_total) || 0
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  const attending = guests.filter((guest) => guest.rsvp_status === "yes")
  const headcount = attending.length + attending.filter((guest) => guest.plus_one).length
  const bookedVendors = vendors.filter((vendor) => vendor.status === "booked")
  const completedMilestones = milestones.filter((milestone) => milestone.completed)
  const completedTasks = tasks.filter((task) => task.status === "done")
  const upcomingMilestones = milestones
    .filter((milestone) => !milestone.completed)
    .slice(0, 4)
  const daysLeft = getDaysUntil(event.event_date)

  const theme = event.ai_generated_theme
  const palette = getThemeColors(theme)
  const themeKeywords = getThemeKeywords(theme)
  const budgetPercentOfTotal =
    budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  const sections = [
    {
      href: `/events/${id}/budget`,
      label: "Budget",
      icon: DollarSign,
      detail: `${formatCurrency(spent)} of ${formatCurrency(budget)} spent`,
      percent: budgetPercentOfTotal,
    },
    {
      href: `/events/${id}/timeline`,
      label: "Timeline",
      icon: CalendarDays,
      detail: `${completedMilestones.length}/${milestones.length} milestones done`,
      percent:
        milestones.length > 0
          ? Math.round((completedMilestones.length / milestones.length) * 100)
          : 0,
    },
    {
      href: `/events/${id}/vendors`,
      label: "Vendors",
      icon: Truck,
      detail: `${bookedVendors.length}/${vendors.length} booked`,
      percent:
        vendors.length > 0 ? Math.round((bookedVendors.length / vendors.length) * 100) : 0,
    },
    {
      href: `/events/${id}/guests`,
      label: "Guests",
      icon: Users,
      detail: `${headcount} attending · ${guests.length} invitation${guests.length === 1 ? "" : "s"}`,
      percent:
        guests.length > 0 ? Math.round((attending.length / guests.length) * 100) : 0,
    },
    {
      href: `/events/${id}/tasks`,
      label: "Tasks",
      icon: ClipboardList,
      detail: `${completedTasks.length}/${tasks.length} completed`,
      percent:
        tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
    },
    {
      href: `/events/${id}/ai-assistant`,
      label: "AI Assistant",
      icon: Bot,
      detail: "Generate themes, speeches, and plans",
      percent: null,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {getEventTypeLabel(event.event_type)}
              </Badge>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  getStatusColor(event.status)
                )}
              >
                {event.status}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(event.event_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.venue || "Venue to be decided"}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {event.guest_count || 0} guests
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border bg-background/80 p-5 text-center backdrop-blur">
            <p className="text-4xl font-bold text-primary">
              {daysLeft >= 0 ? daysLeft : 0}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {daysLeft > 0 ? "days to go" : daysLeft === 0 ? "it's today!" : "event passed"}
            </p>
            <Button asChild size="sm" className="mt-1">
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                Google Calendar
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* AI theme */}
      {theme?.theme_name ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Your AI theme
                </p>
                <CardTitle className="mt-1 text-2xl">{theme.theme_name}</CardTitle>
                {theme.description ? (
                  <CardDescription className="mt-1 max-w-2xl">{theme.description}</CardDescription>
                ) : null}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/events/${id}/ai-assistant`}>
                  <Bot className="mr-1.5 h-4 w-4" />
                  Regenerate
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(palette) && palette.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Palette className="h-3.5 w-3.5" />
                  Colour palette
                </p>
                <div className="flex flex-wrap gap-2">
                  {palette.map((color: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3"
                      title={color.usage || color.name}
                    >
                      <span
                        className="h-6 w-6 rounded-full border"
                        style={{ backgroundColor: String(color.hex || "#eee") }}
                      />
                      <span className="text-xs">
                        {color.name ? `${color.name} · ` : ""}
                        {color.hex}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {themeKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {themeKeywords.map((keyword: string) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
            {theme.decor_style ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Decor direction: </span>
                {theme.decor_style}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Let Gemini design your theme</p>
                <p className="text-sm text-muted-foreground">
                  Get a concept, colour palette, and decor direction in seconds.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/events/${id}/ai-assistant?action=theme`}>
                Generate theme
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="mt-3 font-semibold">{section.label}</p>
                  <p className="text-sm text-muted-foreground">{section.detail}</p>
                  {section.percent !== null ? (
                    <Progress value={section.percent} className="mt-3 h-1.5" />
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Coming up</CardTitle>
              <CardDescription>Next milestones on your timeline</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/events/${id}/timeline`}>
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingMilestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                Everything is done — or add milestones to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMilestones.map((milestone) => {
                  const days = getDaysUntil(milestone.due_date)
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-center gap-3 rounded-xl border p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(milestone.due_date)} ·{" "}
                          {days < 0
                            ? `${Math.abs(days)} days overdue`
                            : days === 0
                              ? "today"
                              : `in ${days} days`}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn("shrink-0", getPriorityColor(milestone.priority))}
                      >
                        {getPriorityLabel(milestone.priority)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google tools</CardTitle>
            <CardDescription>Everything connected to your plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                <CalendarPlus className="mr-2 h-4 w-4 text-primary" />
                Add to Google Calendar
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </a>
            </Button>
            {event.venue ? (
              <Button asChild variant="outline" className="w-full justify-start">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  Directions on Google Maps
                  <ExternalLink className="ml-auto h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href={`/events/${id}/ai-assistant`}>
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                Google Gemini assistant
                <ArrowRight className="ml-auto h-3.5 w-3.5" />
              </Link>
            </Button>
            <Separator className="my-2" />
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                {completedTasks.length}/{tasks.length} tasks complete
              </p>
              <p className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                {formatCurrency(spent)} spent · {budgetPercent}% used
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
