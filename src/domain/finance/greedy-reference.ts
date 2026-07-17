import type { Balance, SuggestedTransfer } from './types'
import { compareIds, validateBalances } from './validation'

function compareAmountsDescending(left: number, right: number): number {
  if (left > right) return -1
  if (left < right) return 1
  return 0
}

export function compareSuggestedTransfers(
  left: SuggestedTransfer,
  right: SuggestedTransfer,
): number {
  const fromComparison = compareIds(left.fromId, right.fromId)
  if (fromComparison !== 0) return fromComparison
  const toComparison = compareIds(left.toId, right.toId)
  if (toComparison !== 0) return toComparison
  if (left.amount < right.amount) return -1
  if (left.amount > right.amount) return 1
  return 0
}

export function settleZeroSumGroupDeterministically(
  balances: readonly Balance[],
): readonly SuggestedTransfer[] {
  const sortedBalances = validateBalances(balances)
  const debtors = sortedBalances
    .filter((balance) => balance.amount < 0)
    .map((balance) => ({ participantId: balance.participantId, amount: -balance.amount }))
  const creditors = sortedBalances
    .filter((balance) => balance.amount > 0)
    .map((balance) => ({ participantId: balance.participantId, amount: balance.amount }))
  const transfers: SuggestedTransfer[] = []

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(
      (left, right) =>
        compareAmountsDescending(left.amount, right.amount) ||
        compareIds(left.participantId, right.participantId),
    )
    creditors.sort(
      (left, right) =>
        compareAmountsDescending(left.amount, right.amount) ||
        compareIds(left.participantId, right.participantId),
    )
    const debtor = debtors[0]
    const creditor = creditors[0]
    if (debtor === undefined || creditor === undefined)
      throw new Error('Greedy state is invalid')
    const amount = Math.min(debtor.amount, creditor.amount)
    transfers.push({ fromId: debtor.participantId, toId: creditor.participantId, amount })
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) debtors.shift()
    if (creditor.amount === 0) creditors.shift()
  }

  return transfers.sort(compareSuggestedTransfers)
}

// Used only by benchmarks and tests to quantify the non-optimal greedy heuristic.
export function calculateGreedyTransferReference(
  balances: readonly Balance[],
): readonly SuggestedTransfer[] {
  return settleZeroSumGroupDeterministically(balances)
}
