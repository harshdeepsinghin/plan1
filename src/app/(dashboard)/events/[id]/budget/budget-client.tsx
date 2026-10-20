"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Loader2 } from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createBudgetCategory, createBudgetItem, updateBudgetCategory, updateBudgetItem, deleteBudgetCategory, deleteBudgetItem, reorderBudgetCategories } from "@/actions/budget"
import { budgetCategorySchema, budgetItemSchema } from "@/lib/validations/event"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronRight } from "lucide-react"

interface BudgetCategory {
  id: string
  name: string
  allocated: number
  spent: number
  sort_order: number
  items: BudgetItem[]
}

interface BudgetItem {
  id: string
  name: string
  vendor: string | null
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  notes: string | null
}

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    categories: BudgetCategory[]
  }
}

const categoryFormSchema = budgetCategorySchema
const itemFormSchema = budgetItemSchema

export function BudgetPage({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<BudgetCategory[]>(initialData.categories)
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const categoryForm = useForm({ resolver: zodResolver(categoryFormSchema), defaultValues: { name: "", allocated: 0 } })
  const itemForm = useForm({ resolver: zodResolver(itemFormSchema), defaultValues: { name: "", status: "pending" } })

  const totalAllocated = categories.reduce((sum, c) => sum + c.allocated, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0)
  const totalEstimated = categories.reduce((sum, c) => sum + c.items.reduce((s, i) => s + (i.estimated_cost || 0), 0), 0)

  async function handleCreateCategory(data: any) {
    setIsLoading(true)
    try {
      await createBudgetCategory(id, new FormData(Object.entries(data)))
      toast({ title: "Category created" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateCategory(categoryId: string, data: any) {
    setIsLoading(true)
    try {
      await updateBudgetCategory(categoryId, new FormData(Object.entries(data)))
      toast({ title: "Category updated" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm("Delete this category and all its items?")) return
    setIsLoading(true)
    try {
      await deleteBudgetCategory(categoryId, id)
      toast({ title: "Category deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateItem(categoryId: string, data: any) {
    setIsLoading(true)
    try {
      await createBudgetItem(categoryId, id, new FormData(Object.entries(data)))
      toast({ title: "Item added" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateItem(itemId: string, data: any) {
    setIsLoading(true)
    try {
      await updateBudgetItem(itemId, id, new FormData(Object.entries(data)))
      toast({ title: "Item updated" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return
    setIsLoading(true)
    try {
      await deleteBudgetItem(itemId, id)
      toast({ title: "Item deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    quoted: "bg-blue-100 text-blue-800",
    booked: "bg-green-100 text-green-800",
    paid: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Budget Tracker</h1>
          <p className="text-muted-foreground">Track expenses, manage categories, and stay on budget</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Budget Category</DialogTitle>
            </DialogHeader>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                <FormField control={categoryForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl><Input placeholder="Venue & Rentals" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={categoryForm.control} name="allocated" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allocated Budget ($)</FormLabel>
                    <FormControl><Input type="number" min="0" step="100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Allocated</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600"><DollarSign className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Estimated</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600"><TrendingUp className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100 text-red-600"><DollarSign className="h-6 w-6" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No budget categories yet</p>
              <Button onClick={() => {}}>Create your first category</Button>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              eventId={id}
              onEdit={setEditingCategory}
              onDelete={handleDeleteCategory}
              onAddItem={(data) => handleCreateItem(category.id, data)}
              onEditItem={setEditingItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              isLoading={isLoading}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CategorySection({ category, eventId, onEdit, onDelete, onAddItem, onEditItem, onUpdateItem, onDeleteItem, isLoading }: {
  category: BudgetCategory
  eventId: string
  onEdit: (cat: BudgetCategory) => void
  onDelete: (id: string) => void
  onAddItem: (data: any) => void
  onEditItem: (item: BudgetItem) => void
  onUpdateItem: (id: string, data: any) => void
  onDeleteItem: (id: string) => void
  isLoading: boolean
}) {
  const [showItems, setShowItems] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const progress = category.allocated > 0 ? Math.min((category.spent / category.allocated) * 100, 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowItems(!showItems)}>
              {showItems ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </Button>
            <div>
              <h3 className="font-semibold">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(category.spent)} spent of {formatCurrency(category.allocated)} allocated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-40 h-1.5" />
            <span className="text-sm font-medium w-16 text-right">{Math.round(progress)}%</span>
            <Button variant="ghost" size="icon" onClick={() => onEdit(category)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(category.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      {showItems && (
        <CardContent>
          <div className="space-y-2">
            {category.items.map((item) => (
              <BudgetItemRow
                key={item.id}
                item={item}
                categoryAllocated={category.allocated}
                onEdit={onEditItem}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
              />
            ))}
            {showAddItem ? (
              <AddItemForm onSubmit={onAddItem} onCancel={() => setShowAddItem(false)} />
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddItem(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function BudgetItemRow({ item, categoryAllocated, onEdit, onUpdate, onDelete }: {
  item: BudgetItem
  categoryAllocated: number
  onEdit: (item: BudgetItem) => void
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const itemForm = useForm({ resolver: zodResolver(itemFormSchema), defaultValues: item })

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    quoted: "bg-blue-100 text-blue-800",
    booked: "bg-green-100 text-green-800",
    paid: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  }

  if (isEditing) {
    return (
      <Form {...itemForm}>
        <form onSubmit={itemForm.handleSubmit((data) => { onUpdate(item.id, data); setIsEditing(false) })} className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="grid gap-2 sm:grid-cols-4">
            <FormField control={itemForm.control} name="name" render={({ field }) => <FormControl><Input {...field} placeholder="Item name" /></FormControl>} />
            <FormField control={itemForm.control} name="vendor" render={({ field }) => <FormControl><Input {...field} placeholder="Vendor" /></FormControl>} />
            <FormField control={itemForm.control} name="estimated_cost" render={({ field }) => <FormControl><Input type="number" step="0.01" {...field} placeholder="Est. cost" /></FormControl>} />
            <FormField control={itemForm.control} name="actual_cost" render={({ field }) => <FormControl><Input type="number" step="0.01" {...field} placeholder="Actual cost" /></FormControl>} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <FormField control={itemForm.control} name="status" render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )} />
            <FormField control={itemForm.control} name="notes" render={({ field }) => <FormControl><Input {...field} placeholder="Notes" /></FormControl>} />
            <div className="flex gap-2">
              <Button type="submit" size="sm">Save</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      </Form>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className="flex-1 min-w-0">
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {item.vendor && `${item.vendor} • `}
          Est: {formatCurrency(item.estimated_cost)} • Actual: {formatCurrency(item.actual_cost)}
        </p>
      </div>
      <Badge className={statusColors[item.status] || "bg-gray-100 text-gray-800"}>{item.status}</Badge>
      <Button variant="ghost" size="icon" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
    </div>
  )
}

function AddItemForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const form = useForm({ resolver: zodResolver(itemFormSchema), defaultValues: { name: "", status: "pending" } })
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => { onSubmit(data); onCancel() })} className="space-y-2 p-3 bg-muted/50 rounded-lg">
        <div className="grid gap-2 sm:grid-cols-4">
          <FormField control={form.control} name="name" render={({ field }) => <FormControl><Input {...field} placeholder="Item name" autoFocus /></FormControl>} />
          <FormField control={form.control} name="vendor" render={({ field }) => <FormControl><Input {...field} placeholder="Vendor" /></FormControl>} />
          <FormField control={form.control} name="estimated_cost" render={({ field }) => <FormControl><Input type="number" step="0.01" {...field} placeholder="Est. cost" /></FormControl>} />
          <FormField control={form.control} name="actual_cost" render={({ field }) => <FormControl><Input type="number" step="0.01" {...field} placeholder="Actual cost" /></FormControl>} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <FormField control={form.control} name="status" render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => <FormControl><Input {...field} placeholder="Notes" /></FormControl>} />
          <div className="flex gap-2">
            <Button type="submit" size="sm">Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
