"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  createGuest,
  createGuestsBulk,
  deleteGuest,
  updateGuest,
  updateGuestRsvp,
} from "@/actions/guest"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  Users,
  UserCheck,
  Clock,
  UtensilsCrossed,
  Loader2,
  Heart,
} from "lucide-react"
import { cn, formatDate, getStatusColor } from "@/lib/utils"

export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  category: string | null
  plus_one: boolean
  plus_one_name: string | null
  rsvp_status: string
  dietary_restrictions: string | null
  notes: string | null
  created_at: string
}

interface Props {
  eventId: string
  initialGuests: Guest[]
}

const RSVP_OPTIONS = ["pending", "yes", "no", "maybe"]

function toCsvValue(value: unknown): string {
  const stringValue = value === null || value === undefined ? "" : String(value)
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char === "\r") {
      // ignore, handled by \n
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ""))
}

export function GuestsClient({ eventId, initialGuests }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [importing, setImporting] = useState(false)
  const [query, setQuery] = useState("")
  const [rsvpFilter, setRsvpFilter] = useState("all")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const attending = initialGuests.filter((guest) => guest.rsvp_status === "yes")
  const pendingInvites = initialGuests.filter((guest) => guest.rsvp_status === "pending")
  const declined = initialGuests.filter((guest) => guest.rsvp_status === "no")
  const plusOnes = initialGuests.filter((guest) => guest.plus_one).length
  const headcount =
    attending.length + attending.filter((guest) => guest.plus_one).length

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return initialGuests.filter((guest) => {
      if (rsvpFilter !== "all" && guest.rsvp_status !== rsvpFilter) return false
      if (!normalized) return true
      return [guest.name, guest.email, guest.phone, guest.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    })
  }, [initialGuests, query, rsvpFilter])

  async function handleCreate(formData: FormData) {
    setPending(true)
    try {
      await createGuest(eventId, formData)
      setAddOpen(false)
      toast({ title: "Guest added" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add guest",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleRsvp(guestId: string, status: string) {
    try {
      await updateGuestRsvp(guestId, eventId, status)
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update RSVP",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  function exportCsv() {
    const headers = [
      "name",
      "email",
      "phone",
      "category",
      "rsvp_status",
      "plus_one",
      "plus_one_name",
      "dietary_restrictions",
      "notes",
    ]
    const lines = [
      headers.join(","),
      ...initialGuests.map((guest) =>
        [
          guest.name,
          guest.email,
          guest.phone,
          guest.category,
          guest.rsvp_status,
          guest.plus_one,
          guest.plus_one_name,
          guest.dietary_restrictions,
          guest.notes,
        ]
          .map(toCsvValue)
          .join(",")
      ),
    ]

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `guest-list-${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast({ title: "Guest list exported" })
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length < 2) throw new Error("The CSV appears to be empty")

      const headers = rows[0].map((header) => header.trim().toLowerCase())
      const nameIndex = headers.indexOf("name")
      if (nameIndex === -1) throw new Error('CSV must include a "name" column')

      const guests = rows.slice(1).map((row) => {
        const get = (key: string) => {
          const index = headers.indexOf(key)
          return index === -1 ? "" : (row[index] || "").trim()
        }

        const plusOneValue = get("plus_one").toLowerCase()
        return {
          name: row[nameIndex]?.trim() || "",
          email: get("email") || null,
          phone: get("phone") || null,
          category: get("category") || null,
          plus_one: ["true", "yes", "1", "y"].includes(plusOneValue),
          plus_one_name: get("plus_one_name") || null,
          rsvp_status: RSVP_OPTIONS.includes(get("rsvp_status").toLowerCase())
            ? get("rsvp_status").toLowerCase()
            : "pending",
          dietary_restrictions: get("dietary_restrictions") || null,
          notes: get("notes") || null,
        }
      })

      await createGuestsBulk(eventId, guests)
      toast({ title: `${guests.length} guests imported` })
      router.refresh()
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Please check your CSV",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guests</h1>
          <p className="text-sm text-muted-foreground">
            Manage invitations, RSVPs, plus-ones, and dietary needs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={initialGuests.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add guest
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Invited" value={String(initialGuests.length)} />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Attending"
          value={String(headcount)}
          hint={`${attending.length} RSVPs + ${headcount - attending.length} plus-ones`}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Awaiting reply"
          value={String(pendingInvites.length)}
          hint={`${declined.length} declined`}
        />
        <StatCard
          icon={<UtensilsCrossed className="h-5 w-5" />}
          label="Dietary notes"
          value={String(initialGuests.filter((guest) => guest.dietary_restrictions).length)}
          hint={`${plusOnes} plus-ones`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guests…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={rsvpFilter}
          onChange={(event) => setRsvpFilter(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
          aria-label="Filter by RSVP"
        >
          <option value="all">All RSVPs</option>
          <option value="yes">Attending</option>
          <option value="pending">Pending</option>
          <option value="maybe">Maybe</option>
          <option value="no">Declined</option>
        </select>
      </div>

      {initialGuests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold">No guests yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add guests one by one or import a CSV list in seconds.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add guest
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>RSVP</TableHead>
                  <TableHead>Plus one</TableHead>
                  <TableHead>Dietary needs</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((guest) => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    eventId={eventId}
                    onRsvp={handleRsvp}
                  />
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No guests match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a guest</DialogTitle>
            <DialogDescription>They&apos;ll show up in your guest list right away.</DialogDescription>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Full name</Label>
              <Input id="guest-name" name="name" placeholder="e.g. Jamie Rivera" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guest-email">Email</Label>
                <Input id="guest-email" name="email" type="email" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone</Label>
                <Input id="guest-phone" name="phone" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-category">Group</Label>
                <Input id="guest-category" name="category" placeholder="e.g. Family, Work" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-rsvp">RSVP</Label>
                <select
                  id="guest-rsvp"
                  name="rsvp_status"
                  defaultValue="pending"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  {RSVP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="hidden" name="plus_one" value="false" />
              <input
                id="guest-plus-one"
                name="plus_one"
                type="checkbox"
                value="true"
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="guest-plus-one" className="font-normal">
                Bringing a plus one
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-plus-one-name">Plus one name</Label>
              <Input id="guest-plus-one-name" name="plus_one_name" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-dietary">Dietary restrictions</Label>
              <Input id="guest-dietary" name="dietary_restrictions" placeholder="e.g. Vegetarian, nut allergy" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-notes">Notes</Label>
              <Textarea id="guest-notes" name="notes" rows={2} placeholder="Optional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add guest
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

function GuestRow({
  guest,
  eventId,
  onRsvp,
}: {
  guest: Guest
  eventId: string
  onRsvp: (guestId: string, status: string) => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleUpdate(formData: FormData) {
    setPending(true)
    try {
      await updateGuest(guest.id, eventId, formData)
      setEditOpen(false)
      toast({ title: "Guest updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update guest",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove ${guest.name} from the guest list?`)) return
    try {
      await deleteGuest(guest.id, eventId)
      toast({ title: "Guest removed" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not remove guest",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {guest.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{guest.name}</p>
              {guest.email ? (
                <p className="truncate text-xs text-muted-foreground">{guest.email}</p>
              ) : null}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">{guest.category || "—"}</TableCell>
        <TableCell>
          <select
            value={guest.rsvp_status}
            onChange={(event) => onRsvp(guest.id, event.target.value)}
            className={cn(
              "h-8 rounded-full border-0 px-2 text-xs font-medium capitalize outline-none",
              getStatusColor(guest.rsvp_status)
            )}
            aria-label={`RSVP status for ${guest.name}`}
          >
            {RSVP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell>
          {guest.plus_one ? (
            <span className="flex items-center gap-1 text-sm">
              <Heart className="h-3.5 w-3.5 text-rose-500" />
              {guest.plus_one_name || "Plus one"}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-[200px]">
          {guest.dietary_restrictions ? (
            <Badge variant="secondary" className="whitespace-normal text-left">
              {guest.dietary_restrictions}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit guest">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete guest">
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit guest</DialogTitle>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`guest-name-${guest.id}`}>Full name</Label>
              <Input
                id={`guest-name-${guest.id}`}
                name="name"
                defaultValue={guest.name}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`guest-email-${guest.id}`}>Email</Label>
                <Input
                  id={`guest-email-${guest.id}`}
                  name="email"
                  type="email"
                  defaultValue={guest.email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`guest-phone-${guest.id}`}>Phone</Label>
                <Input id={`guest-phone-${guest.id}`} name="phone" defaultValue={guest.phone || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`guest-category-${guest.id}`}>Group</Label>
                <Input
                  id={`guest-category-${guest.id}`}
                  name="category"
                  defaultValue={guest.category || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`guest-rsvp-${guest.id}`}>RSVP</Label>
                <select
                  id={`guest-rsvp-${guest.id}`}
                  name="rsvp_status"
                  defaultValue={guest.rsvp_status}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                >
                  {RSVP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="hidden" name="plus_one" value="false" />
              <input
                id={`guest-plus-one-${guest.id}`}
                name="plus_one"
                type="checkbox"
                value="true"
                defaultChecked={guest.plus_one}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor={`guest-plus-one-${guest.id}`} className="font-normal">
                Bringing a plus one
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guest-plus-one-name-${guest.id}`}>Plus one name</Label>
              <Input
                id={`guest-plus-one-name-${guest.id}`}
                name="plus_one_name"
                defaultValue={guest.plus_one_name || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guest-dietary-${guest.id}`}>Dietary restrictions</Label>
              <Input
                id={`guest-dietary-${guest.id}`}
                name="dietary_restrictions"
                defaultValue={guest.dietary_restrictions || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`guest-notes-${guest.id}`}>Notes</Label>
              <Textarea
                id={`guest-notes-${guest.id}`}
                name="notes"
                rows={2}
                defaultValue={guest.notes || ""}
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
