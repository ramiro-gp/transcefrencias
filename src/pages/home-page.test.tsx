import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { HomePage } from './home-page'

const eventList = vi.hoisted(() => ({ current: [] as unknown[] }))

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}))

vi.mock('../features/events/event-queries', () => ({
  eventListKey: () => ['events'],
  useEventList: () => ({
    isLoading: false,
    isError: false,
    data: eventList.current,
  }),
}))

describe('HomePage', () => {
  beforeEach(() => {
    eventList.current = []
  })

  it('shows the empty event state and creation form', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'JUNTADAS',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Todavía no participás de ningún evento. Creá uno o abrí un enlace de invitación.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CREAR EVENTO' })).toBeInTheDocument()
    const create = screen.getByRole('button', { name: 'CREAR EVENTO' })
    const archived = screen.getByRole('link', { name: 'VER EVENTOS ARCHIVADOS' })
    expect(archived).toHaveAttribute('href', '/eventos/archivados')
    expect(create.compareDocumentPosition(archived)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(create).toHaveClass('button-primary')
    expect(archived).not.toHaveClass('button-primary')
    expect(
      screen.queryByRole('button', { name: 'CERRAR SESIÓN' }),
    ).not.toBeInTheDocument()
  })

  it('keeps active events separate and places archive access after creation', () => {
    eventList.current = [
      {
        id: 'active-event',
        name: 'SÁBADO',
        status: 'loading_expenses',
        role: 'owner',
      },
    ]
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const active = screen.getByRole('link', { name: /SÁBADO/ })
    const create = screen.getByRole('button', { name: 'CREAR EVENTO' })
    const archived = screen.getByRole('link', { name: 'VER EVENTOS ARCHIVADOS' })
    expect(active.compareDocumentPosition(create)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(create.compareDocumentPosition(archived)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
