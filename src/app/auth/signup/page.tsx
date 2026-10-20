import Link from "next/link"
import SignupForm from "./signup-client"

export const metadata = {
  title: "Create account | EventPlanner",
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            🎉
          </span>
          EventPlanner
        </Link>
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
