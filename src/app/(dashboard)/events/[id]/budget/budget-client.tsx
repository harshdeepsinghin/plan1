"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createBudgetCategory,
  deleteBudgetCategory,
  updateBudgetCategory,
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "@/actions/budget"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Wallet,
  TrendingDown,
  Loader2,
  Receipt,
} from "lucide-react"
import { cn, formatCurrency, getStatusColor } from "@/lib/utils"

export interface BudgetItem {
  id: string
  category_id: string
  name: string
  vendor: string | null
  estimated_cost: number | null
  actual_cost: number | null
  status: string
  notes: string | null
}

export interface BudgetCategory {
  id: string
  event_id: string
  name: string
  allocated: number
  spent: number
  sort_order: number
  budget_items: BudgetItem[]
}

interface Props {
  eventId: string
  initialCategories: BudgetCategory[]
  eventBudget: number
}

const ITEM_STATUSES = ["pending", "quoted", "booked", "paid", "cancelled"]

function itemSpent(item: BudgetItem) {
  return Number(item.actual_cost ?? 0)
}

export function BudgetClient({ eventId, initialCategories, eventBudget }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const totalAllocated = initialCategories.reduce(
    (sum, category) => sum + Number(category.allocated || 0),
    0
  )
  const totalSpent = initialCategories.reduce(
    (sum, category) =>
      sum + (category.budget_items || []).reduce((s, item) => s + itemSpent(item), 0),
    0
  )
  const totalEstimated = initialCategories.reduce(
    (sum, category) =>
      sum +
      (category.budget_items || []).reduce(
        (s, item) => s + Number(item.estimated_cost ?? item.actual_cost ?? 0),
        0
      ),
    0
  )
  const remaining = Number(eventBudget || totalAllocated) - totalSpent
  const usedPercent =
    Number(eventBudget) > 0 ? Math.min(100, Math.round((totalSpent / Number(eventBudget)) * 100)) : 0

  async function handleAddCategory(formData: FormData) {
    setPending(true)
    try {
      await createBudgetCategory(eventId, formData)
      setAddCategoryOpen(false)
      toast({ title: "Category added" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add category",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Allocate every dollar and track actual spend by category.
          </p>
        </div>
        <Button onClick={() => setAddCategoryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Event budget"
          value={formatCurrency(Number(eventBudget) || totalAllocated)}
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Allocated"
          value={formatCurrency(totalAllocated)}
          hint={`${initialCategories.length} ${initialCategories.length === 1 ? "category" : "categories"}`}
        />
        <SummaryCard
          icon={<Receipt className="h-5 w-5" />}
          label="Spent"
          value={formatCurrency(totalSpent)}
          hint={`${formatCurrency(totalEstimated)} estimated`}
        />
        <SummaryCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Remaining"
          value={formatCurrency(remaining)}
          tone={remaining < 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Budget used</span>
            <span className="text-muted-foreground">
              {formatCurrency(totalSpent)} of{" "}
              {formatCurrency(Number(eventBudget) || totalAllocated)}
            </span>
          </div>
          <Progress value={usedPercent} className="h-2.5" />
          <p className="text-xs text-muted-foreground">{usedPercent}% of total budget</p>
        </CardContent>
      </Card>

      {initialCategories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold">No budget categories yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first category, or ask the AI Assistant to generate a full breakdown.
              </p>
            </div>
            <Button onClick={() => setAddCategoryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {initialCategories.map((category) => (
            <CategoryCard key={category.id} eventId={eventId} category={category} />
          ))}
        </div>
      )}

      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add budget category</DialogTitle>
            <DialogDescription>
              Group related expenses, like venue, catering, or photography.
            </DialogDescription>
          </DialogHeader>
          <form action={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category name</Label>
              <Input id="category-name" name="name" placeholder="e.g. Catering" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-allocated">Allocated amount</Label>
              <Input
                id="category-allocated"
                name="allocated"
                type="number"
                min={0}
                step={50}
                placeholder="5000"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
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

function CategoryCard({ eventId, category }: { eventId: string; category: BudgetCategory }) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const items = category.budget_items || []
  const spent = items.reduce((sum, item) => sum + itemSpent(item), 0)
  const allocated = Number(category.allocated) || 0
  const percent = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateBudgetCategory(category.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Category updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update category",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleAddItem(formData: FormData) {
    setPending(true)
    try {
      await createBudgetItem(category.id, eventId, formData)
      setAddItemOpen(false)
      toast({ title: "Expense added" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add expense",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${category.name}" and all of its expenses?`)) return
    setDeleting(true)
    try {
      await deleteBudgetCategory(category.id, eventId)
      toast({ title: "Category deleted" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not delete category",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-lg">{category.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(spent)} spent of {formatCurrency(allocated)}
              {allocated > 0 && spent > allocated ? (
                <span className="ml-2 font-medium text-red-600">over budget</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Expense
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit category">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete category"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-600" />}
            </Button>
          </div>
        </div>
        <Progress value={percent} className="mt-3 h-2" />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No expenses in this category yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Estimated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <ItemRow key={item.id} eventId={eventId} item={item} categoryName={category.name} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`name-${category.id}`}>Category name</Label>
              <Input id={`name-${category.id}`} name="name" defaultValue={category.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`allocated-${category.id}`}>Allocated amount</Label>
              <Input
                id={`allocated-${category.id}`}
                name="allocated"
                type="number"
                min={0}
                step={50}
                defaultValue={category.allocated}
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

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense to {category.name}</DialogTitle>
            <DialogDescription>
              Track estimates now and update the actual cost when you book.
            </DialogDescription>
          </DialogHeader>
          <form action={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`item-name-${category.id}`}>Expense name</Label>
              <Input
                id={`item-name-${category.id}`}
                name="name"
                placeholder="e.g. Venue deposit"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`item-vendor-${category.id}`}>Vendor</Label>
                <Input id={`item-vendor-${category.id}`} name="vendor" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item-status-${category.id}`}>Status</Label>
                <select
                  id={`item-status-${category.id}`}
                  name="status"
                  defaultValue="pending"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ITEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item-estimated-${category.id}`}>Estimated cost</Label>
                <Input
                  id={`item-estimated-${category.id}`}
                  name="estimated_cost"
                  type="number"
                  min={0}
                  step={10}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item-actual-${category.id}`}>Actual cost</Label>
                <Input
                  id={`item-actual-${category.id}`}
                  name="actual_cost"
                  type="number"
                  min={0}
                  step={10}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`item-notes-${category.id}`}>Notes</Label>
              <Textarea id={`item-notes-${category.id}`} name="notes" rows={2} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ItemRow({
  eventId,
  item,
  categoryName,
}: {
  eventId: string
  item: BudgetItem
  categoryName: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateBudgetItem(item.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Expense updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update expense",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    try {
      await deleteBudgetItem(item.id, eventId)
      toast({ title: "Expense deleted" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not delete expense",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <p className="font-medium">{item.name}</p>
          {item.notes ? <p className="text-xs text-muted-foreground">{item.notes}</p> : null}
        </TableCell>
        <TableCell className="text-muted-foreground">{item.vendor || "—"}</TableCell>
        <TableCell className="text-right">{formatCurrency(Number(item.estimated_cost) || 0)}</TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(Number(item.actual_cost) || 0)}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={cn("capitalize", getStatusColor(item.status))}>
            {item.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit expense">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete expense">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>{categoryName}</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${item.id}`}>Expense name</Label>
              <Input id={`edit-name-${item.id}`} name="name" defaultValue={item.name} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-vendor-${item.id}`}>Vendor</Label>
                <Input id={`edit-vendor-${item.id}`} name="vendor" defaultValue={item.vendor || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-status-${item.id}`}>Status</Label>
                <select
                  id={`edit-status-${item.id}`}
                  name="status"
                  defaultValue={item.status}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ITEM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-estimated-${item.id}`}>Estimated cost</Label>
                <Input
                  id={`edit-estimated-${item.id}`}
                  name="estimated_cost"
                  type="number"
                  min={0}
                  step={10}
                  defaultValue={item.estimated_cost ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-actual-${item.id}`}>Actual cost</Label>
                <Input
                  id={`edit-actual-${item.id}`}
                  name="actual_cost"
                  type="number"
                  min={0}
                  step={10}
                  defaultValue={item.actual_cost ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-notes-${item.id}`}>Notes</Label>
              <Textarea id={`edit-notes-${item.id}`} name="notes" rows={2} defaultValue={item.notes || ""} />
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
