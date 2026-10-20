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
  createVendor,
  deleteVendor,
  updateVendor,
  updateVendorStatus,
} from "@/actions/vendor"
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
  Star,
  Mail,
  Phone,
  Globe,
  Loader2,
  Truck,
  DollarSign,
  BookmarkCheck,
  Search,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"

export interface Vendor {
  id: string
  event_id: string
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
  sort_order: number
}

interface Props {
  eventId: string
  initialVendors: Vendor[]
}

const COLUMNS = [
  { id: "researching", label: "Researching", accent: "bg-slate-400" },
  { id: "contacted", label: "Contacted", accent: "bg-blue-500" },
  { id: "quoted", label: "Quoted", accent: "bg-violet-500" },
  { id: "negotiating", label: "Negotiating", accent: "bg-amber-500" },
  { id: "booked", label: "Booked", accent: "bg-emerald-500" },
  { id: "rejected", label: "Rejected", accent: "bg-rose-400" },
]

const CATEGORY_SUGGESTIONS = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Florist",
  "DJ / Music",
  "Cake",
  "Decor",
  "Makeup",
  "Transport",
]

export function VendorsClient({ eventId, initialVendors }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [query, setQuery] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const filteredVendors = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return initialVendors
    return initialVendors.filter((vendor) =>
      [vendor.name, vendor.category, vendor.contact_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    )
  }, [initialVendors, query])

  const booked = initialVendors.filter((vendor) => vendor.status === "booked")
  const committed = booked.reduce((sum, vendor) => sum + Number(vendor.quote_amount || 0), 0)
  const quoted = initialVendors
    .filter((vendor) => ["quoted", "negotiating", "booked"].includes(vendor.status))
    .reduce((sum, vendor) => sum + Number(vendor.quote_amount || 0), 0)

  const activeVendor = initialVendors.find((vendor) => vendor.id === activeId) || null

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createVendor(eventId, formData)
      setAddOpen(false)
      toast({ title: "Vendor added" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add vendor",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleStatusChange(vendorId: string, status: string) {
    try {
      await updateVendorStatus(vendorId, eventId, status)
      toast({ title: `Moved to ${status}` })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update vendor",
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
    const vendor = initialVendors.find((item) => item.id === String(event.active.id))
    if (vendor && COLUMNS.some((column) => column.id === columnId) && vendor.status !== columnId) {
      handleStatusChange(vendor.id, columnId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            Track every supplier from first enquiry to booked. Drag cards between stages.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add vendor
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Truck className="h-5 w-5" />} label="Vendors" value={String(initialVendors.length)} />
        <StatCard
          icon={<BookmarkCheck className="h-5 w-5" />}
          label="Booked"
          value={`${booked.length} / ${initialVendors.length}`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Committed"
          value={formatCurrency(committed)}
          hint={`${formatCurrency(quoted)} quoted`}
        />
        <StatCard
          icon={<Search className="h-5 w-5" />}
          label="Still deciding"
          value={String(
            initialVendors.filter((vendor) =>
              ["researching", "contacted", "quoted", "negotiating"].includes(vendor.status)
            ).length
          )}
        />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {COLUMNS.map((column) => (
            <VendorColumn
              key={column.id}
              column={column}
              eventId={eventId}
              vendors={filteredVendors.filter((vendor) => vendor.status === column.id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
        <DragOverlay>
          {activeVendor ? <VendorCardPreview vendor={activeVendor} /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a vendor</DialogTitle>
            <DialogDescription>Keep quotes, contacts, and status in one place.</DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Vendor name</Label>
                <Input id="vendor-name" name="name" placeholder="e.g. Bloom & Co." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-category">Category</Label>
                <Input
                  id="vendor-category"
                  name="category"
                  list="vendor-categories"
                  placeholder="e.g. Florist"
                  required
                />
                <datalist id="vendor-categories">
                  {CATEGORY_SUGGESTIONS.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-contact">Contact person</Label>
                <Input id="vendor-contact" name="contact_name" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-status">Status</Label>
                <select
                  id="vendor-status"
                  name="status"
                  defaultValue="researching"
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
                <Label htmlFor="vendor-email">Email</Label>
                <Input id="vendor-email" name="email" type="email" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input id="vendor-phone" name="phone" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-website">Website</Label>
                <Input id="vendor-website" name="website" placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-quote">Quote (USD)</Label>
                <Input id="vendor-quote" name="quote_amount" type="number" min={0} step={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-rating">Rating (1–5)</Label>
                <Input id="vendor-rating" name="rating" type="number" min={1} max={5} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-notes">Notes</Label>
              <Textarea id="vendor-notes" name="notes" rows={3} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add vendor
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
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

function VendorColumn({
  column,
  eventId,
  vendors,
  onStatusChange,
}: {
  column: { id: string; label: string; accent: string }
  eventId: string
  vendors: Vendor[]
  onStatusChange: (vendorId: string, status: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[220px] flex-col rounded-2xl border bg-muted/40 p-3 transition-colors",
        isOver && "border-primary bg-primary/5"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", column.accent)} />
          <span className="text-sm font-semibold">{column.label}</span>
        </div>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {vendors.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {vendors.map((vendor) => (
          <VendorCard
            key={vendor.id}
            vendor={vendor}
            eventId={eventId}
            onStatusChange={onStatusChange}
          />
        ))}
        {vendors.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Drop vendors here
          </div>
        ) : null}
      </div>
    </div>
  )
}

function VendorCard({
  vendor,
  eventId,
  onStatusChange,
}: {
  vendor: Vendor
  eventId: string
  onStatusChange: (vendorId: string, status: string) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: vendor.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateVendor(vendor.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Vendor updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update vendor",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${vendor.name}"?`)) return
    try {
      await deleteVendor(vendor.id, eventId)
      toast({ title: "Vendor deleted" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not delete vendor",
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
          "group bg-card shadow-sm transition-shadow hover:shadow-md",
          isDragging && "opacity-40"
        )}
      >
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{vendor.name}</p>
              <p className="truncate text-xs text-muted-foreground">{vendor.category}</p>
            </div>
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
              aria-label="Drag vendor"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>

          {vendor.rating ? (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={cn(
                    "h-3 w-3",
                    index < Number(vendor.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          ) : null}

          {vendor.quote_amount ? (
            <p className="text-sm font-medium">{formatCurrency(Number(vendor.quote_amount))}</p>
          ) : null}

          <div className="space-y-1 text-xs text-muted-foreground">
            {vendor.contact_name ? <p className="truncate">{vendor.contact_name}</p> : null}
            {vendor.email ? (
              <a
                href={`mailto:${vendor.email}`}
                className="flex items-center gap-1 truncate hover:text-foreground"
              >
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{vendor.email}</span>
              </a>
            ) : null}
            {vendor.phone ? (
              <a
                href={`tel:${vendor.phone}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="h-3 w-3 shrink-0" />
                {vendor.phone}
              </a>
            ) : null}
            {vendor.website ? (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate hover:text-foreground"
              >
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">Website</span>
              </a>
            ) : null}
          </div>

          {vendor.notes ? (
            <p className="line-clamp-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
              {vendor.notes}
            </p>
          ) : null}

          <div className="flex items-center justify-between border-t pt-2">
            <select
              value={vendor.status}
              onChange={(event) => onStatusChange(vendor.id, event.target.value)}
              className="h-7 rounded-md border border-input bg-background px-1 text-xs capitalize"
              aria-label="Vendor status"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit vendor</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`name-${vendor.id}`}>Vendor name</Label>
                <Input id={`name-${vendor.id}`} name="name" defaultValue={vendor.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`category-${vendor.id}`}>Category</Label>
                <Input
                  id={`category-${vendor.id}`}
                  name="category"
                  defaultValue={vendor.category}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`contact-${vendor.id}`}>Contact person</Label>
                <Input
                  id={`contact-${vendor.id}`}
                  name="contact_name"
                  defaultValue={vendor.contact_name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`status-${vendor.id}`}>Status</Label>
                <select
                  id={`status-${vendor.id}`}
                  name="status"
                  defaultValue={vendor.status}
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
                <Label htmlFor={`email-${vendor.id}`}>Email</Label>
                <Input
                  id={`email-${vendor.id}`}
                  name="email"
                  type="email"
                  defaultValue={vendor.email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`phone-${vendor.id}`}>Phone</Label>
                <Input id={`phone-${vendor.id}`} name="phone" defaultValue={vendor.phone || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`website-${vendor.id}`}>Website</Label>
                <Input
                  id={`website-${vendor.id}`}
                  name="website"
                  defaultValue={vendor.website || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`quote-${vendor.id}`}>Quote (USD)</Label>
                <Input
                  id={`quote-${vendor.id}`}
                  name="quote_amount"
                  type="number"
                  min={0}
                  step={10}
                  defaultValue={vendor.quote_amount ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`rating-${vendor.id}`}>Rating (1–5)</Label>
                <Input
                  id={`rating-${vendor.id}`}
                  name="rating"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={vendor.rating ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`notes-${vendor.id}`}>Notes</Label>
              <Textarea
                id={`notes-${vendor.id}`}
                name="notes"
                rows={3}
                defaultValue={vendor.notes || ""}
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

function VendorCardPreview({ vendor }: { vendor: Vendor }) {
  return (
    <div className="w-64 rotate-2 rounded-xl border bg-card p-3 shadow-2xl">
      <p className="text-sm font-semibold">{vendor.name}</p>
      <p className="text-xs text-muted-foreground">{vendor.category}</p>
      {vendor.quote_amount ? (
        <p className="mt-2 text-sm font-medium">{formatCurrency(Number(vendor.quote_amount))}</p>
      ) : null}
    </div>
  )
}
