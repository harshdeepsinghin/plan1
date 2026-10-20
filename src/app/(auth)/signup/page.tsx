import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import SignupPageClient from "./signup-client"

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const params = await searchParams
  return <SignupPageClient initialRedirect={params.redirect} />
}
