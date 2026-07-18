import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { HomePage } from './home-page'

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-a' } }),
}))

vi.mock('../features/profile/use-profile-query', () => ({
  useProfileQuery: () => ({
    isLoading: false,
    isError: false,
    data: { id: 'user-a', fullName: 'Ana María', nickname: 'Nani' },
  }),
}))

describe('HomePage', () => {
  it('shows the real private empty state without inventing events', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Hola, Nani.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nani, la gestión de eventos será la próxima función.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'EDITAR PERFIL' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'CERRAR SESIÓN' }),
    ).not.toBeInTheDocument()
  })
})
