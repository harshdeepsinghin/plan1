import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import LoginPageClient from "./login-client"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const params = await searchParams
  return <LoginPageClient initialRedirect={params.redirect} />
}
