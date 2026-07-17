import { FinanceDomainError } from './errors'
import type {
  MovementContribution,
  MovementWarning,
  ParticipantId,
  ParticipantPendingBalance,
  PendingBalanceInput,
  PendingBalanceResult,
  ProposedMovementInput,
  ValidatedMovement,
} from './types'
import { compareIds, safeAdd, validateBalances, validateMovement } from './validation'

interface MutableMovementTotals {
  sentAmount: number
  receivedAmount: number
  contributions: MovementContribution[]
}

function warningKey(warning: MovementWarning): string {
  return `${warning.code}\u0000${warning.participantId}`
}

export function applyMovements({
  originalBalances,
  movements,
}: PendingBalanceInput): PendingBalanceResult {
  const sortedBalances = validateBalances(originalBalances)
  const originalByParticipant = new Map(
    sortedBalances.map((balance) => [balance.participantId, balance.amount] as const),
  )
  const participantSet = new Set(originalByParticipant.keys())
  const totals = new Map<ParticipantId, MutableMovementTotals>()
  for (const participantId of participantSet) {
    totals.set(participantId, { sentAmount: 0, receivedAmount: 0, contributions: [] })
  }

  const movementIds = new Set<string>()
  const sortedMovements = [...movements].sort((left, right) =>
    compareIds(left.id, right.id),
  )
  const warnings: MovementWarning[] = []

  for (const movement of sortedMovements) {
    validateMovement(movement, participantSet)
    if (movementIds.has(movement.id)) {
      throw new FinanceDomainError('duplicate-movement', 'Movement IDs must be unique', {
        movementId: movement.id,
      })
    }
    movementIds.add(movement.id)

    const fromTotals = totals.get(movement.fromId)
    const toTotals = totals.get(movement.toId)
    if (fromTotals === undefined || toTotals === undefined) {
      throw new Error('Validated movement participant is missing')
    }
    fromTotals.sentAmount = safeAdd(fromTotals.sentAmount, movement.amount)
    fromTotals.contributions.push({
      movementId: movement.id,
      sentAmount: movement.amount,
      receivedAmount: 0,
      netAmount: movement.amount,
    })
    toTotals.receivedAmount = safeAdd(toTotals.receivedAmount, movement.amount)
    toTotals.contributions.push({
      movementId: movement.id,
      sentAmount: 0,
      receivedAmount: movement.amount,
      netAmount: -movement.amount,
    })
  }

  const balances: ParticipantPendingBalance[] = sortedBalances.map((original) => {
    const participantTotals = totals.get(original.participantId)
    if (participantTotals === undefined)
      throw new Error('Initialized movement totals are missing')
    const movementNet = safeAdd(
      participantTotals.sentAmount,
      -participantTotals.receivedAmount,
    )
    const amount = safeAdd(original.amount, movementNet)

    if (participantTotals.sentAmount > 0 && original.amount >= 0) {
      warnings.push({
        code: 'historical-origin-not-debtor',
        participantId: original.participantId,
      })
    }
    if (participantTotals.receivedAmount > 0 && original.amount <= 0) {
      warnings.push({
        code: 'historical-destination-not-creditor',
        participantId: original.participantId,
      })
    }

    if (original.amount < 0 && amount > 0) {
      warnings.push({
        code: 'debtor-became-creditor',
        participantId: original.participantId,
      })
    } else if (original.amount > 0 && amount < 0) {
      warnings.push({
        code: 'creditor-became-debtor',
        participantId: original.participantId,
      })
    } else if (original.amount === 0 && amount !== 0) {
      warnings.push({
        code: 'settled-participant-became-unsettled',
        participantId: original.participantId,
      })
    }

    return {
      participantId: original.participantId,
      originalAmount: original.amount,
      sentAmount: participantTotals.sentAmount,
      receivedAmount: participantTotals.receivedAmount,
      amount,
      contributions: participantTotals.contributions,
    }
  })

  warnings.sort((left, right) => compareIds(warningKey(left), warningKey(right)))
  return { balances, warnings }
}

export function validateProposedMovement({
  originalBalances,
  movements,
  proposedMovement,
  replacedMovementId,
}: ProposedMovementInput): ValidatedMovement {
  let replacementCount = 0
  const baseMovements = movements.filter((movement) => {
    if (movement.id !== replacedMovementId) return true
    replacementCount += 1
    return false
  })
  if (replacedMovementId !== undefined && replacementCount === 0) {
    throw new FinanceDomainError(
      'movement-not-found',
      'Replaced movement does not exist',
      {
        movementId: replacedMovementId ?? '',
      },
    )
  }
  if (replacementCount > 1) {
    throw new FinanceDomainError('duplicate-movement', 'Movement IDs must be unique', {
      movementId: replacedMovementId ?? '',
    })
  }

  const pending = applyMovements({ originalBalances, movements: baseMovements })
  const participantSet = new Set(pending.balances.map((balance) => balance.participantId))
  validateMovement(proposedMovement, participantSet)
  if (baseMovements.some((movement) => movement.id === proposedMovement.id)) {
    throw new FinanceDomainError('duplicate-movement', 'Movement IDs must be unique', {
      movementId: proposedMovement.id,
    })
  }

  const pendingByParticipant = new Map(
    pending.balances.map((balance) => [balance.participantId, balance.amount] as const),
  )
  const fromBalance = pendingByParticipant.get(proposedMovement.fromId)
  const toBalance = pendingByParticipant.get(proposedMovement.toId)
  if (fromBalance === undefined || fromBalance >= 0) {
    throw new FinanceDomainError(
      'invalid-movement-origin',
      'Movement origin must have pending debt',
      { participantId: proposedMovement.fromId },
    )
  }
  if (toBalance === undefined || toBalance <= 0) {
    throw new FinanceDomainError(
      'invalid-movement-destination',
      'Movement destination must have pending credit',
      { participantId: proposedMovement.toId },
    )
  }

  const availableDebt = -fromBalance
  const availableCredit = toBalance
  if (proposedMovement.amount > Math.min(availableDebt, availableCredit)) {
    throw new FinanceDomainError(
      'movement-exceeds-pending',
      'Movement exceeds pending debt or credit',
      {
        amount: proposedMovement.amount,
        availableDebt,
        availableCredit,
      },
    )
  }

  return { movement: proposedMovement, availableDebt, availableCredit }
}
