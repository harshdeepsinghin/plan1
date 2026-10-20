import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  DollarSign,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  MapPin,
  PartyPopper,
  Bot,
} from "lucide-react"
import {
  formatCurrency,
  formatDate,
  getDaysUntil,
  getEventTypeLabel,
  getStatusColor,
  getThemeColors,
  cn,
} from "@/lib/utils"

export const metadata = {
  title: "Dashboard | EventPlanner",
}

interface EventRecord {
  id: string
  title: string
  event_type: string
  event_date: string
  venue: string | null
  guest_count: number
  budget_total: number
  budget_spent: number
  status: string
  ai_generated_theme: any
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const [{ data: ownedEvents }, { data: memberships }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_collaborators")
      .select("event_id, events(*)")
      .eq("user_id", user.id)
      .not("accepted_at", "is", null),
  ])

  const collaboratorEvents = (memberships || [])
    .map((membership: any) => membership.events)
    .filter(Boolean)

  const events: EventRecord[] = [...(ownedEvents || []), ...collaboratorEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const upcoming = events.filter(
    (event) => getDaysUntil(event.event_date) >= 0 && event.status !== "cancelled"
  )

  const totalBudget = events.reduce((sum, event) => sum + (Number(event.budget_total) || 0), 0)
  const totalSpent = events.reduce((sum, event) => sum + (Number(event.budget_spent) || 0), 0)
  const totalGuests = events.reduce((sum, event) => sum + (Number(event.guest_count) || 0), 0)

  const firstName = (profile?.full_name || user.user_metadata?.full_name || user.email || "there")
    .split(" ")[0]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Google Gemini
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              {events.length === 0
                ? "Create your first event and let AI build the theme, budget, and timeline in seconds."
                : `You have ${upcoming.length} upcoming ${upcoming.length === 1 ? "event" : "events"}. Let's make it unforgettable.`}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/events/new">
              <Plus className="mr-2 h-5 w-5" />
              Plan a new event
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<PartyPopper className="h-5 w-5" />}
          label="Active events"
          value={String(upcoming.length)}
          hint={`${events.length} total`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total budget"
          value={formatCurrency(totalBudget)}
          hint={`${formatCurrency(totalSpent)} spent`}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Guest target"
          value={String(totalGuests)}
          hint="across all events"
        />
        <StatCard
          icon={<Bot className="h-5 w-5" />}
          label="AI plans created"
          value={String(events.filter((event) => event.ai_generated_theme).length)}
          hint="themes generated"
        />
      </section>

      {/* Events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your events</h2>
            <p className="text-sm text-muted-foreground">
              Every celebration, organised in one place
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PartyPopper className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No events yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Tell us the occasion and date — Gemini will suggest a theme, a full budget
                  breakdown, and a planning timeline.
                </p>
              </div>
              <Button asChild>
                <Link href="/events/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first event
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function EventCard({ event }: { event: EventRecord }) {
  const daysLeft = getDaysUntil(event.event_date)
  const budgetPercent =
    Number(event.budget_total) > 0
      ? Math.min(100, Math.round((Number(event.budget_spent) / Number(event.budget_total)) * 100))
      : 0

  const theme = event.ai_generated_theme
  const primaryColor = getThemeColors(theme)[0]?.hex

  return (
    <Card className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="h-2 w-full"
        style={{ background: primaryColor || "hsl(var(--primary))" }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{event.title}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="capitalize">
                {getEventTypeLabel(event.event_type)}
              </Badge>
              <span className={cn("rounded-full px-2 py-0.5 text-xs capitalize", getStatusColor(event.status))}>
                {event.status}
              </span>
            </div>
          </div>
          {daysLeft >= 0 ? (
            <div className="shrink-0 rounded-xl bg-primary/10 px-3 py-2 text-center text-primary">
              <p className="text-lg font-bold leading-none">{daysLeft}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide">days</p>
            </div>
          ) : (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDate(event.event_date)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{event.venue || "Venue to be decided"}</span>
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {event.guest_count || 0} guests
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Budget used</span>
            <span className="font-medium">{budgetPercent}%</span>
          </div>
          <Progress value={budgetPercent} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(Number(event.budget_spent) || 0)} of{" "}
            {formatCurrency(Number(event.budget_total) || 0)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/events/${event.id}/overview`}>
              Open planner
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {theme?.theme_name ? (
            <Button asChild size="sm" variant="outline" title={theme.theme_name}>
              <Link href={`/events/${event.id}/ai-assistant`}>
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
