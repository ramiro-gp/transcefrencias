import { calculateOriginalBalances } from './calculate-balances'
import { optimizeTransfers } from './optimize-transfers'

describe('A-F reference case', () => {
  it('reproduces the documented balances and exact minimum of five transfers', () => {
    const participants = ['a', 'b', 'c', 'd', 'e', 'f']
    const result = calculateOriginalBalances({
      participantIds: participants,
      expenses: [
        {
          id: 'afternoon-a',
          amount: 1000,
          payers: [{ participantId: 'a', amount: 1000 }],
          consumerIds: ['a', 'b', 'c', 'd'],
        },
        {
          id: 'afternoon-c',
          amount: 2000,
          payers: [{ participantId: 'c', amount: 2000 }],
          consumerIds: ['a', 'b', 'c', 'd'],
        },
        {
          id: 'afternoon-d',
          amount: 3000,
          payers: [{ participantId: 'd', amount: 3000 }],
          consumerIds: ['a', 'b', 'c', 'd'],
        },
        {
          id: 'night-a',
          amount: 500,
          payers: [{ participantId: 'a', amount: 500 }],
          consumerIds: ['a', 'b', 'e', 'f'],
        },
        {
          id: 'night-b',
          amount: 500,
          payers: [{ participantId: 'b', amount: 500 }],
          consumerIds: ['a', 'b', 'e', 'f'],
        },
        {
          id: 'night-e',
          amount: 4000,
          payers: [{ participantId: 'e', amount: 4000 }],
          consumerIds: ['a', 'b', 'e', 'f'],
        },
      ],
    })

    expect(
      result.balances.map(({ participantId, amount }) => ({ participantId, amount })),
    ).toEqual([
      { participantId: 'a', amount: -1250 },
      { participantId: 'b', amount: -2250 },
      { participantId: 'c', amount: 500 },
      { participantId: 'd', amount: 1500 },
      { participantId: 'e', amount: 2750 },
      { participantId: 'f', amount: -1250 },
    ])

    const optimization = optimizeTransfers(result.balances)
    expect(optimization).toMatchObject({ status: 'exact', minimumTransferCount: 5 })
  })
})
