import { describe, expect, it } from 'vitest'
import { calculateEventSettlement } from './settlement-model'

describe('calculateEventSettlement', () => {
  it('consolidates historical identities before suggesting transfers', () => {
    const result = calculateEventSettlement(
      [
        {
          id: 'dinner',
          concept: 'Cena',
          category: 'food',
          amount: 1001,
          payers: [{ participantId: 'manual', amount: 1001 }],
          participantIds: ['manual', 'member'],
          createdBy: 'creator',
          revision: 1,
          createdAt: 'now',
        },
      ],
      [
        {
          id: 'manual',
          profileId: null,
          displayName: 'Ana histórica',
          active: false,
          mergedIntoId: 'member',
        },
        {
          id: 'member',
          profileId: 'profile',
          displayName: 'Ana',
          active: true,
          mergedIntoId: null,
        },
      ],
    )

    expect(result.people).toHaveLength(1)
    expect(result.people[0]).toMatchObject({
      id: 'member',
      balance: { amount: 0, paidAmount: 1001, consumedAmount: 1001 },
    })
    expect(result.optimization).toMatchObject({ status: 'exact', transfers: [] })
  })

  it('uses the protected deterministic budget only above fifteen non-zero balances', () => {
    const participants = Array.from({ length: 16 }, (_, index) => ({
      id: `p${index}`,
      profileId: index === 0 ? 'profile' : null,
      displayName: `P${index}`,
      active: true,
      mergedIntoId: null,
    }))
    const expenses = participants.slice(1).map((participant, index) => ({
      id: `e${index}`,
      concept: `Gasto ${index}`,
      category: 'food' as const,
      amount: 1,
      payers: [{ participantId: 'p0', amount: 1 }],
      participantIds: [participant.id],
      createdBy: 'profile',
      revision: 1,
      createdAt: 'now',
    }))

    expect(calculateEventSettlement(expenses, participants).optimization).toMatchObject({
      status: 'exact',
    })
  })
})
