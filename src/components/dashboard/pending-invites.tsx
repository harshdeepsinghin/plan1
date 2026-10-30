'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Mail, X } from 'lucide-react'
import { acceptInvitation, declineInvitation } from '@/actions/collaborator'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { usePreferences } from '@/components/providers/preferences-provider'

export interface PendingInvite {
  event_id: string
  title: string
  event_date: string
  role: string
  invited_at: string
  inviter_name: string
}

export function PendingInvites({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const { formatDate } = usePreferences()
  const [busy, setBusy] = useState<string | null>(null)

  if (invites.length === 0) return null

  async function handleAccept(eventId: string) {
    setBusy(eventId)
    try {
      await acceptInvitation(eventId)
    } catch (error) {
      toast({
        title: 'Could not accept the invitation',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
      setBusy(null)
    }
  }

  async function handleDecline(eventId: string) {
    setBusy(eventId)
    try {
      await declineInvitation(eventId)
      toast({ title: 'Invitation declined' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Could not decline the invitation',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="pending-invites-heading" className="space-y-3">
      <div>
        <h2 id="pending-invites-heading" className="text-xl font-semibold">
          Invitations
        </h2>
        <p className="text-sm text-muted-foreground">
          Accept an invitation to open the shared plan.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {invites.map((invite) => {
          const isBusy = busy === invite.event_id
          return (
            <Card key={invite.event_id} className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{invite.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(invite.event_date)} · invited by {invite.inviter_name}
                  </p>
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {invite.role}
                  </Badge>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite.event_id)}
                    disabled={isBusy}
                    aria-label={`Accept invitation to ${invite.title}`}
                  >
                    {isBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invite.event_id)}
                    disabled={isBusy}
                    aria-label={`Decline invitation to ${invite.title}`}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        Invitations are delivered in the app. No email is sent by this build.
      </p>
    </section>
  )
}
