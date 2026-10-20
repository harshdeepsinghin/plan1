"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  createTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
} from "@/actions/task"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  CalendarDays,
  User,
} from "lucide-react"
import { cn, formatDate, getDaysUntil, getPriorityColor, getPriorityLabel } from "@/lib/utils"

export interface Task {
  id: string
  event_id: string
  title: string
  description: string | null
  status: string
  assignee_id: string | null
  due_date: string | null
  priority: number
  milestone_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface Member {
  id: string
  name: string
}

interface Props {
  eventId: string
  initialTasks: Task[]
  members: Member[]
}

const COLUMNS = [
  { id: "todo", label: "To do", accent: "bg-slate-400" },
  { id: "in_progress", label: "In progress", accent: "bg-blue-500" },
  { id: "review", label: "Review", accent: "bg-amber-500" },
  { id: "done", label: "Done", accent: "bg-emerald-500" },
]

export function TasksClient({ eventId, initialTasks, members }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const done = initialTasks.filter((task) => task.status === "done")
  const overdue = initialTasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_date &&
      getDaysUntil(task.due_date) < 0
  )
  const dueSoon = initialTasks.filter(
    (task) =>
      task.status !== "done" &&
      task.due_date &&
      getDaysUntil(task.due_date) >= 0 &&
      getDaysUntil(task.due_date) <= 7
  )

  const activeTask = initialTasks.find((task) => task.id === activeId) || null
  const memberById = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member.name])),
    [members]
  )

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createTask(eventId, formData)
      setAddOpen(false)
      toast({ title: "Task created" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not create task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    try {
      await updateTaskStatus(taskId, eventId, status)
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not move task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const overId = event.over?.id
    if (!overId) return

    const columnId = String(overId).replace("column-", "")
    const task = initialTasks.find((item) => item.id === String(event.active.id))
    if (task && COLUMNS.some((column) => column.id === columnId) && task.status !== columnId) {
      handleStatusChange(task.id, columnId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Everything that needs doing, from booking to day-of logistics.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ClipboardList className="h-5 w-5" />} label="Total tasks" value={String(initialTasks.length)} />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={`${done.length} / ${initialTasks.length}`}
          hint={initialTasks.length > 0 ? `${Math.round((done.length / initialTasks.length) * 100)}% done` : undefined}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Due this week"
          value={String(dueSoon.length)}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue"
          value={String(overdue.length)}
          tone={overdue.length > 0 ? "danger" : "default"}
        />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              eventId={eventId}
              tasks={initialTasks.filter((task) => task.status === column.id)}
              members={members}
              memberById={memberById}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-64 rotate-2 rounded-xl border bg-card p-3 shadow-2xl">
              <p className="text-sm font-semibold">{activeTask.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{getPriorityLabel(activeTask.priority)} priority</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a task</DialogTitle>
            <DialogDescription>Assign it, set a due date, and keep moving.</DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task</Label>
              <Input id="task-title" name="title" placeholder="e.g. Confirm final headcount" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <select
                  id="task-status"
                  name="status"
                  defaultValue="todo"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <select
                  id="task-priority"
                  name="priority"
                  defaultValue="2"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date</Label>
                <Input id="task-due" name="due_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assignee</Label>
                <select
                  id="task-assignee"
                  name="assignee_id"
                  defaultValue=""
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Notes</Label>
              <Textarea
                id="task-description"
                name="description"
                rows={3}
                placeholder="Any details or links"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add task
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

function TaskColumn({
  column,
  eventId,
  tasks,
  members,
  memberById,
  onStatusChange,
}: {
  column: { id: string; label: string; accent: string }
  eventId: string
  tasks: Task[]
  members: Member[]
  memberById: Record<string, string>
  onStatusChange: (taskId: string, status: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[260px] flex-col rounded-2xl border bg-muted/40 p-3 transition-colors",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", column.accent)} />
          <span className="text-sm font-semibold">{column.label}</span>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            eventId={eventId}
            members={members}
            assigneeName={task.assignee_id ? memberById[task.assignee_id] : null}
            onStatusChange={onStatusChange}
          />
        ))}
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  eventId,
  members,
  assigneeName,
  onStatusChange,
}: {
  task: Task
  eventId: string
  members: Member[]
  assigneeName: string | null | undefined
  onStatusChange: (taskId: string, status: string) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const overdue =
    task.status !== "done" && task.due_date && getDaysUntil(task.due_date) < 0

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateTask(task.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Task updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    try {
      await deleteTask(task.id, eventId)
      toast({ title: "Task deleted" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not delete task",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-card shadow-sm transition-shadow hover:shadow-md",
          isDragging && "opacity-40"
        )}
      >
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-1">
            <p className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </p>
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
              aria-label="Drag task"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>

          {task.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={cn("text-[10px]", getPriorityColor(task.priority))}>
              <Flag className="mr-1 h-2.5 w-2.5" />
              {getPriorityLabel(task.priority)}
            </Badge>
            {task.due_date ? (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  overdue && "border-red-300 bg-red-50 text-red-700"
                )}
              >
                <CalendarDays className="mr-1 h-2.5 w-2.5" />
                {formatDate(task.due_date)}
              </Badge>
            ) : null}
          </div>

          {assigneeName ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {assigneeName}
            </p>
          ) : null}

          <div className="flex items-center justify-between border-t pt-2">
            <select
              value={task.status}
              onChange={(event) => onStatusChange(task.id, event.target.value)}
              className="h-7 rounded-md border border-input bg-background px-1 text-xs"
              aria-label="Task status"
            >
              {COLUMNS.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.label}
                </option>
              ))}
            </select>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`task-title-${task.id}`}>Task</Label>
              <Input id={`task-title-${task.id}`} name="title" defaultValue={task.title} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`task-status-${task.id}`}>Status</Label>
                <select
                  id={`task-status-${task.id}`}
                  name="status"
                  defaultValue={task.status}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-priority-${task.id}`}>Priority</Label>
                <select
                  id={`task-priority-${task.id}`}
                  name="priority"
                  defaultValue={String(task.priority)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">High</option>
                  <option value="2">Medium</option>
                  <option value="3">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-due-${task.id}`}>Due date</Label>
                <Input
                  id={`task-due-${task.id}`}
                  name="due_date"
                  type="date"
                  defaultValue={task.due_date || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`task-assignee-${task.id}`}>Assignee</Label>
                <select
                  id={`task-assignee-${task.id}`}
                  name="assignee_id"
                  defaultValue={task.assignee_id || ""}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`task-description-${task.id}`}>Notes</Label>
              <Textarea
                id={`task-description-${task.id}`}
                name="description"
                rows={3}
                defaultValue={task.description || ""}
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
    </>
  )
}
