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
import { Plus, Edit, Trash2, Calendar, Clock, CheckCircle, Loader2, GripVertical } from "lucide-react"
import { cn, formatDate, getPriorityColor, getPriorityLabel, formatDateShort } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateMilestone, deleteMilestone, reorderMilestones } from "@/actions/milestone"
import { milestoneSchema } from "@/lib/validations/event"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Milestone {
  id: string
  title: string
  description: string | null
  due_date: string
  completed: boolean
  completed_at: string | null
  category: string
  priority: number
  sort_order: number
}

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    milestones: Milestone[]
  }
}

const formSchema = milestoneSchema

export function TimelineClient({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [milestones, setMilestones] = useState<Milestone[]>(initialData.milestones)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { title: "", category: "other", priority: "2" } })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex(m => m.id === active.id)
      const newIndex = milestones.findIndex(m => m.id === over.id)
      const newMilestones = Array.from(milestones)
      const [removed] = newMilestones.splice(oldIndex, 1)
      newMilestones.splice(newIndex, 0, removed)
      
      const reordered = newMilestones.map((m, i) => ({ id: m.id, sort_order: i }))
      setMilestones(newMilestones)
      
      try {
        await reorderMilestones(id, reordered)
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        setMilestones(milestones)
      }
    }
  }

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone.id, id, new FormData(Object.entries(data)))
        toast({ title: "Milestone updated" })
      } else {
        const response = await fetch(`/events/${id}/timeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
        if (!response.ok) throw new Error("Failed to create")
        toast({ title: "Milestone created" })
      }
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
      setEditingMilestone(null)
      form.reset()
    }
  }

  async function handleDelete(milestoneId: string) {
    if (!confirm("Delete this milestone?")) return
    try {
      await deleteMilestone(milestoneId, id)
      toast({ title: "Milestone deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const categoryColors: Record<string, string> = {
    booking: "bg-blue-100 text-blue-800",
    payments: "bg-green-100 text-green-800",
    design: "bg-purple-100 text-purple-800",
    logistics: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  }

  const incompleteMilestones = milestones.filter(m => !m.completed).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
  const completedMilestones = milestones.filter(m => m.completed).sort((a, b) => new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime())

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Timeline & Milestones</h1>
          <p className="text-muted-foreground">Track key dates and deadlines for your event</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMilestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Book venue" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="booking">Booking</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {editingMilestone ? "Save" : "Create"}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={milestones.length} icon={Calendar} color="blue" />
        <StatCard title="Completed" value={completedMilestones.length} icon={CheckCircle} color="green" />
        <StatCard title="Pending" value={incompleteMilestones.length} icon={Clock} color="yellow" />
        <StatCard title="Progress" value={`${milestones.length ? Math.round(completedMilestones.length / milestones.length * 100) : 0}%`} icon={TrendingUp} color="purple" />
      </div>

      {/* Timeline */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={incompleteMilestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {incompleteMilestones.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-muted-foreground">Upcoming</h3>
                {incompleteMilestones.map((milestone) => (
                  <SortableMilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onEdit={setEditingMilestone}
                    onDelete={handleDelete}
                    isEditing={editingMilestone?.id === milestone.id}
                    form={form}
                    onSave={(data) => handleSubmit(data)}
                    onCancel={() => { setEditingMilestone(null); form.reset() }}
                  />
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No milestones yet</p>
                  <Button onClick={() => {}}>Create your first milestone</Button>
                </CardContent>
              </Card>
            )}

            {completedMilestones.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-muted-foreground">Completed</h3>
                <div className="space-y-2">
                  {completedMilestones.map((milestone) => (
                    <CompletedMilestoneCard key={milestone.id} milestone={milestone} />
                  ))}
                </div>
              </>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn("p-3 rounded-xl", colors[color])}><Icon className="h-6 w-6" /></div>
        </div>
      </CardContent>
    </Card>
  )
}

function SortableMilestoneCard({ milestone, onEdit, onDelete, isEditing, form, onSave, onCancel }: {
  milestone: Milestone
  onEdit: (m: Milestone) => void
  onDelete: (id: string) => void
  isEditing: boolean
  form: any
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={cn("transition-shadow", isDragging && "shadow-lg")}>
        <CardContent className="p-4">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
                <FormField control={form.control} name="title" render={({ field }) => <FormControl><Input {...field} autoFocus /></FormControl>} />
                <FormField control={form.control} name="due_date" render={({ field }) => <FormControl><Input type="date" {...field} /></FormControl>} />
                <div className="flex gap-2">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="booking">Booking</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="1">High</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                  <Button type="submit" size="sm">Save</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{milestone.title}</h4>
                  <Badge className={categoryColors[milestone.category] || "bg-gray-100 text-gray-800"}>{milestone.category}</Badge>
                  <Badge className={getPriorityColor(milestone.priority)}>{getPriorityLabel(milestone.priority)}</Badge>
                </div>
                {milestone.description && <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>}
                <p className="text-sm text-muted-foreground mt-1">Due: {formatDate(milestone.due_date)} {formatDateShort(milestone.due_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(milestone)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(milestone.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CompletedMilestoneCard({ milestone }: { milestone: Milestone }) {
  const categoryColors: Record<string, string> = {
    booking: "bg-blue-100 text-blue-800",
    payments: "bg-green-100 text-green-800",
    design: "bg-purple-100 text-purple-800",
    logistics: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800",
  }
  return (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium line-through text-green-800">{milestone.title}</p>
            <p className="text-sm text-green-600">Completed {milestone.completed_at ? formatDate(milestone.completed_at) : "recently"}</p>
          </div>
          <Badge variant="secondary" className={categoryColors[milestone.category]}>{milestone.category}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
