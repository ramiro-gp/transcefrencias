import { FinanceDomainError } from './errors'
import { splitExpense } from './split-expense'

describe('splitExpense', () => {
  it('distributes remainder pesos by stable participant ID', () => {
    const result = splitExpense({
      id: 'expense-1',
      amount: 1000,
      payerId: 'payer',
      consumerIds: ['c', 'a', 'b'],
    })

    expect(result.shares).toEqual([
      { participantId: 'a', amount: 334 },
      { participantId: 'b', amount: 333 },
      { participantId: 'c', amount: 333 },
    ])
  })

  it('does not require the payer to be a consumer', () => {
    const result = splitExpense({
      id: 'expense-1',
      amount: 1500,
      payerId: 'a',
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
          payerId: 'a',
          consumerIds: ['a'],
        }),
      ).toThrow(FinanceDomainError)
    },
  )

  it('rejects empty and duplicate consumers', () => {
    expect(() =>
      splitExpense({ id: 'empty', amount: 500, payerId: 'a', consumerIds: [] }),
    ).toThrowError(expect.objectContaining({ code: 'empty-consumers' }))
    expect(() =>
      splitExpense({
        id: 'duplicates',
        amount: 500,
        payerId: 'a',
        consumerIds: ['a', 'a'],
      }),
    ).toThrowError(expect.objectContaining({ code: 'duplicate-consumer' }))
  })
})
