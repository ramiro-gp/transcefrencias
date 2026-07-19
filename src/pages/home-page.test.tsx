import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { HomePage } from './home-page'

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}))

vi.mock('../features/events/event-queries', () => ({
  eventListKey: () => ['events'],
  useEventList: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
}))

describe('HomePage', () => {
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
    expect(
      screen.queryByRole('button', { name: 'CERRAR SESIÓN' }),
    ).not.toBeInTheDocument()
  })
})
