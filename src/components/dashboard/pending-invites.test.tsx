import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PendingInvites, type PendingInvite } from './pending-invites'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}))

vi.mock('@/components/providers/preferences-provider', () => ({
  usePreferences: () => ({ formatDate: (value: string) => value }),
}))

vi.mock('@/actions/collaborator', () => ({
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}))

import { acceptInvitation, declineInvitation } from '@/actions/collaborator'

const invite: PendingInvite = {
  event_id: 'event-1',
  title: 'Garden party',
  event_date: '2026-12-15',
  role: 'editor',
  invited_at: '2026-10-01T10:00:00Z',
  inviter_name: 'Ada',
}

describe('PendingInvites', () => {
  beforeEach(() => {
    vi.mocked(acceptInvitation).mockResolvedValue(undefined)
    vi.mocked(declineInvitation).mockResolvedValue(undefined)
    mocks.refresh.mockClear()
    mocks.toast.mockClear()
  })

  it('renders nothing when there are no invitations', () => {
    const { container } = render(<PendingInvites invites={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows invitation details and accessible actions', () => {
    render(<PendingInvites invites={[invite]} />)

    expect(screen.getByRole('heading', { name: 'Invitations' })).toBeInTheDocument()
    expect(screen.getByText('Garden party')).toBeInTheDocument()
    expect(screen.getByText(/invited by Ada/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept invitation to Garden party' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Decline invitation to Garden party' })).toBeEnabled()
  })

  it('accepts an invitation', async () => {
    const user = userEvent.setup()
    render(<PendingInvites invites={[invite]} />)

    await user.click(screen.getByRole('button', { name: 'Accept invitation to Garden party' }))

    expect(acceptInvitation).toHaveBeenCalledWith('event-1')
  })

  it('declines an invitation and refreshes the dashboard', async () => {
    const user = userEvent.setup()
    render(<PendingInvites invites={[invite]} />)

    await user.click(screen.getByRole('button', { name: 'Decline invitation to Garden party' }))

    expect(declineInvitation).toHaveBeenCalledWith('event-1')
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Invitation declined' })
  })
})
