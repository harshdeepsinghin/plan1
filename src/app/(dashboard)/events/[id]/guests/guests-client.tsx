"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Users, Download, Upload, Loader2, Search, Filter, Check, X, Minus, Clock } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createGuest, createGuestsBulk, updateGuest, deleteGuest } from "@/actions/guest"
import { guestSchema } from "@/lib/validations/event"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"

interface Guest {
  id: string
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
  params: Promise<{ id: string }>
  initialData: {
    event: any
    guests: Guest[]
  }
}

const formSchema = guestSchema

export function GuestsClient({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [guests, setGuests] = useState<Guest[]>(initialData.guests)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRSVP, setFilterRSVP] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [csvText, setCsvText] = useState("")

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { name: "", rsvp_status: "pending", plus_one: false } })

  const categories = [...new Set(guests.map(g => g.category).filter(Boolean))]
  const filteredGuests = guests.filter(g => 
    (g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     g.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterCategory === "all" || g.category === filterCategory) &&
    (filterRSVP === "all" || g.rsvp_status === filterRSVP)
  )

  const stats = {
    total: guests.length,
    yes: guests.filter(g => g.rsvp_status === "yes").length,
    no: guests.filter(g => g.rsvp_status === "no").length,
    maybe: guests.filter(g => g.rsvp_status === "maybe").length,
    pending: guests.filter(g => g.rsvp_status === "pending").length,
    plusOnes: guests.filter(g => g.plus_one).length,
  }

  async function handleSubmit(data: any) {
    setIsLoading(true)
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, id, new FormData(Object.entries(data)))
        toast({ title: "Guest updated" })
      } else {
        await createGuest(id, new FormData(Object.entries(data)))
        toast({ title: "Guest added" })
      }
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
      setEditingGuest(null)
      form.reset()
    }
  }

  async function handleBulkImport() {
    if (!csvText.trim()) return
    setIsLoading(true)
    try {
      const lines = csvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const nameIdx = headers.indexOf('name')
      const emailIdx = headers.indexOf('email')
      const phoneIdx = headers.indexOf('phone')
      const categoryIdx = headers.indexOf('category')
      const plusOneIdx = headers.indexOf('plus_one')
      const plusOneNameIdx = headers.indexOf('plus_one_name')
      const rsvpIdx = headers.indexOf('rsvp_status')
      const dietaryIdx = headers.indexOf('dietary_restrictions')
      const notesIdx = headers.indexOf('notes')

      if (nameIdx === -1) throw new Error("CSV must have a 'name' column")

      const guestsData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        return {
          name: values[nameIdx],
          email: emailIdx >= 0 ? values[emailIdx] || null : null,
          phone: phoneIdx >= 0 ? values[phoneIdx] || null : null,
          category: categoryIdx >= 0 ? values[categoryIdx] || null : null,
          plus_one: plusOneIdx >= 0 ? values[plusOneIdx].toLowerCase() === 'true' : false,
          plus_one_name: plusOneNameIdx >= 0 ? values[plusOneNameIdx] || null : null,
          rsvp_status: rsvpIdx >= 0 ? values[rsvpIdx] || 'pending' : 'pending',
          dietary_restrictions: dietaryIdx >= 0 ? values[dietaryIdx] || null : null,
          notes: notesIdx >= 0 ? values[notesIdx] || null : null,
        }
      }).filter(g => g.name)

      await createGuestsBulk(id, guestsData)
      toast({ title: `${guestsData.length} guests imported` })
      router.refresh()
      setShowImport(false)
      setCsvText("")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(guestId: string) {
    if (!confirm("Delete this guest?")) return
    try {
      await deleteGuest(guestId, id)
      toast({ title: "Guest deleted" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const rsvpColors: Record<string, string> = {
    yes: "bg-green-100 text-green-800",
    no: "bg-red-100 text-red-800",
    maybe: "bg-yellow-100 text-yellow-800",
    pending: "bg-gray-100 text-gray-800",
  }

  const rsvpIcons: Record<string, React.ReactNode> = {
    yes: <Check className="h-3.5 w-3.5" />,
    no: <X className="h-3.5 w-3.5" />,
    maybe: <Minus className="h-3.5 w-3.5" />,
    pending: <Clock className="h-3.5 w-3.5" />,
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Guest List</h1>
          <p className="text-muted-foreground">Manage invitations, RSVPs, and guest details</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Guests from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="name,email,phone,category,plus_one,plus_one_name,rsvp_status,dietary_restrictions,notes
John Doe,john@email.com,+1555123456,Family,true,Jane Doe,yes,Vegetarian,
Jane Smith,jane@email.com,+1555123457,Friends,false,,pending,None,"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">Required: name. Optional: email, phone, category, plus_one (true/false), plus_one_name, rsvp_status (pending/yes/no/maybe), dietary_restrictions, notes</p>
                <DialogFooter>
                  <Button onClick={handleBulkImport} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Import</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Guest</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="john@email.com" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Family", "Friends", "Colleagues", "VIP", "Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="plus_one" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plus One</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Plus One" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value={false}>No</SelectItem>
                            <SelectItem value={true}>Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="plus_one_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plus One Name</FormLabel>
                        <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="rsvp_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>RSVP Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="maybe">Maybe</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dietary_restrictions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dietary Restrictions</FormLabel>
                      <FormControl><Input placeholder="Vegetarian, nut allergy" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl><Input placeholder="Special notes" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Add Guest</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard title="Total" value={stats.total} icon={Users} color="blue" />
        <StatCard title="Yes" value={stats.yes} icon={Check} color="green" />
        <StatCard title="No" value={stats.no} icon={X} color="red" />
        <StatCard title="Maybe" value={stats.maybe} icon={Minus} color="yellow" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="gray" />
        <StatCard title="Plus Ones" value={stats.plusOnes} icon={Users} color="purple" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterRSVP} onValueChange={setFilterRSVP}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All RSVP" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All RSVP</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="maybe">Maybe</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Guest Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Plus One</TableHead>
                <TableHead>RSVP</TableHead>
                <TableHead>Dietary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No guests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuests.map(guest => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{guest.name}</p>
                        {guest.notes && <p className="text-xs text-muted-foreground">{guest.notes}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guest.category && <Badge variant="secondary">{guest.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {guest.email && <p>{guest.email}</p>}
                        {guest.phone && <p className="text-muted-foreground">{guest.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {guest.plus_one ? (
                        <span className="text-green-600 font-medium">
                          {guest.plus_one_name ? `+ ${guest.plus_one_name}` : "+1"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(rsvpColors[guest.rsvp_status], "flex items-center gap-1")}>
                        {rsvpIcons[guest.rsvp_status]}
                        {guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{guest.dietary_restrictions || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingGuest(guest)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(guest.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-600",
    gray: "bg-gray-100 text-gray-600",
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
