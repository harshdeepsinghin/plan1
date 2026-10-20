import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewEventForm } from "./new-event-client"

export const metadata = {
  title: "Create an event | EventPlanner",
}

export default function NewEventPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Plan something wonderful</h1>
        <p className="mt-1 text-muted-foreground">
          A few details is all Gemini needs to build your first draft plan.
        </p>
      </div>
      <NewEventForm />
    </div>
  )
}
