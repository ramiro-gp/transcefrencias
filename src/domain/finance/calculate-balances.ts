import { FinanceDomainError } from './errors'
import { splitExpense } from './split-expense'
import type {
  ExpenseContribution,
  OriginalBalanceInput,
  OriginalBalanceResult,
  ParticipantId,
} from './types'
import {
  compareIds,
  safeAdd,
  validateExpense,
  validateParticipantIds,
} from './validation'

interface MutableBalance {
  amount: number
  paidAmount: number
  consumedAmount: number
  contributions: ExpenseContribution[]
}

export function calculateOriginalBalances({
  participantIds,
  expenses,
}: OriginalBalanceInput): OriginalBalanceResult {
  const sortedParticipantIds = validateParticipantIds(participantIds)
  const participantSet = new Set(sortedParticipantIds)
  const balances = new Map<ParticipantId, MutableBalance>()
  for (const participantId of sortedParticipantIds) {
    balances.set(participantId, {
      amount: 0,
      paidAmount: 0,
      consumedAmount: 0,
      contributions: [],
    })
  }

  const expenseIds = new Set<string>()
  const sortedExpenses = [...expenses].sort((left, right) =>
    compareIds(left.id, right.id),
  )
  const expenseBreakdowns = sortedExpenses.map((expense) => {
    validateExpense(expense, participantSet)
    if (expenseIds.has(expense.id)) {
      throw new FinanceDomainError('duplicate-expense', 'Expense IDs must be unique', {
        expenseId: expense.id,
      })
    }
    expenseIds.add(expense.id)

    const breakdown = splitExpense(expense)
    const shares = new Map(
      breakdown.shares.map((share) => [share.participantId, share.amount] as const),
    )

    for (const participantId of new Set([expense.payerId, ...expense.consumerIds])) {
      const balance = balances.get(participantId)
      if (balance === undefined) throw new Error('Validated participant is missing')
      const paidAmount = participantId === expense.payerId ? expense.amount : 0
      const consumedAmount = shares.get(participantId) ?? 0
      const netAmount = safeAdd(paidAmount, -consumedAmount)

      balance.amount = safeAdd(balance.amount, netAmount)
      balance.paidAmount = safeAdd(balance.paidAmount, paidAmount)
      balance.consumedAmount = safeAdd(balance.consumedAmount, consumedAmount)
      balance.contributions.push({
        expenseId: expense.id,
        paidAmount,
        consumedAmount,
        netAmount,
      })
    }
    return breakdown
  })

  const result = sortedParticipantIds.map((participantId) => {
    const balance = balances.get(participantId)
    if (balance === undefined) throw new Error('Initialized participant is missing')
    return {
      participantId,
      amount: balance.amount,
      paidAmount: balance.paidAmount,
      consumedAmount: balance.consumedAmount,
      contributions: balance.contributions,
    }
  })

  const total = result.reduce((sum, balance) => safeAdd(sum, balance.amount), 0)
  if (total !== 0) throw new Error('Original balance invariant failed')

  return { balances: result, expenseBreakdowns }
}
