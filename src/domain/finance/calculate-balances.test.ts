import { calculateOriginalBalances } from './calculate-balances'

describe('calculateOriginalBalances', () => {
  it('credits multiple payers, including one outside the consumer set', () => {
    const result = calculateOriginalBalances({
      participantIds: ['c', 'a', 'b', 'uninvolved'],
      expenses: [
        {
          id: 'expense',
          amount: 1500,
          payers: [
            { participantId: 'a', amount: 1000 },
            { participantId: 'b', amount: 500 },
          ],
          consumerIds: ['b', 'c'],
        },
      ],
    })

    expect(result.balances).toEqual([
      {
        participantId: 'a',
        amount: 1000,
        paidAmount: 1000,
        consumedAmount: 0,
        contributions: [
          { expenseId: 'expense', paidAmount: 1000, consumedAmount: 0, netAmount: 1000 },
        ],
      },
      {
        participantId: 'b',
        amount: -250,
        paidAmount: 500,
        consumedAmount: 750,
        contributions: [
          { expenseId: 'expense', paidAmount: 500, consumedAmount: 750, netAmount: -250 },
        ],
      },
      {
        participantId: 'c',
        amount: -750,
        paidAmount: 0,
        consumedAmount: 750,
        contributions: [
          { expenseId: 'expense', paidAmount: 0, consumedAmount: 750, netAmount: -750 },
        ],
      },
      {
        participantId: 'uninvolved',
        amount: 0,
        paidAmount: 0,
        consumedAmount: 0,
        contributions: [],
      },
    ])
  })

  it('recalculates edits and deletions from the supplied source', () => {
    const original = {
      participantIds: ['a', 'b'],
      expenses: [
        {
          id: 'expense',
          amount: 1000,
          payers: [{ participantId: 'a', amount: 1000 }],
          consumerIds: ['a', 'b'],
        },
      ],
    } as const
    const edited = {
      ...original,
      expenses: [
        {
          ...original.expenses[0],
          amount: 2000,
          payers: [{ participantId: 'a', amount: 2000 }],
        },
      ],
    }

    expect(
      calculateOriginalBalances(original).balances.map(({ amount }) => amount),
    ).toEqual([500, -500])
    expect(
      calculateOriginalBalances(edited).balances.map(({ amount }) => amount),
    ).toEqual([1000, -1000])
    expect(
      calculateOriginalBalances({ ...original, expenses: [] }).balances.map(
        ({ amount }) => amount,
      ),
    ).toEqual([0, 0])
  })

  it('rejects unknown participants and duplicate source IDs', () => {
    expect(() =>
      calculateOriginalBalances({
        participantIds: ['a'],
        expenses: [
          {
            id: 'expense',
            amount: 500,
            payers: [{ participantId: 'a', amount: 500 }],
            consumerIds: ['b'],
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'unknown-participant' }))

    expect(() =>
      calculateOriginalBalances({
        participantIds: ['a'],
        expenses: [
          {
            id: 'expense',
            amount: 500,
            payers: [{ participantId: 'a', amount: 500 }],
            consumerIds: ['a'],
          },
          {
            id: 'expense',
            amount: 1000,
            payers: [{ participantId: 'a', amount: 1000 }],
            consumerIds: ['a'],
          },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'duplicate-expense' }))
  })
})
