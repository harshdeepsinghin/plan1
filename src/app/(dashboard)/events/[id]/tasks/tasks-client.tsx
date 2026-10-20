"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ClipboardList, Loader2, GripVertical, MoreHorizontal, Calendar, Flag, User } from "lucide-react"
import { cn, formatDate, getPriorityColor, getPriorityLabel } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createTask, updateTask, updateTaskStatus, deleteTask, reorderTasks } from "@/actions/task"
import { taskSchema } from "@/lib/validations/event"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Task {
  id: string
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

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    tasks: Task[]
    milestones: any[]
    collaborators: any[]
  }
}

const formSchema = taskSchema

const columns = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
]

export function TasksClient({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { title: "", status: "todo", priority: "2" } })

  const assignees = initialData.collaborators.filter(c => c.accepted_at).map(c => c.profiles).filter(Boolean)
  const milestones = initialData.milestones

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const activeId = active.id as string
      const overId = over.id as string
      
      const activeTask = tasks.find(t => t.id === activeId)
      const overTask = tasks.find(t => t.id === overId)
      
      if (activeTask && overTask) {
        if (activeTask.status === overTask.status) {
          const columnTasks = tasks.filter(t => t.status === activeTask.status).sort((a, b) => a.sort_order - b.sort_order)
          const oldIndex = columnTasks.findIndex(t => t.id === activeId)
          const newIndex = columnTasks.findIndex(t => t.id === overId)
          const newColumnTasks = Array.from(columnTasks)
          const [removed] = newColumnTasks.splice(oldIndex, 1)
          newColumnTasks.splice(newIndex, 0, removed)
          
          const reordered = newColumnTasks.map((t, i) => ({ id: t.id, sort_order: i, status: t.status }))
          setTasks(prev => prev.map(t => {
            const updated = reordered.find(r => r.id === t.id)
            return updated ? { ...t, ...updated } : t
          }))
          
          try {
            await reorderTasks(id, reordered)
          } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
            setTasks(tasks)
          }
        } else {
          const newStatus = overTask.status
          try {
            await updateTaskStatus(activeId, id, newStatus)
            toast({ title: `Moved to ${columns.find(c => c.id === newStatus)?.title}` })
            router.refresh()
          } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
          }
        }
      }
    }
  }

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      if (editingTask) {
        await updateTask(editingTask.id, id, new FormData(Object.entries(data)))
        toast({ title: "Task updated" })
      } else {
        await createTask(id, new FormData(Object.entries(data)))
        toast({ title: "Task created" })
      }
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
      setEditingTask(null)
      form.reset()
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return
    try {
      await deleteTask(taskId, id)
      toast({ title: "Task deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Task Board</h1>
          <p className="text-muted-foreground">Kanban-style task management for your event</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Finalize seating chart" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                  </FormItem>
                )} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="1">High</SelectItem>
                          <SelectItem value="2">Medium</SelectItem>
                          <SelectItem value="3">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="assignee_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="milestone_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone (optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Link to milestone" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {milestones.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {editingTask ? "Save" : "Create"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Assignees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Priorities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="1">High</SelectItem>
                <SelectItem value="2">Medium</SelectItem>
                <SelectItem value="3">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 lg:grid-cols-4 h-[calc(100vh-350px)]">
          {columns.map(column => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={tasks.filter(t => 
                t.status === column.id &&
                (filterAssignee === "all" || 
                 (filterAssignee === "unassigned" ? !t.assignee_id : t.assignee_id === filterAssignee)) &&
                (filterPriority === "all" || t.priority.toString() === filterPriority)
              )}
              onEdit={setEditingTask}
              onDelete={handleDelete}
              isEditing={editingTask}
              form={form}
              onSave={handleSubmit}
              onCancel={() => { setEditingTask(null); form.reset() }}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

function TaskColumn({ column, tasks, onEdit, onDelete, isEditing, form, onSave, onCancel }: {
  column: { id: string; title: string }
  tasks: Task[]
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  isEditing: Task | null
  form: any
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const columnColors: Record<string, string> = {
    todo: "bg-gray-100 border-gray-200",
    in_progress: "bg-blue-100 border-blue-200",
    review: "bg-orange-100 border-orange-200",
    done: "bg-green-100 border-green-200",
  }

  return (
    <div className={cn("flex flex-col h-full", columnColors[column.id])}>
      <div className="p-3 border-b font-semibold flex items-center justify-between">
        <span>{column.title}</span>
        <span className="text-sm font-normal text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              isEditing={isEditing?.id === task.id}
              form={form}
              onSave={onSave}
              onCancel={onCancel}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">
            Drop tasks here or click "Add Task"
          </div>
        )}
      </div>
    </div>
  )
}

function SortableTaskCard({ task, onEdit, onDelete, isEditing, form, onSave, onCancel }: {
  task: Task
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  isEditing: boolean
  form: any
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={cn("transition-shadow", isDragging && "shadow-lg")}>
        <CardContent className="p-3">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
                <FormField control={form.control} name="title" render={({ field }) => <FormControl><Input {...field} autoFocus /></FormControl>} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                </div>
                <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {task.due_date && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.due_date)}
                  </Badge>
                )}
                <Badge className={getPriorityColor(task.priority)}>
                  <Flag className="h-3 w-3 mr-1" />
                  {getPriorityLabel(task.priority)}
                </Badge>
                {task.assignee_id && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Assigned
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="ghost" size="icon" onClick={() => onEdit(task)}><Edit className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
