"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, Users, Key, Trash2, Mail, Bell, 
  Loader2, Save, Share2, Link2, ExternalLink,
  Calendar, DollarSign, AlertCircle
} from "lucide-react"
import { cn, formatDate, getEventTypeLabel } from "@/lib/utils"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateEvent, deleteEvent } from "@/actions/event"
import { inviteCollaborator, updateCollaboratorRole, removeCollaborator, getCollaborators } from "@/actions/collaborator"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

interface Collaborator {
  id: string
  user_id: string
  role: string
  invited_at: string
  accepted_at: string | null
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  params: Promise<{ id: string }>
  initialData: {
    event: any
    collaborators: Collaborator[]
  }
}

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  event_type: z.enum(["wedding", "birthday", "community", "other"]),
  event_date: z.string().min(1, "Event date is required"),
  venue: z.string().max(200).optional().nullable(),
  guest_count: z.coerce.number().int().min(0).default(0),
  budget_total: z.coerce.number().min(0).default(0),
  status: z.enum(["planning", "active", "completed", "cancelled"]),
})

const collaboratorFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["editor", "viewer"]).default("editor"),
})

export function SettingsClient({ params, initialData }: Props) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>(initialData.collaborators)

  const eventForm = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: initialData.event.title,
      event_type: initialData.event.event_type,
      event_date: initialData.event.event_date,
      venue: initialData.event.venue || "",
      guest_count: initialData.event.guest_count,
      budget_total: initialData.event.budget_total,
      status: initialData.event.status,
    },
  })

  const collaboratorForm = useForm({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: { email: "", role: "editor" },
  })

  async function handleSaveEvent(data: any) {
    setIsSaving(true)
    try {
      await updateEvent(id, new FormData(Object.entries(data)))
      toast({ title: "Event updated" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteEvent() {
    setIsDeleting(true)
    try {
      await deleteEvent(id)
      toast({ title: "Event deleted" })
      router.push("/dashboard")
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
      setIsDeleting(false)
    }
  }

  async function handleInviteCollaborator(data: any) {
    setInviting(true)
    try {
      await inviteCollaborator(id, new FormData(Object.entries(data)))
      toast({ title: "Invitation sent" })
      router.refresh()
      collaboratorForm.reset()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setInviting(false)
    }
  }

  async function handleUpdateRole(collaboratorId: string, role: string) {
    try {
      await updateCollaboratorRole(id, collaboratorId, role)
      toast({ title: "Role updated" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  async function handleRemoveCollaborator(collaboratorId: string) {
    if (!confirm("Remove this collaborator?")) return
    try {
      await removeCollaborator(id, collaboratorId)
      toast({ title: "Collaborator removed" })
      router.refresh()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const copyShareLink = () => {
    const url = `${window.location.origin}/events/${id}/share`
    navigator.clipboard.writeText(url)
    toast({ title: "Share link copied" })
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Event Settings
          </h1>
          <p className="text-muted-foreground">Manage event details, collaborators, and sharing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyShareLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Copy Share Link
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <Form {...eventForm}>
            <form onSubmit={eventForm.handleSubmit(handleSaveEvent)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={eventForm.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl><Input placeholder="Sarah & John's Wedding" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={eventForm.control} name="event_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="wedding">Wedding</SelectItem>
                            <SelectItem value="birthday">Birthday</SelectItem>
                            <SelectItem value="community">Community Event</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={eventForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={eventForm.control} name="event_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={eventForm.control} name="venue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl><Input placeholder="Grand Ballroom, NYC" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget & Guests</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <FormField control={eventForm.control} name="guest_count" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Count</FormLabel>
                      <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={eventForm.control} name="budget_total" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Budget ($)</FormLabel>
                      <FormControl><Input type="number" min="0" step="100" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* Collaborators Tab */}
        <TabsContent value="collaborators" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Collaborators</CardTitle>
                <CardDescription>Invite others to help plan this event</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Mail className="mr-2 h-4 w-4" />
                    Invite Collaborator
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Collaborator</DialogTitle>
                  </DialogHeader>
                  <Form {...collaboratorForm}>
                    <form onSubmit={collaboratorForm.handleSubmit(handleInviteCollaborator)} className="space-y-4">
                      <FormField control={collaboratorForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input type="email" placeholder="friend@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={collaboratorForm.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="editor">Editor (can edit)</SelectItem>
                              <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="submit" disabled={inviting}>
                          {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Send Invitation
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {collaborators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No collaborators yet</p>
                  <p className="text-sm">Invite others to help plan your event</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {collab.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium">{collab.profiles?.full_name || "Unknown User"}</p>
                          <p className="text-sm text-muted-foreground">{collab.profiles?.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={collab.role === "owner" ? "default" : collab.role === "editor" ? "secondary" : "outline"}>
                          {collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                        </Badge>
                        {collab.role !== "owner" && (
                          <Select value={collab.role} onValueChange={(v) => handleUpdateRole(collab.id, v)}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {collab.role !== "owner" && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(collab.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Public Sharing</CardTitle>
              <CardDescription>Generate a read-only link to share your event with guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Public Share Link</p>
                    <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                      {window.location.origin}/events/{id}/share
                    </p>
                  </div>
                  <Button variant="outline" onClick={copyShareLink}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Share Options</h4>
                <label className="flex items-center gap-3">
                  <Switch id="share-enabled" />
                  <div>
                    <p className="font-medium">Enable public sharing</p>
                    <p className="text-sm text-muted-foreground">Anyone with the link can view event details</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <Switch id="show-budget" />
                  <div>
                    <p className="font-medium">Show budget summary</p>
                    <p className="text-sm text-muted-foreground">Include budget overview in shared view</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <Switch id="show-guests" />
                  <div>
                    <p className="font-medium">Show guest count</p>
                    <p className="text-sm text-muted-foreground">Display total guest count (not names)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <Switch id="show-timeline" />
                  <div>
                    <p className="font-medium">Show timeline</p>
                    <p className="text-sm text-muted-foreground">Display key milestones and dates</p>
                  </div>
                </label>
                <label className="flex items-center gap-3">
                  <Switch id="allow-rsvp" />
                  <div>
                    <p className="font-medium">Allow RSVP via link</p>
                    <p className="text-sm text-muted-foreground">Guests can RSVP without an account</p>
                  </div>
                </label>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Export Options</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" />Export PDF Summary</Button>
                  <Button variant="outline"><Calendar className="mr-2 h-4 w-4" />Export iCal</Button>
                  <Button variant="outline"><DollarSign className="mr-2 h-4 w-4" />Export Budget CSV</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger" className="mt-4">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Delete Event</p>
                    <p className="text-sm text-muted-foreground">Permanently delete this event and all associated data (budget, timeline, vendors, guests, tasks, AI ideas). This cannot be undone.</p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Event
                  </Button>
                </div>
              </div>

              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Event Permanently?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete "{initialData.event.title}" and all its data. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteEvent} disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, Delete Forever
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Data Export</h4>
                <p className="text-sm text-muted-foreground mb-4">Download all your event data before deleting</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export All Data (JSON)</Button>
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export Budget (CSV)</Button>
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export Guests (CSV)</Button>
                  <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export Timeline (CSV)</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
