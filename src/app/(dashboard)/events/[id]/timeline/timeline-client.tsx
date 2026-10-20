"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createMilestone,
  deleteMilestone,
  toggleMilestone,
  updateMilestone,
} from "@/actions/milestone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  CheckCircle2,
  Circle,
  Loader2,
  Flag,
  Clock,
  AlertTriangle,
  ListChecks,
} from "lucide-react"
import { cn, formatDate, getDaysUntil, getPriorityColor, getPriorityLabel } from "@/lib/utils"

export interface Milestone {
  id: string
  event_id: string
  title: string
  description: string | null
  due_date: string
  category: string
  priority: number
  completed: boolean
  completed_at: string | null
  sort_order: number
}

interface Props {
  eventId: string
  eventDate: string
  initialMilestones: Milestone[]
}

const CATEGORIES = ["booking", "payments", "design", "logistics", "other"]

export function TimelineClient({ eventId, eventDate, initialMilestones }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [filter, setFilter] = useState("all")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...initialMilestones].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ),
    [initialMilestones]
  )

  const completed = sorted.filter((milestone) => milestone.completed)
  const overdue = sorted.filter(
    (milestone) => !milestone.completed && getDaysUntil(milestone.due_date) < 0
  )
  const nextMilestone = sorted.find((milestone) => !milestone.completed)
  const progress = sorted.length > 0 ? Math.round((completed.length / sorted.length) * 100) : 0

  const filtered = sorted.filter((milestone) => {
    if (filter === "upcoming") return !milestone.completed
    if (filter === "completed") return milestone.completed
    return true
  })

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createMilestone(eventId, formData)
      setAddOpen(false)
      toast({ title: "Milestone added to your timeline" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add milestone",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleToggle(milestone: Milestone) {
    setTogglingId(milestone.id)
    try {
      await toggleMilestone(milestone.id, eventId, !milestone.completed)
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update milestone",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-sm text-muted-foreground">
            A countdown of everything that needs to happen before the big day.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add milestone
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Milestones" value={String(sorted.length)} />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={`${completed.length} / ${sorted.length}`}
          hint={`${progress}% done`}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue"
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "danger" : "default"}
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Event day"
          value={formatDate(eventDate)}
          hint={`${Math.max(0, getDaysUntil(eventDate))} days away`}
        />
      </div>

      {nextMilestone ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Next up</p>
              <p className="mt-1 font-semibold">{nextMilestone.title}</p>
              <p className="text-sm text-muted-foreground">
                Due {formatDate(nextMilestone.due_date)}
              </p>
            </div>
            <Badge
              className={cn(
                "shrink-0",
                getDaysUntil(nextMilestone.due_date) < 0
                  ? "bg-red-100 text-red-800"
                  : "bg-primary/15 text-primary"
              )}
            >
              {getDaysUntil(nextMilestone.due_date) < 0
                ? `${Math.abs(getDaysUntil(nextMilestone.due_date))} days overdue`
                : `${getDaysUntil(nextMilestone.due_date)} days left`}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold">Nothing here yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a milestone, or generate a complete planning timeline in the AI Assistant.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-border sm:before:left-[23px]">
          {filtered.map((milestone) => (
            <MilestoneRow
              key={milestone.id}
              eventId={eventId}
              milestone={milestone}
              toggling={togglingId === milestone.id}
              onToggle={() => handleToggle(milestone)}
            />
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a milestone</DialogTitle>
            <DialogDescription>
              Big or small, every step gets you closer to the celebration.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                name="title"
                placeholder="e.g. Book the photographer"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="milestone-due">Due date</Label>
                <Input id="milestone-due" name="due_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestone-priority">Priority</Label>
                <select
                  id="milestone-priority"
                  name="priority"
                  defaultValue="2"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="milestone-category">Category</Label>
                <select
                  id="milestone-category"
                  name="category"
                  defaultValue="other"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category} className="capitalize">
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-description">Notes</Label>
              <Textarea
                id="milestone-description"
                name="description"
                rows={3}
                placeholder="Any details or reminders"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: "default" | "danger"
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone === "danger" ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-bold">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function MilestoneRow({
  eventId,
  milestone,
  toggling,
  onToggle,
}: {
  eventId: string
  milestone: Milestone
  toggling: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const days = getDaysUntil(milestone.due_date)
  const isOverdue = !milestone.completed && days < 0

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateMilestone(milestone.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Milestone updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update milestone",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${milestone.title}"?`)) return
    try {
      await deleteMilestone(milestone.id, eventId)
      toast({ title: "Milestone deleted" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not delete milestone",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="relative flex gap-3 sm:gap-4">
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        aria-label={milestone.completed ? "Mark as incomplete" : "Mark as complete"}
        className={cn(
          "relative z-10 mt-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-background transition-colors sm:h-10 sm:w-10",
          milestone.completed
            ? "border-green-500 text-green-600"
            : isOverdue
              ? "border-red-400 text-red-500 hover:border-red-500"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
        )}
      >
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : milestone.completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <Card className={cn("flex-1", milestone.completed && "opacity-70")}>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "font-semibold",
                  milestone.completed && "line-through text-muted-foreground"
                )}
              >
                {milestone.title}
              </p>
              <Badge variant="secondary" className={cn("capitalize", getPriorityColor(milestone.priority))}>
                <Flag className="mr-1 h-3 w-3" />
                {getPriorityLabel(milestone.priority)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {milestone.category}
              </Badge>
            </div>
            {milestone.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
            ) : null}
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 text-xs",
                isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {formatDate(milestone.due_date)}
              {milestone.completed
                ? " · completed"
                : days < 0
                  ? ` · ${Math.abs(days)} days overdue`
                  : days === 0
                    ? " · today"
                    : ` · in ${days} days`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit milestone">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete milestone">
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit milestone</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-title-${milestone.id}`}>Title</Label>
              <Input
                id={`edit-title-${milestone.id}`}
                name="title"
                defaultValue={milestone.title}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-due-${milestone.id}`}>Due date</Label>
                <Input
                  id={`edit-due-${milestone.id}`}
                  name="due_date"
                  type="date"
                  defaultValue={milestone.due_date}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-priority-${milestone.id}`}>Priority</Label>
                <select
                  id={`edit-priority-${milestone.id}`}
                  name="priority"
                  defaultValue={String(milestone.priority)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`edit-category-${milestone.id}`}>Category</Label>
                <select
                  id={`edit-category-${milestone.id}`}
                  name="category"
                  defaultValue={milestone.category}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-description-${milestone.id}`}>Notes</Label>
              <Textarea
                id={`edit-description-${milestone.id}`}
                name="description"
                rows={3}
                defaultValue={milestone.description || ""}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
