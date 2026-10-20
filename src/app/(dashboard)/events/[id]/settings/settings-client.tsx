"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateEvent, deleteEvent } from "@/actions/event"
import {
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from "@/actions/collaborator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Settings,
  Users,
  Download,
  Trash2,
  Loader2,
  Save,
  CalendarPlus,
  MapPin,
  FileSpreadsheet,
  FileJson,
  UserPlus,
  Crown,
  ExternalLink,
  AlertTriangle,
  Share2,
  Smartphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePreferences } from "@/components/providers/preferences-provider"

export interface Collaborator {
  id: string
  user_id: string
  role: string
  accepted_at: string | null
  profiles?: {
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface ExportData {
  categories: any[]
  guests: any[]
  milestones: any[]
  vendors: any[]
  tasks: any[]
}

interface Props {
  event: any
  collaborators: Collaborator[]
  exportData: ExportData
  isOwner: boolean
}

function toCsvValue(value: unknown): string {
  const stringValue = value === null || value === undefined ? "" : String(value)
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildIcs(event: any): string {
  const date = String(event.event_date).replace(/-/g, "")
  const next = new Date(event.event_date)
  next.setDate(next.getDate() + 1)
  const endDate = next.toISOString().split("T")[0].replace(/-/g, "")
  const description = `Plan and celebrate ${event.title}. \\n\\nVenue: ${event.venue || "TBC"}\\nGuests: ${event.guest_count || 0}`

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//plan1//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@plan1.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${date}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    event.venue ? `LOCATION:${event.venue.replace(/\n/g, " ")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}

function googleCalendarUrl(event: any): string {
  const date = String(event.event_date).replace(/-/g, "")
  const next = new Date(event.event_date)
  next.setDate(next.getDate() + 1)
  const endDate = next.toISOString().split("T")[0].replace(/-/g, "")
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${date}/${endDate}`,
    details: `Planned with plan1. ${event.venue ? `Venue: ${event.venue}` : ""}`,
    location: event.venue || "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function SettingsClient({ event, collaborators, exportData, isOwner }: Props) {
  const router = useRouter()
  const { formatCurrency, currency } = usePreferences()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave(formData: FormData) {
    setSaving(true)
    try {
      await updateEvent(event.id, formData)
      toast({ title: "Event updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not save changes",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(formData: FormData) {
    setInviting(true)
    try {
      await inviteCollaborator(event.id, formData)
      toast({ title: "Collaborator added" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not add collaborator",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  async function handleRole(collaboratorId: string, role: string) {
    try {
      await updateCollaboratorRole(event.id, collaboratorId, role)
      toast({ title: "Role updated" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not update role",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  async function handleRemove(collaboratorId: string) {
    if (!window.confirm("Remove this collaborator?")) return
    try {
      await removeCollaborator(event.id, collaboratorId)
      toast({ title: "Collaborator removed" })
      router.refresh()
    } catch (error) {
      toast({
        title: "Could not remove collaborator",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Permanently delete "${event.title}"? All budgets, guests, vendors, and tasks will be removed.`
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      await deleteEvent(event.id)
    } catch (error) {
      toast({
        title: "Could not delete event",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      setDeleting(false)
    }
  }

  function exportGuests() {
    const headers = ["name", "email", "phone", "category", "rsvp_status", "plus_one", "dietary_restrictions"]
    const rows = exportData.guests.map((guest) =>
      [
        guest.name,
        guest.email,
        guest.phone,
        guest.category,
        guest.rsvp_status,
        guest.plus_one,
        guest.dietary_restrictions,
      ]
        .map(toCsvValue)
        .join(",")
    )
    downloadFile([headers.join(","), ...rows].join("\n"), `${slug(event.title)}-guests.csv`, "text/csv")
    toast({ title: "Guest CSV downloaded" })
  }

  function exportBudget() {
    const headers = ["category", "expense", "vendor", "estimated", "actual", "status"]
    const rows = exportData.categories.flatMap((category) =>
      (category.budget_items || []).map((item: any) =>
        [
          category.name,
          item.name,
          item.vendor,
          item.estimated_cost,
          item.actual_cost,
          item.status,
        ]
          .map(toCsvValue)
          .join(",")
      )
    )
    downloadFile([headers.join(","), ...rows].join("\n"), `${slug(event.title)}-budget.csv`, "text/csv")
    toast({ title: "Budget CSV downloaded" })
  }

  function exportTimeline() {
    const headers = ["milestone", "due_date", "category", "priority", "completed"]
    const rows = exportData.milestones.map((milestone) =>
      [
        milestone.title,
        milestone.due_date,
        milestone.category,
        milestone.priority,
        milestone.completed,
      ]
        .map(toCsvValue)
        .join(",")
    )
    downloadFile(
      [headers.join(","), ...rows].join("\n"),
      `${slug(event.title)}-timeline.csv`,
      "text/csv"
    )
    toast({ title: "Timeline CSV downloaded" })
  }

  function exportAll() {
    downloadFile(
      JSON.stringify(
        {
          event,
          collaborators,
          ...exportData,
        },
        null,
        2
      ),
      `${slug(event.title)}-plan.json`,
      "application/json"
    )
    toast({ title: "Full plan JSON downloaded" })
  }

  const spent = exportData.categories.reduce(
    (sum, category) =>
      sum +
      (category.budget_items || []).reduce(
        (categorySum: number, item: any) => categorySum + Number(item.actual_cost || 0),
        0
      ),
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6 text-primary" />
          Event settings
        </h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Edit details, invite collaborators, and export your plan."
            : "View event details and export a copy of the plan."}
        </p>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="collaborators">
            Collaborators ({collaborators.length})
          </TabsTrigger>
          <TabsTrigger value="sharing">Sharing & exports</TabsTrigger>
          <TabsTrigger value="danger">Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Event details</CardTitle>
              <CardDescription>
                {isOwner ? "Keep the essentials up to date." : "Only the event owner can change these details."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleSave} className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="settings-title">Event name</Label>
                  <Input
                    id="settings-title"
                    name="title"
                    defaultValue={event.title}
                    required
                    maxLength={100}
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-type">Occasion</Label>
                  <select
                    id="settings-type"
                    name="event_type"
                    defaultValue={event.event_type}
                    disabled={!isOwner}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="community">Community event</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-status">Status</Label>
                  <select
                    id="settings-status"
                    name="status"
                    defaultValue={event.status}
                    disabled={!isOwner}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-date">Event date</Label>
                  <Input
                    id="settings-date"
                    name="event_date"
                    type="date"
                    defaultValue={event.event_date}
                    required
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-venue">Venue</Label>
                  <Input
                    id="settings-venue"
                    name="venue"
                    defaultValue={event.venue || ""}
                    maxLength={200}
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-guests">Guest count</Label>
                  <Input
                    id="settings-guests"
                    name="guest_count"
                    type="number"
                    min={0}
                    defaultValue={event.guest_count || 0}
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-budget">Total budget ({currency})</Label>
                  <Input
                    id="settings-budget"
                    name="budget_total"
                    type="number"
                    min={0}
                    step={100}
                    defaultValue={event.budget_total || 0}
                    disabled={!isOwner}
                  />
                </div>
                <div className="sm:col-span-2">
                  {isOwner ? (
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save changes
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaborators" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collaborators</CardTitle>
              <CardDescription>
                Invite a partner, friend, or planner to help manage this event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOwner ? (
                <form action={handleInvite} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    name="email"
                    type="email"
                    placeholder="planner@example.com"
                    required
                    className="flex-1"
                  />
                  <select
                    name="role"
                    defaultValue="editor"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Invite
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only the event owner can manage collaborators.
                </p>
              )}

              <div className="divide-y rounded-xl border">
                {collaborators.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No collaborators yet.</p>
                ) : (
                  collaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {(collaborator.profiles?.full_name || collaborator.profiles?.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {collaborator.profiles?.full_name || "Planner"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {collaborator.profiles?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {collaborator.accepted_at ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="outline">Invited</Badge>
                        )}
                        {isOwner ? (
                          <>
                            <select
                              value={collaborator.role}
                              onChange={(changeEvent) =>
                                handleRole(collaborator.id, changeEvent.target.value)
                              }
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(collaborator.id)}
                              aria-label="Remove collaborator"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-4 w-4 text-amber-500" />
                Event owner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The owner can edit everything, manage collaborators, and delete the event.
              Editors can update content. Viewers can browse the plan.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                  Google Calendar
                </CardTitle>
                <CardDescription>Add this event to your Google Calendar.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Add to Google Calendar
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => {
                    downloadFile(buildIcs(event), `${slug(event.title)}.ics`, "text/calendar")
                    toast({ title: "Calendar file downloaded" })
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download .ics for Apple / Outlook
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Google Maps
                </CardTitle>
                <CardDescription>Get directions and explore the venue area.</CardDescription>
              </CardHeader>
              <CardContent>
                {event.venue ? (
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Open “{event.venue}”
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a venue in Details to enable Maps directions.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Share2 className="h-4 w-4 text-primary" />
                  Export your plan
                </CardTitle>
                <CardDescription>
                  Download a copy for a spreadsheet, a printed folder, or a co-host.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" onClick={exportGuests} disabled={exportData.guests.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Guest CSV
                </Button>
                <Button variant="outline" onClick={exportBudget} disabled={exportData.categories.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Budget CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={exportTimeline}
                  disabled={exportData.milestones.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Timeline CSV
                </Button>
                <Button variant="outline" onClick={exportAll}>
                  <FileJson className="mr-2 h-4 w-4" />
                  Full plan JSON
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Snapshot label="Guests" value={String(exportData.guests.length)} />
              <Snapshot
                label="Vendors"
                value={`${exportData.vendors.length} (${exportData.vendors.filter((vendor) => vendor.status === "booked").length} booked)`}
              />
              <Snapshot
                label="Tasks"
                value={`${exportData.tasks.filter((task) => task.status === "done").length}/${exportData.tasks.length} done`}
              />
              <Snapshot label="Spent" value={formatCurrency(spent)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete this event
              </CardTitle>
              <CardDescription>
                This permanently removes the event and all of its planning data. This cannot be
                undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting || !isOwner}>
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete event permanently
              </Button>
              {!isOwner ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Only the event owner can delete this event.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  )
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
