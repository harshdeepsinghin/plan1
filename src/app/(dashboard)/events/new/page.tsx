import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewEventForm } from "./new-event-client"

export const metadata = {
  title: "Create an event | plan1",
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
        <h1 className="text-3xl font-bold tracking-tight">Create a new event</h1>
        <p className="mt-1 text-muted-foreground">
          Add the basics. Gemini will prepare a first draft you can edit.
        </p>
      </div>
      <NewEventForm />
    </div>
  )
}
