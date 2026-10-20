import { redirect } from "next/navigation"
import { getCurrentProfile, getCurrentUser } from "@/lib/auth"
import { resolvePreferences } from "@/lib/preferences"
import { DashboardHeader } from "@/components/layout/header"
import { PreferencesProvider } from "@/components/providers/preferences-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) redirect("/auth/login")

  const profile = await getCurrentProfile()
  const preferences = resolvePreferences(profile)

  return (
    <PreferencesProvider value={preferences}>
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader
          user={{
            email: user.email || "",
            fullName: profile?.full_name || user.user_metadata?.full_name || null,
            avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
          }}
        />
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">{children}</main>
      </div>
    </PreferencesProvider>
  )
}
