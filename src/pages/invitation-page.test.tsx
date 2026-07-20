import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { InvitationPage } from './invitation-page'

const preview = vi.hoisted<{ status: 'archived' | 'paying' }>(() => ({
  status: 'archived',
}))

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ status: 'authenticated', user: { id: 'user-id' } }),
}))
vi.mock('../features/events/event-queries', () => ({
  eventDetailKey: (eventId: string) => ['event', eventId],
  eventListKey: (userId: string) => ['events', userId],
}))
vi.mock('../features/events/event-service', () => ({
  getInvitationPreview: vi.fn(() =>
    Promise.resolve({
      eventId: 'event-id',
      name: 'SÁBADO',
      alreadyMember: false,
      status: preview.status,
    }),
  ),
  joinInvitation: vi.fn(),
}))

describe('InvitationPage', () => {
  it('does not offer joining an archived event', async () => {
    preview.status = 'archived'
    window.history.replaceState({}, '', `/invitacion/invite-id#${'a'.repeat(64)}`)
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/invitacion/invite-id']}>
          <Routes>
            <Route path="/invitacion/:invitationId" element={<InvitationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('EVENTO ARCHIVADO')).toBeInTheDocument()
    expect(screen.getByText('Este evento está en modo solo lectura.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'UNIRME' })).not.toBeInTheDocument()
  })

  it('does not offer joining while the event is ready to pay', async () => {
    preview.status = 'paying'
    window.history.replaceState({}, '', `/invitacion/invite-id#${'b'.repeat(64)}`)
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/invitacion/invite-id']}>
          <Routes>
            <Route path="/invitacion/:invitationId" element={<InvitationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('HORA DE PAGAR')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'UNIRME' })).not.toBeInTheDocument()
  })
})
