import { FinanceDomainError } from './errors'
import type { ParticipantOriginalBalance } from './types'

export interface ParticipantIdentity {
  readonly id: string
  readonly mergedIntoId: string | null
}
export function consolidateOriginalBalances(
  balances: readonly ParticipantOriginalBalance[],
  identities: readonly ParticipantIdentity[],
): readonly ParticipantOriginalBalance[] {
  const identity = new Map(identities.map((item) => [item.id, item] as const))
  const resolve = (id: string, seen = new Set<string>()): string => {
    if (seen.has(id))
      throw new FinanceDomainError(
        'invalid-participant-id',
        'Participant merge cycle detected',
        { participantId: id },
      )
    const item = identity.get(id)
    if (!item)
      throw new FinanceDomainError(
        'invalid-participant-id',
        'Participant merge target is missing',
        { participantId: id },
      )
    if (!item.mergedIntoId) return id
    seen.add(id)
    return resolve(item.mergedIntoId, seen)
  }
  const result = new Map<string, ParticipantOriginalBalance>()
  for (const balance of balances) {
    const id = resolve(balance.participantId)
    const prior = result.get(id)
    result.set(
      id,
      prior
        ? {
            ...prior,
            amount: prior.amount + balance.amount,
            paidAmount: prior.paidAmount + balance.paidAmount,
            consumedAmount: prior.consumedAmount + balance.consumedAmount,
            contributions: [...prior.contributions, ...balance.contributions],
          }
        : { ...balance, participantId: id },
    )
  }
  return [...result.values()].sort((a, b) =>
    a.participantId < b.participantId ? -1 : a.participantId > b.participantId ? 1 : 0,
  )
}
