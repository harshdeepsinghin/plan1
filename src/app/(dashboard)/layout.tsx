import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/layout/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  return (
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
  )
}
