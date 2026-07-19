import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { EventPage } from './event-page'

const mutate = vi.fn()

vi.mock('../app/auth-context', () => ({ useAuth: () => ({ user: { id: 'admin-id' } }) }))
vi.mock('../features/events/event-queries', () => ({
  eventDetailKey: () => ['event'],
  eventListKey: () => ['events'],
  useEventDetail: () => ({
    isLoading: false,
    isError: false,
    data: {
      id: 'event-id',
      name: 'SÁBADO',
      ownerId: 'admin-id',
      role: 'owner',
      members: [
        { profileId: 'admin-id', role: 'owner', fullName: 'Rama', nickname: 'rama' },
        { profileId: 'member-id', role: 'member', fullName: 'Pedro', nickname: null },
      ],
      blockedMembers: [{ profileId: 'blocked-id', displayName: 'Lola' }],
      participants: [],
      audit: [],
    },
  }),
}))
vi.mock('../features/events/event-service', () => ({
  callEventRpc: (...args: unknown[]) => {
    mutate(...args)
    return Promise.resolve()
  },
  createManualParticipant: vi.fn(),
  getEventInvitation: vi.fn(() =>
    Promise.resolve({ invitationId: 'invite-id', token: 'a'.repeat(64) }),
  ),
  renameEvent: vi.fn(),
}))

describe('EventPage', () => {
  it('places invitation first and confirms admin expulsion', () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings.indexOf('INVITACIÓN')).toBeLessThan(headings.indexOf('MIEMBROS'))
    expect(screen.getByRole('button', { name: 'COPIAR INVITACIÓN' })).toHaveClass(
      'invitation-action',
    )
    fireEvent.click(screen.getByRole('button', { name: 'EXPULSAR' }))
    expect(screen.getByRole('heading', { name: 'EXPULSAR A PEDRO' })).toBeInTheDocument()
    expect(screen.getByText(/Pedro perderá el acceso/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'EXPULSAR' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PERMITIR REINGRESO' })).toBeInTheDocument()
  })
})
