import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { EventPage } from './event-page'

const mutate = vi.fn()
const transitionToPaying = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      status: 'paying',
      revision: 5,
      archivedAt: null,
      archivedFromStatus: null,
    }),
  ),
)
const expenseQuery = vi.hoisted(() => ({
  current: {
    isLoading: false,
    isError: false,
    error: null as Error | null,
    data: [] as unknown[] | undefined,
  },
}))
const eventQuery = vi.hoisted<{
  current: {
    status: 'loading_expenses' | 'paying' | 'archived'
    revision: number
    archivedAt: string | null
    archivedFromStatus: 'loading_expenses' | 'paying' | null
    role: 'owner' | 'coadmin' | 'member'
  }
}>(() => ({
  current: {
    status: 'loading_expenses',
    revision: 4,
    archivedAt: null,
    archivedFromStatus: null,
    role: 'owner',
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
      ...eventQuery.current,
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
vi.mock('../features/settlement/settlement-view', () => ({
  SettlementView: () => <div>LIQUIDACIÓN VISIBLE</div>,
}))
vi.mock('../features/events/event-service', () => ({
  archiveEvent: vi.fn(() => Promise.resolve()),
  callEventRpc: (...args: unknown[]) => {
    mutate(...args)
    return Promise.resolve()
  },
  createManualParticipant: vi.fn(),
  getEventInvitation: vi.fn(() =>
    Promise.resolve({ invitationId: 'invite-id', token: 'a'.repeat(64) }),
  ),
  renameEvent: vi.fn(),
  reopenEventExpenses: vi.fn(() => Promise.resolve()),
  restoreEvent: vi.fn(() => Promise.resolve()),
  transitionEventToPaying: transitionToPaying,
}))

describe('EventPage', () => {
  beforeEach(() => {
    expenseQuery.current = { isLoading: false, isError: false, error: null, data: [] }
    eventQuery.current = {
      status: 'loading_expenses',
      revision: 4,
      archivedAt: null,
      archivedFromStatus: null,
      role: 'owner',
    }
    transitionToPaying.mockClear()
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
    const divideCopy = screen.getByText(
      'Cuando hayan cargado todos los gastos, dividilos para calcular quién le paga a quién.',
    )
    const divide = screen.getByRole('button', { name: 'DIVIDIR GASTOS' })
    expect(divideCopy.nextElementSibling).toBe(divide)
    expect(divide).toHaveClass('button-primary', 'button-wide')
    expect(screen.queryByText('TODOS LOS GASTOS FUERON CARGADOS')).not.toBeInTheDocument()
    const rename = screen.getByText('NOMBRE DEL EVENTO').closest('form')
    const people = screen.getByRole('heading', { name: 'PERSONAS' })
    const history = screen.getByRole('heading', { name: 'HISTORIAL' })
    expect(people.compareDocumentPosition(rename!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(rename!.compareDocumentPosition(history)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    const archive = screen.getByRole('button', { name: 'ARCHIVAR EVENTO' })
    expect(
      history.closest('section')!.compareDocumentPosition(archive.closest('section')!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    fireEvent.click(screen.getByRole('button', { name: 'EXPULSAR' }))
    expect(screen.getByRole('heading', { name: 'EXPULSAR A PEDRO' })).toBeInTheDocument()
    expect(screen.getByText(/Pedro perderá el acceso/)).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'EXPULSAR' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PERMITIR REINGRESO' })).toBeInTheDocument()
    fireEvent.click(archive)
    expect(screen.getByRole('heading', { name: 'ARCHIVAR EVENTO' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'El evento quedará en modo solo lectura y dejará de aparecer entre tus eventos activos. Podrás restaurarlo cuando quieras.',
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'ARCHIVAR' }),
    ).toBeInTheDocument()
  })

  it('keeps the paying mutation behind the new divide expenses copy', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'DIVIDIR GASTOS' }))
    expect(screen.getByRole('heading', { name: 'DIVIDIR GASTOS' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Se dividirán los gastos cargados y se mostrarán los saldos y quién le paga a quién. Podrás reabrir la carga si necesitás corregir algo.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'DIVIDIR GASTOS',
      }),
    )

    await waitFor(() =>
      expect(transitionToPaying).toHaveBeenCalledWith(expect.anything(), 'event-id', 4),
    )
  })

  it('hides archive and divide actions from members', () => {
    eventQuery.current.role = 'member'
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.queryByRole('button', { name: 'ARCHIVAR EVENTO' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'DIVIDIR GASTOS' }),
    ).not.toBeInTheDocument()
  })

  it('shows the divide explanation only while loading expenses', () => {
    eventQuery.current.status = 'paying'
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id']}>
          <Routes>
            <Route path="/eventos/:eventId" element={<EventPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.queryByText(
        'Cuando hayan cargado todos los gastos, dividilos para calcular quién le paga a quién.',
      ),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'DIVIDIR GASTOS' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('HORA DE PAGAR')).toBeInTheDocument()
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
    const createExpense = screen.getByRole('link', { name: 'CARGAR GASTO' })
    const expenseContent = createExpense.closest('.expense-content')
    expect(expenseContent?.firstElementChild).toBe(createExpense)
    expect(screen.getByText('CARGANDO GASTOS…').parentElement).toBe(expenseContent)
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
    expect(screen.getByText('Todavía no hay gastos cargados.').parentElement).toBe(
      screen.getByRole('link', { name: 'CARGAR GASTO' }).closest('.expense-content'),
    )
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
      'button-wide',
      'expense-create-action',
    )
    const createExpense = screen.getByRole('link', { name: 'CARGAR GASTO' })
    const expenseList = createExpense
      .closest('.expense-content')
      ?.querySelector('.expense-list')
    expect(createExpense.nextElementSibling).toBe(expenseList)
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
  it('renders an archived event read-only and offers restoration to its previous state', () => {
    eventQuery.current = {
      status: 'archived',
      revision: 8,
      archivedAt: '2026-07-20T10:00:00Z',
      archivedFromStatus: 'paying',
      role: 'owner',
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

    expect(screen.getByText('EVENTO ARCHIVADO')).toBeInTheDocument()
    expect(screen.getByText('Este evento está en modo solo lectura.')).toBeInTheDocument()
    expect(screen.getByText('LIQUIDACIÓN VISIBLE')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'CARGAR GASTO' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'INVITACIÓN' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'HACER COADMIN' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'RENOMBRAR' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'RESTAURAR EVENTO' }))
    expect(screen.getByRole('heading', { name: 'RESTAURAR EVENTO' })).toBeInTheDocument()
    expect(screen.getByText('El evento volverá a HORA DE PAGAR.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'RESTAURAR' }),
    ).toBeInTheDocument()
  })

  it('restores an archived loading event to loading expenses', () => {
    eventQuery.current = {
      status: 'archived',
      revision: 9,
      archivedAt: '2026-07-20T11:00:00Z',
      archivedFromStatus: 'loading_expenses',
      role: 'owner',
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

    expect(screen.getByText('LIQUIDACIÓN VISIBLE')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'RESTAURAR EVENTO' }))
    expect(screen.getByText('El evento volverá a CARGANDO GASTOS.')).toBeInTheDocument()
  })
})
