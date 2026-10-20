"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Truck, Star, Loader2, GripVertical, DollarSign, Mail, Phone, Globe } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createVendor, updateVendor, deleteVendor, reorderVendors } from "@/actions/vendor"
import { vendorSchema } from "@/lib/validations/event"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Vendor {
  id: string
  name: string
  category: string
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  quote_amount: number | null
  status: string
  rating: number | null
  notes: string | null
  created_at: string
  sort_order: number
}

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    vendors: Vendor[]
  }
}

const formSchema = vendorSchema

export function VendorsClient({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>(initialData.vendors)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { name: "", category: "", status: "researching" } })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = vendors.findIndex(v => v.id === active.id)
      const newIndex = vendors.findIndex(v => v.id === over.id)
      const newVendors = Array.from(vendors)
      const [removed] = newVendors.splice(oldIndex, 1)
      newVendors.splice(newIndex, 0, removed)
      
      const reordered = newVendors.map((v, i) => ({ id: v.id, sort_order: i }))
      setVendors(newVendors)
      
      try {
        await reorderVendors(id, reordered)
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" })
        setVendors(vendors)
      }
    }
  }

  const categories = [...new Set(vendors.map(v => v.category))]
  const statuses = ["researching", "contacted", "quoted", "negotiating", "booked", "rejected"]
  const filteredVendors = vendors.filter(v => 
    (filterStatus === "all" || v.status === filterStatus) &&
    (filterCategory === "all" || v.category === filterCategory)
  )

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      if (editingVendor) {
        await updateVendor(editingVendor.id, id, new FormData(Object.entries(data)))
        toast({ title: "Vendor updated" })
      } else {
        await createVendor(id, new FormData(Object.entries(data)))
        toast({ title: "Vendor added" })
      }
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
      setEditingVendor(null)
      form.reset()
    }
  }

  async function handleDelete(vendorId: string) {
    if (!confirm("Delete this vendor?")) return
    try {
      await deleteVendor(vendorId, id)
      toast({ title: "Vendor deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const statusColors: Record<string, string> = {
    researching: "bg-gray-100 text-gray-800",
    contacted: "bg-blue-100 text-blue-800",
    quoted: "bg-yellow-100 text-yellow-800",
    negotiating: "bg-orange-100 text-orange-800",
    booked: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  }

  const statusOrder = { researching: 0, contacted: 1, quoted: 2, negotiating: 3, booked: 4, rejected: 5 }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Track vendors, quotes, and booking status</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl><Input placeholder="Elegant Events Co." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Venue", "Catering", "Photography", "Videography", "Decor", "Flowers", "Music/DJ", "Transportation", "Accommodation", "Other"].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="contact_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="john@events.com" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl><Input placeholder="https://events.com" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={form.control} name="quote_amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Amount ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rating" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (1-5)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Rating" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? 's' : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Input placeholder="Notes, requirements, etc." {...field} /></FormControl>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {editingVendor ? "Save" : "Add Vendor"}</Button>
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">{filteredVendors.length} of {vendors.length} vendors</div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredVendors.map(v => v.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 xxl:grid-cols-4 h-[calc(100vh-400px)] overflow-y-auto">
            {statuses.map(status => (
              <VendorStatusColumn
                key={status}
                status={status}
                vendors={filteredVendors.filter(v => v.status === status)}
                onEdit={setEditingVendor}
                onDelete={handleDelete}
                isEditing={editingVendor}
                form={form}
                onSave={handleSubmit}
                onCancel={() => { setEditingVendor(null); form.reset() }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function VendorStatusColumn({ status, vendors, onEdit, onDelete, isEditing, form, onSave, onCancel }: {
  status: string
  vendors: Vendor[]
  onEdit: (v: Vendor) => void
  onDelete: (id: string) => void
  isEditing: Vendor | null
  form: any
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const statusColors: Record<string, string> = {
    researching: "bg-gray-100 text-gray-800 border-gray-200",
    contacted: "bg-blue-100 text-blue-800 border-blue-200",
    quoted: "bg-yellow-100 text-yellow-800 border-yellow-200",
    negotiating: "bg-orange-100 text-orange-800 border-orange-200",
    booked: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <div className={cn("flex flex-col h-full", statusColors[status])}>
      <div className="p-3 border-b font-semibold flex items-center justify-between">
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
        <span className="text-sm font-normal text-muted-foreground">{vendors.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {vendors.map(vendor => (
          <SortableVendorCard
            key={vendor.id}
            vendor={vendor}
            onEdit={onEdit}
            onDelete={onDelete}
            isEditing={isEditing?.id === vendor.id}
            form={form}
            onSave={onSave}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  )
}

function SortableVendorCard({ vendor, onEdit, onDelete, isEditing, form, onSave, onCancel }: {
  vendor: Vendor
  onEdit: (v: Vendor) => void
  onDelete: (id: string) => void
  isEditing: boolean
  form: any
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: vendor.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const statusColors: Record<string, string> = {
    researching: "bg-gray-100 text-gray-800",
    contacted: "bg-blue-100 text-blue-800",
    quoted: "bg-yellow-100 text-yellow-800",
    negotiating: "bg-orange-100 text-orange-800",
    booked: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={cn("transition-shadow", isDragging && "shadow-lg")}>
        <CardContent className="p-3">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="space-y-2">
                <FormField control={form.control} name="name" render={({ field }) => <FormControl><Input {...field} autoFocus /></FormControl>} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["researching", "contacted", "quoted", "negotiating", "booked", "rejected"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
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
                <div>
                  <h4 className="font-medium">{vendor.name}</h4>
                  <p className="text-sm text-muted-foreground">{vendor.category}</p>
                </div>
                <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              {vendor.contact_name && <p className="text-sm"><span className="font-medium">Contact:</span> {vendor.contact_name}</p>}
              {vendor.email && <p className="text-sm"><span className="font-medium">Email:</span> {vendor.email}</p>}
              {vendor.phone && <p className="text-sm"><span className="font-medium">Phone:</span> {vendor.phone}</p>}
              {vendor.quote_amount && <p className="text-sm font-medium text-green-600">Quote: {formatCurrency(vendor.quote_amount)}</p>}
              {vendor.rating && <p className="text-sm flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> {vendor.rating}/5</p>}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Badge className={statusColors[vendor.status]}>{vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}</Badge>
                <Button variant="ghost" size="icon" onClick={() => onEdit(vendor)}><Edit className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(vendor.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
