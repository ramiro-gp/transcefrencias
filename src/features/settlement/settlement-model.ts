import { calculateOriginalBalances } from '../../domain/finance/calculate-balances'
import { consolidateOriginalBalances } from '../../domain/finance/consolidate-balances'
import { optimizeTransfers } from '../../domain/finance/optimize-transfers'
import type {
  OptimizationResult,
  ParticipantOriginalBalance,
} from '../../domain/finance/types'
import type { Participant } from '../events/event-service'
import type { EventExpense } from '../expenses/expense-service'

export const LARGE_SETTLEMENT_STATE_BUDGET = 250_000

export interface SettlementPerson extends Participant {
  readonly balance: ParticipantOriginalBalance
}

export interface SettlementModel {
  readonly people: readonly SettlementPerson[]
  readonly optimization: OptimizationResult
  readonly expenseNames: ReadonlyMap<string, string>
}

export function calculateEventSettlement(
  expenses: readonly EventExpense[],
  participants: readonly Participant[],
  unlimited = false,
): SettlementModel {
  const original = calculateOriginalBalances({
    participantIds: participants.map((participant) => participant.id),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      payers: expense.payers,
      consumerIds: expense.participantIds,
    })),
  })
  const balances = consolidateOriginalBalances(original.balances, participants)
  const people = balances.map((balance) => {
    const participant = participants.find((item) => item.id === balance.participantId)
    if (!participant) throw new Error('No encontramos una persona para el cálculo.')
    return { ...participant, balance }
  })
  const nonZeroBalances = balances.filter((balance) => balance.amount !== 0).length
  return {
    people,
    optimization: optimizeTransfers(balances, {
      ...(unlimited || nonZeroBalances <= 15
        ? {}
        : { stateBudget: LARGE_SETTLEMENT_STATE_BUDGET }),
    }),
    expenseNames: new Map(expenses.map((expense) => [expense.id, expense.concept])),
  }
}
