import { describe, expect, it } from 'vitest'
import { consolidateOriginalBalances } from './consolidate-balances'

const balance = (id: string, amount: number) => ({
  participantId: id,
  amount,
  paidAmount: Math.max(amount, 0),
  consumedAmount: Math.max(-amount, 0),
  contributions: [],
})
describe('consolidateOriginalBalances', () => {
  it('consolidates chains deterministically without changing totals', () => {
    const result = consolidateOriginalBalances(
      [balance('a', -10), balance('b', 20), balance('c', -10)],
      [
        { id: 'a', mergedIntoId: 'b' },
        { id: 'b', mergedIntoId: 'c' },
        { id: 'c', mergedIntoId: null },
      ],
    )
    expect(result).toEqual([
      {
        participantId: 'c',
        amount: 0,
        paidAmount: 20,
        consumedAmount: 20,
        contributions: [],
      },
    ])
  })
  it('rejects cycles and missing targets', () => {
    expect(() =>
      consolidateOriginalBalances(
        [balance('a', 0)],
        [
          { id: 'a', mergedIntoId: 'b' },
          { id: 'b', mergedIntoId: 'a' },
        ],
      ),
    ).toThrow()
    expect(() =>
      consolidateOriginalBalances(
        [balance('a', 0)],
        [{ id: 'a', mergedIntoId: 'missing' }],
      ),
    ).toThrow()
  })
})
