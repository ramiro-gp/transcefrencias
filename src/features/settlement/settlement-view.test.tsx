import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SettlementView } from './settlement-view'
import type { SettlementModel } from './settlement-model'

const settlement = vi.hoisted(() => ({
  current: {
    state: {
      status: 'success' as const,
      result: undefined as unknown as SettlementModel,
    },
    cancel: vi.fn(),
    continueExactly: vi.fn(),
  },
}))

vi.mock('./use-settlement', () => ({ useSettlement: () => settlement.current }))

const people = [
  {
    id: 'receives',
    profileId: 'me',
    displayName: 'Ana',
    active: true,
    mergedIntoId: null,
    balance: {
      participantId: 'receives',
      amount: 500,
      paidAmount: 1000,
      consumedAmount: 500,
      contributions: [],
    },
  },
  {
    id: 'pays',
    profileId: null,
    displayName: 'Beto',
    active: true,
    mergedIntoId: null,
    balance: {
      participantId: 'pays',
      amount: -500,
      paidAmount: 0,
      consumedAmount: 500,
      contributions: [],
    },
  },
  {
    id: 'settled',
    profileId: null,
    displayName: 'Caro',
    active: true,
    mergedIntoId: null,
    balance: {
      participantId: 'settled',
      amount: 0,
      paidAmount: 500,
      consumedAmount: 500,
      contributions: [],
    },
  },
]

describe('SettlementView', () => {
  beforeEach(() => {
    settlement.current = {
      state: {
        status: 'success',
        result: {
          people,
          expenseNames: new Map(),
          optimization: {
            status: 'exact',
            minimumTransferCount: 1,
            transfers: [{ fromId: 'pays', toId: 'receives', amount: 500 }],
            metrics: { exploredStates: 1, memoizedStates: 1, maximumDepth: 1 },
          },
        },
      } as never,
      cancel: vi.fn(),
      continueExactly: vi.fn(),
    }
  })

  it('renders the personal financial hierarchy and suggested transfer', () => {
    render(<SettlementView expenses={[]} participants={people} userId="me" />)

    expect(screen.getByRole('heading', { name: 'TU SALDO' })).toHaveClass(
      'financial-title',
    )
    expect(screen.getByRole('heading', { name: 'TRANSFERENCIAS SUGERIDAS' })).toHaveClass(
      'financial-title',
    )
    expect(screen.getByText('TENÉS QUE RECIBIR $500')).toHaveClass(
      'balance-result',
      'balance-credit',
    )
    expect(screen.getByText('VER EXPLICACIÓN').closest('details')).toHaveClass(
      'balance-explanation',
    )
    expect(screen.getByText('Beto PAGA A Ana')).toBeInTheDocument()
  })

  it('shows debt, credit and settled states in the general view', () => {
    render(<SettlementView expenses={[]} participants={people} userId="me" />)
    fireEvent.click(screen.getByRole('button', { name: 'VISTA GENERAL' }))

    expect(screen.getByText('TENÉS QUE PAGAR $500')).toHaveClass(
      'balance-result',
      'balance-debt',
    )
    expect(screen.getByText('TENÉS QUE RECIBIR $500')).toHaveClass(
      'balance-result',
      'balance-credit',
    )
    expect(screen.getByText('ESTÁS AL DÍA')).toHaveClass(
      'balance-result',
      'balance-settled',
    )
  })
})
