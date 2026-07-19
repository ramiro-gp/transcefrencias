import { FinanceDomainError } from './errors'
import { splitExpense } from './split-expense'

describe('splitExpense', () => {
  it('distributes remainder pesos by stable participant ID', () => {
    const result = splitExpense({
      id: 'expense-1',
      amount: 1000,
      payers: [{ participantId: 'payer', amount: 1000 }],
      consumerIds: ['c', 'a', 'b'],
    })

    expect(result.shares).toEqual([
      { participantId: 'a', amount: 334 },
      { participantId: 'b', amount: 333 },
      { participantId: 'c', amount: 333 },
    ])
  })

  it('does not require payers to be consumers', () => {
    const result = splitExpense({
      id: 'expense-1',
      amount: 1500,
      payers: [{ participantId: 'a', amount: 1500 }],
      consumerIds: ['b', 'c'],
    })

    expect(result.shares).toEqual([
      { participantId: 'b', amount: 750 },
      { participantId: 'c', amount: 750 },
    ])
  })

  it.each([0, -500, 501, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid expense amount %s',
    (amount) => {
      expect(() =>
        splitExpense({
          id: 'expense-1',
          amount,
          payers: [{ participantId: 'a', amount: 500 }],
          consumerIds: ['a'],
        }),
      ).toThrow(FinanceDomainError)
    },
  )

  it('rejects empty and duplicate consumers', () => {
    expect(() =>
      splitExpense({
        id: 'empty',
        amount: 500,
        payers: [{ participantId: 'a', amount: 500 }],
        consumerIds: [],
      }),
    ).toThrowError(expect.objectContaining({ code: 'empty-consumers' }))
    expect(() =>
      splitExpense({
        id: 'duplicates',
        amount: 500,
        payers: [{ participantId: 'a', amount: 500 }],
        consumerIds: ['a', 'a'],
      }),
    ).toThrowError(expect.objectContaining({ code: 'duplicate-consumer' }))
  })

  it.each([
    { payers: [], code: 'empty-payers' },
    {
      payers: [
        { participantId: 'a', amount: 500 },
        { participantId: 'a', amount: 500 },
      ],
      code: 'duplicate-payer',
    },
    { payers: [{ participantId: 'a', amount: 0 }], code: 'invalid-payer-amount' },
    {
      payers: [
        { participantId: 'a', amount: 500 },
        { participantId: 'b', amount: 500 },
      ],
      code: 'payer-total-mismatch',
    },
  ] as const)('rejects invalid payer contributions', ({ payers, code }) => {
    expect(() =>
      splitExpense({ id: 'invalid-payers', amount: 500, payers, consumerIds: ['a'] }),
    ).toThrowError(expect.objectContaining({ code }))
  })
})
