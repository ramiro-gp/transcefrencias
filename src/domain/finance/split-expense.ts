import type { Expense, ExpenseBreakdown, ExpenseShare } from './types'
import { compareIds, safeAdd, validateExpense } from './validation'

export function splitExpense(expense: Expense): ExpenseBreakdown {
  validateExpense(expense)
  const consumers = [...expense.consumerIds].sort(compareIds)
  const base = Math.floor(expense.amount / consumers.length)
  const remainder = expense.amount % consumers.length

  const shares: ExpenseShare[] = consumers.map((participantId, index) => ({
    participantId,
    amount: base + (index < remainder ? 1 : 0),
  }))

  const total = shares.reduce((sum, share) => safeAdd(sum, share.amount), 0)
  if (total !== expense.amount) {
    throw new Error('Expense split invariant failed')
  }

  return {
    expenseId: expense.id,
    amount: expense.amount,
    payerId: expense.payerId,
    shares,
  }
}
