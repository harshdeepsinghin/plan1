import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, getCurrentUser } from "@/lib/auth"
import { updateProfile } from "@/actions/auth"
import {
  CURRENCIES,
  DATE_FORMATS,
  DEFAULT_EVENT_TYPES,
  TIMEZONES,
  createFormatters,
  resolvePreferences,
} from "@/lib/preferences"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { PreferencesForm } from "./preferences-form"
import {
  ArrowLeft,
  Mail,
  CalendarDays,
  PartyPopper,
  Save,
  User,
  Settings2,
  Coins,
  Globe2,
  CalendarRange,
  Sparkles,
} from "lucide-react"

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export const metadata = {
  title: "Profile & preferences | plan1",
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) redirect("/auth/login")

  const profile = await getCurrentProfile()
  const preferences = resolvePreferences(profile)
  const { formatDate } = createFormatters(preferences)

  const supabase = await createClient()
  const { count: eventCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const fullName = profile?.full_name || user.user_metadata?.full_name || ""
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || ""
  const initials = (fullName || user.email || "U")
    .split(" ")
    .map((part: string) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Profile & preferences</h1>
        <p className="text-sm text-muted-foreground">
          Manage how you appear and how your plans are displayed.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
          <Avatar className="h-20 w-20">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || "Profile"} /> : null}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{fullName || "Event planner"}</h2>
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1">
                <PartyPopper className="h-3.5 w-3.5" />
                {eventCount || 0} events
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Joined {formatDate(profile?.created_at || user.created_at)}
              </span>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/events/new">Plan an event</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Planning preferences
          </CardTitle>
          <CardDescription>
            Set the defaults used across your plans and exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency" className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  Currency
                </Label>
                <select
                  key={preferences.currency}
                  id="currency"
                  name="currency"
                  defaultValue={preferences.currency}
                  className={selectClassName}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.label}, {currency.symbol})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used for budgets and cost estimates.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Timezone
                </Label>
                <select
                  key={preferences.timezone}
                  id="timezone"
                  name="timezone"
                  defaultValue={preferences.timezone}
                  className={selectClassName}
                >
                  {TIMEZONES.map((timezone) => (
                    <option key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used for timestamps and account dates.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format" className="flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                  Date format
                </Label>
                <select
                  key={preferences.dateFormat}
                  id="date_format"
                  name="date_format"
                  defaultValue={preferences.dateFormat}
                  className={selectClassName}
                >
                  {DATE_FORMATS.map((format) => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used for event dates, milestones, tasks, and exports.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_event_type" className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  Default occasion
                </Label>
                <select
                  key={preferences.defaultEventType}
                  id="default_event_type"
                  name="default_event_type"
                  defaultValue={preferences.defaultEventType}
                  className={selectClassName}
                >
                  {DEFAULT_EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Pre-selected when you create a new event.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              Changing the currency changes labels only. It does not convert amounts you have
              already entered.
            </div>

          </PreferencesForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal details
          </CardTitle>
          <CardDescription>This name appears on shared plans and collaborator lists.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={fullName} placeholder="Alex Morgan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar image URL</Label>
              <Input
                id="avatar_url"
                name="avatar_url"
                type="url"
                defaultValue={avatarUrl}
                placeholder="https://…"
              />
              <p className="text-xs text-muted-foreground">
                Use a Google profile photo URL or any public image.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Email address</Label>
              <Input value={user.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Your email comes from your sign-in provider.
              </p>
            </div>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
