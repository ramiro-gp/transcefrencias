import { FinanceDomainError } from './errors'
import type { Balance, Expense, ParticipantId, SettlementMovement } from './types'

export function compareIds(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function assertValidId(
  id: string,
  kind: 'participant' | 'expense' | 'movement',
): void {
  if (id.length > 0) return

  const code =
    kind === 'participant'
      ? 'invalid-participant-id'
      : kind === 'expense'
        ? 'invalid-expense-id'
        : 'invalid-movement-id'
  throw new FinanceDomainError(code, `${kind} ID must not be empty`)
}

export function safeAdd(left: number, right: number): number {
  const result = left + right
  if (!Number.isSafeInteger(result)) {
    throw new FinanceDomainError(
      'unsafe-money-total',
      'Money total is not a safe integer',
      {
        left,
        right,
      },
    )
  }
  return result
}

export function validateParticipantIds(
  participantIds: readonly ParticipantId[],
): readonly ParticipantId[] {
  const seen = new Set<ParticipantId>()
  for (const participantId of participantIds) {
    assertValidId(participantId, 'participant')
    if (seen.has(participantId)) {
      throw new FinanceDomainError(
        'duplicate-participant',
        'Participant IDs must be unique',
        {
          participantId,
        },
      )
    }
    seen.add(participantId)
  }
  return [...participantIds].sort(compareIds)
}

export function validateExpense(
  expense: Expense,
  participantIds?: ReadonlySet<ParticipantId>,
): void {
  assertValidId(expense.id, 'expense')
  if (!Number.isSafeInteger(expense.amount) || expense.amount <= 0) {
    throw new FinanceDomainError(
      'invalid-expense-amount',
      'Expense amount must be a positive safe integer',
      { expenseId: expense.id, amount: expense.amount },
    )
  }
  if (expense.payers.length === 0) {
    throw new FinanceDomainError('empty-payers', 'Expense must have at least one payer', {
      expenseId: expense.id,
    })
  }
  const payers = new Set<ParticipantId>()
  let paidTotal = 0
  for (const payer of expense.payers) {
    assertValidId(payer.participantId, 'participant')
    if (payers.has(payer.participantId)) {
      throw new FinanceDomainError('duplicate-payer', 'Expense payers must be unique', {
        expenseId: expense.id,
        participantId: payer.participantId,
      })
    }
    if (!Number.isSafeInteger(payer.amount) || payer.amount <= 0) {
      throw new FinanceDomainError(
        'invalid-payer-amount',
        'Payer amount must be a positive safe integer',
        { expenseId: expense.id, participantId: payer.participantId },
      )
    }
    payers.add(payer.participantId)
    paidTotal = safeAdd(paidTotal, payer.amount)
  }
  if (paidTotal !== expense.amount) {
    throw new FinanceDomainError(
      'payer-total-mismatch',
      'Payer amounts must equal expense amount',
      {
        expenseId: expense.id,
      },
    )
  }
  if (expense.consumerIds.length === 0) {
    throw new FinanceDomainError(
      'empty-consumers',
      'Expense must have at least one consumer',
      {
        expenseId: expense.id,
      },
    )
  }

  const consumers = new Set<ParticipantId>()
  for (const consumerId of expense.consumerIds) {
    assertValidId(consumerId, 'participant')
    if (consumers.has(consumerId)) {
      throw new FinanceDomainError(
        'duplicate-consumer',
        'Expense consumers must be unique',
        {
          expenseId: expense.id,
          participantId: consumerId,
        },
      )
    }
    consumers.add(consumerId)
  }

  if (participantIds !== undefined) {
    for (const participantId of [...payers, ...expense.consumerIds]) {
      if (!participantIds.has(participantId)) {
        throw new FinanceDomainError(
          'unknown-participant',
          'Expense references an unknown participant',
          { expenseId: expense.id, participantId },
        )
      }
    }
  }
}

export function validateMovement(
  movement: SettlementMovement,
  participantIds?: ReadonlySet<ParticipantId>,
): void {
  assertValidId(movement.id, 'movement')
  assertValidId(movement.fromId, 'participant')
  assertValidId(movement.toId, 'participant')
  if (!Number.isSafeInteger(movement.amount) || movement.amount <= 0) {
    throw new FinanceDomainError(
      'invalid-movement-amount',
      'Movement amount must be a positive safe integer',
      { movementId: movement.id, amount: movement.amount },
    )
  }
  if (movement.fromId === movement.toId) {
    throw new FinanceDomainError(
      'same-movement-endpoint',
      'Movement endpoints must be different',
      { movementId: movement.id, participantId: movement.fromId },
    )
  }
  if (participantIds !== undefined) {
    for (const participantId of [movement.fromId, movement.toId]) {
      if (!participantIds.has(participantId)) {
        throw new FinanceDomainError(
          'unknown-participant',
          'Movement references an unknown participant',
          { movementId: movement.id, participantId },
        )
      }
    }
  }
}

export function validateBalances(balances: readonly Balance[]): readonly Balance[] {
  const seen = new Set<ParticipantId>()
  let totalDebt = 0
  let totalCredit = 0
  const sortedBalances = [...balances].sort((left, right) =>
    compareIds(left.participantId, right.participantId),
  )
  for (const balance of sortedBalances) {
    assertValidId(balance.participantId, 'participant')
    if (seen.has(balance.participantId)) {
      throw new FinanceDomainError(
        'duplicate-balance',
        'Balance participant IDs must be unique',
        {
          participantId: balance.participantId,
        },
      )
    }
    if (!Number.isSafeInteger(balance.amount)) {
      throw new FinanceDomainError(
        'unsafe-money-total',
        'Balance must be a safe integer',
        {
          participantId: balance.participantId,
          amount: balance.amount,
        },
      )
    }
    seen.add(balance.participantId)
    if (balance.amount < 0) totalDebt = safeAdd(totalDebt, -balance.amount)
    if (balance.amount > 0) totalCredit = safeAdd(totalCredit, balance.amount)
  }
  if (totalDebt !== totalCredit) {
    throw new FinanceDomainError('unbalanced-balances', 'Balances must sum to zero', {
      totalDebt,
      totalCredit,
    })
  }
  return sortedBalances
}
