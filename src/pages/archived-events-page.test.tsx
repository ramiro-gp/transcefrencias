import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { ArchivedEventsPage } from './archived-events-page'

const eventList = vi.hoisted(() => ({
  current: [] as Array<{
    id: string
    name: string
    archivedFromStatus: 'loading_expenses' | 'paying'
  }>,
}))

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}))
vi.mock('../features/events/event-queries', () => ({
  useEventList: (_userId: string, scope: string) => ({
    isLoading: false,
    isError: false,
    data: scope === 'archived' ? eventList.current : [],
  }),
}))

describe('ArchivedEventsPage', () => {
  it('shows the exact empty state', () => {
    render(
      <MemoryRouter>
        <ArchivedEventsPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('NO HAY EVENTOS ARCHIVADOS')).toBeInTheDocument()
  })

  it('shows the previous status in Spanish without a table', () => {
    eventList.current = [{ id: 'event-a', name: 'SÁBADO', archivedFromStatus: 'paying' }]
    const { container } = render(
      <MemoryRouter>
        <ArchivedEventsPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('ARCHIVADO · ESTADO ANTERIOR: HORA DE PAGAR'),
    ).toBeInTheDocument()
    expect(container.querySelector('table')).not.toBeInTheDocument()
  })
})
