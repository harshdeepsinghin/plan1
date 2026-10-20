"use client"

import { useFormStatus } from "react-dom"
import { createEvent } from "@/actions/event"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Sparkles, Wand2 } from "lucide-react"
import { usePreferences } from "@/components/providers/preferences-provider"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Creating your event...
        </>
      ) : (
        <>
          <Wand2 className="mr-2 h-5 w-5" />
          Create event
        </>
      )}
    </Button>
  )
}

export function NewEventForm() {
  const today = new Date().toISOString().split("T")[0]
  const { currency, defaultEventType } = usePreferences()

  return (
    <form action={createEvent} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>
            A few details to get started. You can edit everything later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Event name *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Aisha & Dan's Garden Wedding"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Occasion *</Label>
            <Select name="event_type" defaultValue={defaultEventType} required>
              <SelectTrigger id="event_type">
                <SelectValue placeholder="Choose an occasion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wedding">Wedding</SelectItem>
                <SelectItem value="birthday">Birthday</SelectItem>
                <SelectItem value="community">Community event</SelectItem>
                <SelectItem value="other">Other celebration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Event date *</Label>
            <Input id="event_date" name="event_date" type="date" min={today} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="venue">Venue or location</Label>
            <Input
              id="venue"
              name="venue"
              placeholder="e.g. The Lakeside Pavilion, Austin, TX"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Not sure yet? Leave it blank. You can add it later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_count">Guest count</Label>
            <Input
              id="guest_count"
              name="guest_count"
              type="number"
              min={0}
              defaultValue={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_total">Total budget ({currency})</Label>
            <Input
              id="budget_total"
              name="budget_total"
              type="number"
              min={0}
              step={100}
              defaultValue={10000}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Anything special? (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Cultural traditions, must-haves, colour ideas"
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            After you create the event, <strong className="text-foreground">Google Gemini</strong> will
            draft a theme, a budget split, and a timeline. This can take up to a minute. We&apos;ll
            take you to the planner when it&apos;s ready.
          </p>
        </CardContent>
      </Card>

      <SubmitButton />
    </form>
  )
}
