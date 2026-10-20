"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { updatePreferences, type UpdatePreferencesState } from "@/actions/preferences"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Save } from "lucide-react"

export function PreferencesForm({ children }: { children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState<UpdatePreferencesState | null, FormData>(
    updatePreferences,
    null
  )
  const router = useRouter()
  const { toast } = useToast()
  const lastSavedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!state?.ok || !state.savedAt || state.savedAt === lastSavedAt.current) return

    lastSavedAt.current = state.savedAt
    toast({
      title: "Preferences saved",
      description: "Your display preferences have been updated.",
    })
    router.refresh()
  }, [router, state, toast])

  return (
    <form action={formAction} className="space-y-5">
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save preferences
          </>
        )}
      </Button>
    </form>
  )
}
