import { calculateOriginalBalances } from './calculate-balances'

describe('calculateOriginalBalances', () => {
  it('credits a payer outside the consumer set', () => {
    const result = calculateOriginalBalances({
      participantIds: ['c', 'a', 'b', 'uninvolved'],
      expenses: [{ id: 'expense', amount: 1500, payerId: 'a', consumerIds: ['b', 'c'] }],
    })

    expect(result.balances).toEqual([
      {
        participantId: 'a',
        amount: 1500,
        paidAmount: 1500,
        consumedAmount: 0,
        contributions: [
          { expenseId: 'expense', paidAmount: 1500, consumedAmount: 0, netAmount: 1500 },
        ],
      },
      {
        participantId: 'b',
        amount: -750,
        paidAmount: 0,
        consumedAmount: 750,
        contributions: [
          { expenseId: 'expense', paidAmount: 0, consumedAmount: 750, netAmount: -750 },
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
      expenses: [{ id: 'expense', amount: 1000, payerId: 'a', consumerIds: ['a', 'b'] }],
    } as const
    const edited = {
      ...original,
      expenses: [{ ...original.expenses[0], amount: 2000 }],
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
        expenses: [{ id: 'expense', amount: 500, payerId: 'a', consumerIds: ['b'] }],
      }),
    ).toThrowError(expect.objectContaining({ code: 'unknown-participant' }))

    expect(() =>
      calculateOriginalBalances({
        participantIds: ['a'],
        expenses: [
          { id: 'expense', amount: 500, payerId: 'a', consumerIds: ['a'] },
          { id: 'expense', amount: 1000, payerId: 'a', consumerIds: ['a'] },
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: 'duplicate-expense' }))
  })
})
