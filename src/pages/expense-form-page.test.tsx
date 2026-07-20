import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { ExpenseFormPage } from './expense-form-page'

vi.mock('../app/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-id' } }),
}))
vi.mock('../features/events/event-queries', () => ({
  eventListKey: (userId: string) => ['events', userId],
  useEventDetail: () => ({
    isLoading: false,
    isError: false,
    data: { status: 'archived', name: 'SÁBADO', participants: [] },
  }),
}))
vi.mock('../features/expenses/expense-queries', () => ({
  useExpense: () => ({ isLoading: false, isError: false }),
  invalidateExpenseQueries: vi.fn(),
}))
vi.mock('../features/expenses/expense-form', () => ({ ExpenseForm: () => null }))

describe('ExpenseFormPage', () => {
  it('blocks direct expense creation for an archived event', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/eventos/event-id/gastos/nuevo']}>
          <Routes>
            <Route path="/eventos/:eventId/gastos/nuevo" element={<ExpenseFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('EVENTO ARCHIVADO')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Este evento está en modo solo lectura. No se pueden modificar gastos.',
      ),
    ).toBeInTheDocument()
  })
})
