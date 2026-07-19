import { calculateSettlement } from './calculate-settlement'

describe('calculateSettlement', () => {
  it('composes original, pending and optimized results without losing explanations', () => {
    const result = calculateSettlement({
      participantIds: ['a', 'b'],
      expenses: [
        {
          id: 'expense',
          amount: 1000,
          payers: [{ participantId: 'a', amount: 1000 }],
          consumerIds: ['b'],
        },
      ],
      movements: [{ id: 'partial', fromId: 'b', toId: 'a', amount: 400 }],
    })

    expect(result.original.balances.map(({ amount }) => amount)).toEqual([1000, -1000])
    expect(result.pending.balances.map(({ amount }) => amount)).toEqual([600, -600])
    expect(result.optimization).toMatchObject({
      status: 'exact',
      minimumTransferCount: 1,
      transfers: [{ fromId: 'b', toId: 'a', amount: 600 }],
    })
  })
})
