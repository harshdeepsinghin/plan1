import Link from "next/link"
import SignupForm from "./signup-client"
import { BrandLogo } from "@/components/brand/logo"

export const metadata = {
  title: "Create account | plan1",
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <BrandLogo
          href="/"
          className="mb-8"
          markClassName="h-11 w-11 rounded-2xl"
          wordmarkClassName="text-2xl"
        />
        <SignupForm />
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
