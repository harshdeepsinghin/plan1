import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { updateProfile } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Mail, CalendarDays, PartyPopper, Save, User } from "lucide-react"
import { formatDate } from "@/lib/utils"

export const metadata = {
  title: "Profile | EventPlanner",
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const [{ data: profile }, { count: eventCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("events").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ])

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
        <h1 className="text-2xl font-bold tracking-tight">Profile & account</h1>
        <p className="text-sm text-muted-foreground">
          Manage how you appear across your event plans.
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
                Your email is managed by your sign-in provider (Google or Supabase Auth).
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
