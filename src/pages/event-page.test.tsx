import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { EventPage } from './event-page'

const mutate = vi.fn()
const expenseQuery = vi.hoisted(() => ({
  current: {
    isLoading: false,
    isError: false,
    error: null as Error | null,
    data: [] as unknown[] | undefined,
  },
}))

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
      participants: [
        {
          id: 'p-admin',
          profileId: 'admin-id',
          displayName: 'Rama',
          active: true,
          mergedIntoId: null,
        },
        {
          id: 'p-member',
          profileId: 'member-id',
          displayName: 'Pedro',
          active: true,
          mergedIntoId: null,
        },
      ],
      audit: [],
    },
  }),
}))
vi.mock('../features/expenses/expense-queries', () => ({
  useExpenses: () => expenseQuery.current,
  invalidateExpenseQueries: vi.fn(),
  expensesKey: () => ['expenses'],
}))
vi.mock('../features/expenses/expense-service', () => ({ deleteExpense: vi.fn() }))
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
  beforeEach(() => {
    expenseQuery.current = { isLoading: false, isError: false, error: null, data: [] }
  })
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
  it('shows empty and loading expense states', () => {
    expenseQuery.current = {
      isLoading: true,
      isError: false,
      error: null,
      data: undefined,
    }
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('CARGANDO GASTOS…')).toBeInTheDocument()
    expenseQuery.current = { isLoading: false, isError: false, error: null, data: [] }
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Todavía no hay gastos cargados.')).toBeInTheDocument()
    expect(screen.getByText('ESTÁS AL DÍA')).toBeInTheDocument()
  })
  it('shows totals, personal debt, and multiple payer contributions', () => {
    expenseQuery.current = {
      isLoading: false,
      isError: false,
      error: null,
      data: [
        {
          id: 'e',
          concept: 'Cena',
          category: 'food',
          amount: 2000,
          payers: [
            { participantId: 'p-admin', amount: 1000 },
            { participantId: 'p-member', amount: 1000 },
          ],
          participantIds: ['p-admin'],
          createdBy: 'admin-id',
          revision: 1,
          createdAt: 'now',
        },
      ],
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('TENÉS QUE PAGAR $1.000')).toBeInTheDocument()
    expect(screen.getByText(/Rama \$1\.000 · Pedro \$1\.000/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CARGAR GASTO' })).toHaveClass(
      'button-primary',
    )
  })
  it('shows remote and controlled consolidation errors', () => {
    expenseQuery.current = {
      isLoading: false,
      isError: true,
      error: new Error('No pudimos cargar los gastos.'),
      data: undefined,
    }
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('No pudimos cargar los gastos.')).toBeInTheDocument()
    expenseQuery.current = {
      isLoading: false,
      isError: false,
      error: null,
      data: [
        {
          id: 'e',
          concept: 'Cena',
          category: 'food',
          amount: 500,
          payers: [{ participantId: 'missing', amount: 500 }],
          participantIds: ['p-admin'],
          createdBy: 'admin-id',
          revision: 1,
          createdAt: 'now',
        },
      ],
    }
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(
      screen.getByText('No pudimos calcular tu resumen personal.'),
    ).toBeInTheDocument()
  })
})
