import { describe, expect, it } from 'vitest'
import { calculatePersonalExpenseSummary } from './expense-summary'
const people = [
  {
    id: 'manual',
    profileId: null,
    displayName: 'Antes',
    active: false,
    mergedIntoId: 'account',
  },
  {
    id: 'account',
    profileId: 'user',
    displayName: 'Ahora',
    active: true,
    mergedIntoId: null,
  },
  {
    id: 'other',
    profileId: 'other-user',
    displayName: 'Otra',
    active: true,
    mergedIntoId: null,
  },
]
const base = {
  id: 'e',
  concept: 'Cena',
  category: 'food' as const,
  createdBy: 'user',
  revision: 1,
  createdAt: 'now',
}
describe('personal expense summary', () => {
  it('includes historical identities merged into the account', () => {
    const result = calculatePersonalExpenseSummary(
      [
        {
          ...base,
          amount: 2000,
          payers: [{ participantId: 'manual', amount: 2000 }],
          participantIds: ['account', 'other'],
        },
      ],
      people,
      'user',
    )
    expect(result).toEqual({ total: 2000, consumedAmount: 1000, balance: 1000 })
  })
  it.each([
    [
      {
        payers: [{ participantId: 'other', amount: 2000 }],
        participantIds: ['account', 'other'],
      },
      -1000,
    ],
    [
      { payers: [{ participantId: 'account', amount: 2000 }], participantIds: ['other'] },
      2000,
    ],
    [
      {
        payers: [
          { participantId: 'account', amount: 1000 },
          { participantId: 'other', amount: 1000 },
        ],
        participantIds: ['account', 'other'],
      },
      0,
    ],
  ])(
    'returns pay, receive, and settled balances',
    ({ payers, participantIds }, balance) => {
      expect(
        calculatePersonalExpenseSummary(
          [{ ...base, amount: 2000, payers, participantIds }],
          people,
          'user',
        ).balance,
      ).toBe(balance)
    },
  )
  it('returns zero totals for an empty event', () => {
    expect(calculatePersonalExpenseSummary([], people, 'user')).toEqual({
      total: 0,
      consumedAmount: 0,
      balance: 0,
    })
  })
})
