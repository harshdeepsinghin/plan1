import Link from "next/link"
import LoginForm from "./login-client"

export const metadata = {
  title: "Sign in | EventPlanner",
}

interface Props {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            🎉
          </span>
          EventPlanner
        </Link>
        <LoginForm
          initialRedirect={params.redirect}
          initialError={
            params.error === "auth_failed"
              ? "That sign-in link is invalid or expired. Please try again."
              : undefined
          }
        />
        <p className="mt-6 text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
