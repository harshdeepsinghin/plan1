import { getEvents } from "@/actions/event"
import { createEventSchema } from "@/lib/validations/event"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { z } from "zod"
import { Plus, Calendar, DollarSign, Users, Trash2, Edit } from "lucide-react"
import { formatDate, getEventTypeLabel, getDaysUntil, cn, formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

const createEventFormSchema = createEventSchema.extend({
  title: z.string().min(1, "Title is required").max(100),
})

async function getUserEvents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/auth/login")

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return { events: data || [], user }
}

export default async function DashboardPage() {
  const { events, user } = await getUserEvents()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Manage and create your events</p>
        </div>
        <CreateEventDialog />
      </div>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="py-12 text-center">
      <CardContent className="space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-3xl">🎉</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No events yet</h3>
          <p className="text-muted-foreground">Create your first event to get started with AI-powered planning</p>
        </div>
        <CreateEventDialog />
      </CardContent>
    </Card>
  )
}

function EventCard({ event }: { event: any }) {
  const daysLeft = getDaysUntil(event.event_date)
  const isOverdue = daysLeft < 0
  const budgetPercent = event.budget_total > 0 ? (event.budget_spent / event.budget_total) * 100 : 0

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className={cn("h-3", event.ai_generated_theme?.color_palette?.primary && `bg-[${event.ai_generated_theme.color_palette.primary}]`)} />
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{event.title}</h3>
            <p className="text-sm text-muted-foreground capitalize">{getEventTypeLabel(event.event_type)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/events/${event.id}/settings`} className="p-1 hover:bg-accent rounded">
              <Edit className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(event.event_date)}
          </span>
          <span className={cn("font-medium", isOverdue ? "text-destructive" : "text-primary")}>
            {isOverdue ? "Event passed" : `${daysLeft} days left`}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-medium">{formatCurrency(event.budget_spent)} / {formatCurrency(event.budget_total)}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {event.guest_count} guests
          </span>
          <span className="capitalize">{event.status}</span>
        </div>

        <Link href={`/events/${event.id}`} className="block w-full text-center">
          <Button variant="outline" className="w-full">Open Event</Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function CreateEventDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <CreateEventForm />
      </DialogContent>
    </Dialog>
  )
}

function CreateEventForm() {
  return (
    <Form>
      <form action={async (formData) => {
        "use server"
        const { createEvent } = await import("@/actions/event")
        await createEvent(formData)
      }} className="space-y-4">
        <FormField
          control={{ name: "title" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="Sarah & John's Wedding" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={{ name: "event_type" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="community">Community Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={{ name: "event_date" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={{ name: "venue" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Venue (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Grand Ballroom, NYC" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={{ name: "guest_count" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guest Count</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={{ name: "budget_total" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Budget ($)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="100" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" className="w-full">Create Event</Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
