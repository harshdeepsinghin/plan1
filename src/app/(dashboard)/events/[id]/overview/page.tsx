import { getEvent } from "@/actions/event"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Calendar, DollarSign, Users, Truck, ClipboardList, Bot, 
  TrendingUp, AlertCircle, CheckCircle, Clock, Star 
} from "lucide-react"
import { formatCurrency, formatDate, getDaysUntil, getEventTypeLabel, cn, getStatusColor } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventOverviewPage({ params }: Props) {
  const { id } = await params
  const event = await getEvent(id)
  
  if (!event) notFound()

  const supabase = await createClient()
  
  // Fetch summary data
  const [
    { count: budgetCategoriesCount },
    { count: milestonesCount },
    { count: completedMilestones },
    { count: vendorsCount },
    { count: bookedVendors },
    { count: guestsCount },
    { count: rsvpYesCount },
    { count: tasksCount },
    { count: completedTasks },
    { data: recentMilestones },
    { data: upcomingTasks },
  ] = await Promise.all([
    supabase.from('budget_categories').select('*', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('milestones').select('*', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('milestones').select('*', { count: 'exact', head: true }).eq('event_id', id).eq('completed', true),
    supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'booked'),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', id).eq('rsvp_status', 'yes'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'done'),
    supabase.from('milestones').select('*').eq('event_id', id).eq('completed', false).order('due_date', { ascending: true }).limit(5),
    supabase.from('tasks').select('*').eq('event_id', id).eq('status', 'todo').order('due_date', { ascending: true }).limit(5),
  ])

  const daysLeft = getDaysUntil(event.event_date)
  const isOverdue = daysLeft < 0
  const budgetPercent = event.budget_total > 0 ? Math.min((event.budget_spent / event.budget_total) * 100, 100) : 0
  const milestonesPercent = milestonesCount && milestonesCount > 0 ? Math.round((completedMilestones || 0) / milestonesCount * 100) : 0
  const vendorsPercent = vendorsCount && vendorsCount > 0 ? Math.round((bookedVendors || 0) / vendorsCount * 100) : 0
  const rsvpPercent = guestsCount && guestsCount > 0 ? Math.round((rsvpYesCount || 0) / guestsCount * 100) : 0
  const tasksPercent = tasksCount && tasksCount > 0 ? Math.round((completedTasks || 0) / tasksCount * 100) : 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={cn("px-3 py-1 rounded-full text-sm font-medium", getStatusColor(event.status))}>
              {event.status}
            </span>
            <Badge variant="secondary" className="capitalize">{getEventTypeLabel(event.event_type)}</Badge>
          </div>
          <h1 className="text-3xl font-bold mt-2">{event.title}</h1>
          <p className="text-muted-foreground mt-1">
            {formatDate(event.event_date)} • {event.venue || "Venue not set"} • {daysLeft >= 0 ? `${daysLeft} days remaining` : "Event completed"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${id}/settings`}>
            <Button variant="outline">Settings</Button>
          </Link>
          <Button onClick={() => {}}>Share</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Budget"
          value={`${formatCurrency(event.budget_spent)} / ${formatCurrency(event.budget_total)}`}
          subtitle={`${Math.round(budgetPercent)}% used`}
          icon={DollarSign}
          progress={budgetPercent}
          iconColor="text-green-600 bg-green-100"
        />
        <MetricCard
          title="Timeline"
          value={`${completedMilestones || 0} / ${milestonesCount || 0}`}
          subtitle={`${milestonesPercent}% complete`}
          icon={Calendar}
          progress={milestonesPercent}
          iconColor="text-blue-600 bg-blue-100"
        />
        <MetricCard
          title="Vendors"
          value={`${bookedVendors || 0} / ${vendorsCount || 0}`}
          subtitle={`${vendorsPercent}% booked`}
          icon={Truck}
          progress={vendorsPercent}
          iconColor="text-purple-600 bg-purple-100"
        />
        <MetricCard
          title="Guests"
          value={`${rsvpYesCount || 0} / ${guestsCount || 0}`}
          subtitle={`${rsvpPercent}% RSVP'd Yes`}
          icon={Users}
          progress={rsvpPercent}
          iconColor="text-orange-600 bg-orange-100"
        />
        <MetricCard
          title="Tasks"
          value={`${completedTasks || 0} / ${tasksCount || 0}`}
          subtitle={`${tasksPercent}% done`}
          icon={ClipboardList}
          progress={tasksPercent}
          iconColor="text-red-600 bg-red-100"
        />
      </div>

      {/* Quick Actions & Upcoming */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              title="Generate Theme"
              description="Get AI-powered theme & color palette"
              icon={Star}
              href={`/events/${id}/ai-assistant?action=theme`}
            />
            <QuickActionCard
              title="Smart Budget"
              description="Auto-generate budget breakdown"
              icon={DollarSign}
              href={`/events/${id}/ai-assistant?action=budget`}
            />
            <QuickActionCard
              title="Timeline Generator"
              description="Create milestones from event date"
              icon={Calendar}
              href={`/events/${id}/ai-assistant?action=timeline`}
            />
            <QuickActionCard
              title="Vendor Finder"
              description="Get vendor suggestions & questions"
              icon={Truck}
              href={`/events/${id}/ai-assistant?action=vendors`}
            />
            <QuickActionCard
              title="Activity Ideas"
              description="Unique entertainment & activities"
              icon={ClipboardList}
              href={`/events/${id}/ai-assistant?action=activities`}
            />
            <QuickActionCard
              title="AI Chat Assistant"
              description="Ask anything about your event"
              icon={Bot}
              href={`/events/${id}/ai-assistant`}
            />
          </CardContent>
        </Card>

        {/* Upcoming Milestones & Tasks */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMilestones && recentMilestones.length > 0 ? (
                <ul className="space-y-3">
                  {recentMilestones.slice(0, 5).map((m: any) => (
                    <li key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn("flex-shrink-0 w-2 h-2 rounded-full mt-2", m.priority === 1 && "bg-red-500", m.priority === 2 && "bg-yellow-500", m.priority === 3 && "bg-green-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(m.due_date)} • {m.category}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{m.priority === 1 ? "High" : m.priority === 2 ? "Medium" : "Low"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No upcoming milestones. <Link href={`/events/${id}/ai-assistant?action=timeline`} className="text-primary hover:underline">Generate timeline</Link></p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks && upcomingTasks.length > 0 ? (
                <ul className="space-y-3">
                  {upcomingTasks.slice(0, 5).map((t: any) => (
                    <li key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn("flex-shrink-0 w-2 h-2 rounded-full mt-2", t.priority === 1 && "bg-red-500", t.priority === 2 && "bg-yellow-500", t.priority === 3 && "bg-green-500")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{t.title}</p>
                        {t.due_date && <p className="text-sm text-muted-foreground">Due: {formatDate(t.due_date)}</p>}
                      </div>
                      <Badge variant="outline" className="capitalize">{t.status.replace('_', ' ')}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No pending tasks</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Theme Preview */}
      {event.ai_generated_theme && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              AI-Generated Theme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <h3 className="text-xl font-semibold">{event.ai_generated_theme.theme_name}</h3>
                <p className="text-muted-foreground">{event.ai_generated_theme.description}</p>
                <p className="text-sm font-medium">Decor Style: {event.ai_generated_theme.decor_style}</p>
                <div className="flex flex-wrap gap-1">
                  {event.ai_generated_theme.mood_board_keywords?.map((k: string) => (
                    <Badge key={k} variant="outline">{k}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Color Palette</p>
                <div className="grid gap-2">
                  {Object.entries(event.ai_generated_theme.color_palette || {}).map(([role, hex]) => (
                    <div key={role} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded border" style={{ backgroundColor: hex }} />
                      <div>
                        <p className="font-medium capitalize">{role}</p>
                        <p className="text-sm text-muted-foreground font-mono">{hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ title, value, subtitle, icon: Icon, progress, iconColor }: {
  title: string
  value: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
  iconColor: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn("p-3 rounded-xl", iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <Progress value={progress} className="mt-4 h-1.5" />
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ title, description, icon: Icon, href }: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}) {
  return (
    <Link href={href} className="p-4 rounded-lg border hover:bg-accent transition-colors group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}
