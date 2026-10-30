import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthorizationError,
  getEventRole,
  requireEventAccess,
  requireEventEdit,
  requireEventOwner,
  requireUser,
} from './authorization'

vi.mock('server-only', () => ({}))

const state = vi.hoisted(() => ({
  clients: [] as unknown[],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => state.clients.shift()),
}))

interface DbOptions {
  user?: { id: string; email?: string } | null
  authError?: { message: string } | null
  event?: { user_id: string } | null
  collaborator?: { role: string; accepted_at: string | null } | null
}

function createClientMock(options: DbOptions = {}) {
  const maybeSingleEvent = vi.fn(async () => ({ data: options.event ?? null, error: null }))
  const maybeSingleCollaborator = vi.fn(async () => ({
    data: options.collaborator ?? null,
    error: null,
  }))

  const eventBuilder = {
    select: vi.fn(() => eventBuilder),
    eq: vi.fn(() => eventBuilder),
    maybeSingle: maybeSingleEvent,
  }

  const collaboratorBuilder = {
    select: vi.fn(() => collaboratorBuilder),
    eq: vi.fn(() => collaboratorBuilder),
    not: vi.fn(() => collaboratorBuilder),
    maybeSingle: maybeSingleCollaborator,
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user ?? null },
        error: options.authError ?? null,
      })),
    },
    from: vi.fn((table: string) =>
      table === 'events' ? eventBuilder : collaboratorBuilder
    ),
  }
}

function queueClient(options: DbOptions = {}) {
  const client = createClientMock(options)
  state.clients.push(client)
  return client
}

beforeEach(() => {
  state.clients.length = 0
})

describe('requireUser', () => {
  it('returns the authenticated user and client', async () => {
    const client = queueClient({ user: { id: 'user-1', email: 'ada@example.com' } })

    const context = await requireUser()
    expect(context.user).toEqual({ id: 'user-1', email: 'ada@example.com' })
    expect(context.supabase).toBe(client)
  })

  it('throws when the session is missing or expired', async () => {
    queueClient({ user: null })
    await expect(requireUser()).rejects.toBeInstanceOf(AuthorizationError)

    state.clients.length = 0
    queueClient({ user: null, authError: { message: 'expired' } })
    await expect(requireUser()).rejects.toThrow(/session expired/i)
  })
})

describe('getEventRole', () => {
  it('returns owner for the event creator', async () => {
    queueClient({ event: { user_id: 'user-1' } })
    await expect(getEventRole('event-1', 'user-1')).resolves.toBe('owner')
  })

  it('returns null for a missing event', async () => {
    queueClient({ event: null })
    await expect(getEventRole('event-1', 'user-1')).resolves.toBeNull()
  })

  it('returns accepted editor and viewer roles', async () => {
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'editor', accepted_at: '2026-01-01T00:00:00Z' },
    })
    await expect(getEventRole('event-1', 'user-2')).resolves.toBe('editor')

    state.clients.length = 0
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'viewer', accepted_at: '2026-01-01T00:00:00Z' },
    })
    await expect(getEventRole('event-1', 'user-2')).resolves.toBe('viewer')
  })

  it('ignores pending invites and unexpected roles', async () => {
    queueClient({ event: { user_id: 'owner-1' }, collaborator: null })
    await expect(getEventRole('event-1', 'user-2')).resolves.toBeNull()

    state.clients.length = 0
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'admin', accepted_at: '2026-01-01T00:00:00Z' },
    })
    await expect(getEventRole('event-1', 'user-2')).resolves.toBeNull()
  })
})

describe('requireEventAccess', () => {
  it('returns the role for collaborators', async () => {
    queueClient({ user: { id: 'user-2' } })
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'editor', accepted_at: '2026-01-01T00:00:00Z' },
    })

    await expect(requireEventAccess('event-1')).resolves.toMatchObject({ role: 'editor' })
  })

  it('rejects outsiders', async () => {
    queueClient({ user: { id: 'user-2' } })
    queueClient({ event: { user_id: 'owner-1' }, collaborator: null })

    await expect(requireEventAccess('event-1')).rejects.toThrow(/do not have access/i)
  })
})

describe('requireEventEdit', () => {
  it('allows owners and editors', async () => {
    queueClient({ user: { id: 'owner-1' } })
    queueClient({ event: { user_id: 'owner-1' } })
    await expect(requireEventEdit('event-1')).resolves.toMatchObject({ role: 'owner' })

    state.clients.length = 0
    queueClient({ user: { id: 'user-2' } })
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'editor', accepted_at: '2026-01-01T00:00:00Z' },
    })
    await expect(requireEventEdit('event-1')).resolves.toMatchObject({ role: 'editor' })
  })

  it('rejects viewers', async () => {
    queueClient({ user: { id: 'user-2' } })
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'viewer', accepted_at: '2026-01-01T00:00:00Z' },
    })

    await expect(requireEventEdit('event-1')).rejects.toThrow(/owners and editors/i)
  })
})

describe('requireEventOwner', () => {
  it('allows only the owner', async () => {
    queueClient({ user: { id: 'owner-1' } })
    queueClient({ event: { user_id: 'owner-1' } })
    await expect(requireEventOwner('event-1')).resolves.toMatchObject({
      user: { id: 'owner-1' },
    })

    state.clients.length = 0
    queueClient({ user: { id: 'user-2' } })
    queueClient({
      event: { user_id: 'owner-1' },
      collaborator: { role: 'editor', accepted_at: '2026-01-01T00:00:00Z' },
    })
    await expect(requireEventOwner('event-1')).rejects.toThrow(/only the event owner/i)
  })
})
