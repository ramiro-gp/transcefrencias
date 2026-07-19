import { calculateOriginalBalances } from '../../domain/finance/calculate-balances'
import { consolidateOriginalBalances } from '../../domain/finance/consolidate-balances'
import type { Participant } from '../events/event-service'
import type { EventExpense } from './expense-service'

export function calculatePersonalExpenseSummary(
  expenses: readonly EventExpense[],
  participants: readonly Participant[],
  profileId: string,
) {
  const own = participants.find((item) => item.profileId === profileId)
  if (!own) throw new Error('Economic identity not found')
  const original = calculateOriginalBalances({
    participantIds: participants.map((item) => item.id),
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      payers: expense.payers,
      consumerIds: expense.participantIds,
    })),
  })
  const balance = consolidateOriginalBalances(original.balances, participants).find(
    (item) => item.participantId === own.id,
  )
  if (!balance) throw new Error('Economic balance not found')
  return {
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    consumedAmount: balance.consumedAmount,
    balance: balance.amount,
  }
}
