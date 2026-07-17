import fc from 'fast-check'
import { applyMovements } from './apply-movements'
import { calculateOriginalBalances } from './calculate-balances'
import { optimizeTransfers, optimizeTransfersByBacktracking } from './optimize-transfers'
import { splitExpense } from './split-expense'
import type { Balance, Expense, SettlementMovement, SuggestedTransfer } from './types'
import { solveTransfersByZeroSumPartitions } from './zero-sum-partition'

const participantIds = ['a', 'b', 'c', 'd'] as const

function oracleMinimumTransferCount(balances: readonly Balance[]): number {
  const amounts = balances
    .filter(({ amount }) => amount !== 0)
    .map(({ amount }) => amount)
  const fullMask = (1 << amounts.length) - 1
  const memo = new Map<number, number>([[0, 0]])

  function maximumZeroSumGroups(mask: number): number {
    const cached = memo.get(mask)
    if (cached !== undefined) return cached
    const firstBit = mask & -mask
    let best = Number.NEGATIVE_INFINITY

    for (let subset = mask; subset > 0; subset = (subset - 1) & mask) {
      if ((subset & firstBit) === 0) continue
      let sum = 0
      for (let index = 0; index < amounts.length; index += 1) {
        if ((subset & (1 << index)) !== 0) sum += amounts[index] ?? 0
      }
      if (sum === 0) {
        best = Math.max(best, 1 + maximumZeroSumGroups(mask ^ subset))
      }
    }

    memo.set(mask, best)
    return best
  }

  return amounts.length - maximumZeroSumGroups(fullMask)
}

function settleWithTransfers(
  balances: readonly Balance[],
  transfers: readonly SuggestedTransfer[],
): readonly number[] {
  const pending = new Map(
    balances.map(({ participantId, amount }) => [participantId, amount]),
  )
  for (const transfer of transfers) {
    pending.set(transfer.fromId, (pending.get(transfer.fromId) ?? 0) + transfer.amount)
    pending.set(transfer.toId, (pending.get(transfer.toId) ?? 0) - transfer.amount)
  }
  return [...pending.values()]
}

describe('finance properties', () => {
  it('splits every valid expense exactly and independently of consumer order', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.uniqueArray(fc.constantFrom(...participantIds), {
          minLength: 1,
          maxLength: participantIds.length,
        }),
        (units, consumers) => {
          const expense = {
            id: 'expense',
            amount: units * 500,
            payerId: 'a',
            consumerIds: consumers,
          }
          const forward = splitExpense(expense)
          const reversed = splitExpense({
            ...expense,
            consumerIds: [...consumers].reverse(),
          })
          const amounts = forward.shares.map(({ amount }) => amount)

          expect(forward).toEqual(reversed)
          expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(expense.amount)
          expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1)
        },
      ),
      { numRuns: 300 },
    )
  })

  it('keeps original balances zero-sum and independent of source order', () => {
    const expenseArbitrary = fc.record({
      units: fc.integer({ min: 1, max: 1000 }),
      payerId: fc.constantFrom(...participantIds),
      consumerIds: fc.uniqueArray(fc.constantFrom(...participantIds), {
        minLength: 1,
        maxLength: participantIds.length,
      }),
    })

    fc.assert(
      fc.property(fc.array(expenseArbitrary, { maxLength: 30 }), (generatedExpenses) => {
        const expenses: Expense[] = generatedExpenses.map((expense, index) => ({
          id: `expense-${index.toString().padStart(2, '0')}`,
          amount: expense.units * 500,
          payerId: expense.payerId,
          consumerIds: expense.consumerIds,
        }))
        const forward = calculateOriginalBalances({ participantIds, expenses })
        const reversed = calculateOriginalBalances({
          participantIds: [...participantIds].reverse(),
          expenses: [...expenses].reverse().map((expense) => ({
            ...expense,
            consumerIds: [...expense.consumerIds].reverse(),
          })),
        })

        expect(forward).toEqual(reversed)
        expect(forward.balances.reduce((sum, balance) => sum + balance.amount, 0)).toBe(0)
      }),
      { numRuns: 200 },
    )
  })

  it('applies historical movements and warnings independently of input order', () => {
    const movementArbitrary = fc
      .record({
        fromId: fc.constantFrom(...participantIds),
        toId: fc.constantFrom(...participantIds),
        amount: fc.integer({ min: 1, max: 3000 }),
      })
      .filter(({ fromId, toId }) => fromId !== toId)

    fc.assert(
      fc.property(
        fc.array(movementArbitrary, { maxLength: 20 }),
        (generatedMovements) => {
          const movements: SettlementMovement[] = generatedMovements.map(
            (movement, index) => ({
              id: `movement-${index.toString().padStart(2, '0')}`,
              ...movement,
            }),
          )
          const originalBalances = [
            { participantId: 'a', amount: -1000 },
            { participantId: 'b', amount: -500 },
            { participantId: 'c', amount: 800 },
            { participantId: 'd', amount: 700 },
          ]
          const forward = applyMovements({ originalBalances, movements })
          const reversed = applyMovements({
            originalBalances: [...originalBalances].reverse(),
            movements: [...movements].reverse(),
          })

          expect(forward).toEqual(reversed)
          expect(forward.balances.reduce((sum, balance) => sum + balance.amount, 0)).toBe(
            0,
          )
        },
      ),
      { numRuns: 200 },
    )
  })

  it('matches an independent zero-sum partition oracle for small generated cases', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -20, max: 20 }), { minLength: 1, maxLength: 7 }),
        (prefix) => {
          const amounts = [...prefix, -prefix.reduce((sum, amount) => sum + amount, 0)]
          const balances = amounts.map((amount, index) => ({
            participantId: `p-${index.toString().padStart(2, '0')}`,
            amount,
          }))
          const result = optimizeTransfers(balances, { stateBudget: 1_000_000 })
          const backtrackingResult = optimizeTransfersByBacktracking(balances, {
            stateBudget: 1_000_000,
          })
          const partitionResult = solveTransfersByZeroSumPartitions(balances)

          expect(result.status).toBe('exact')
          expect(backtrackingResult.status).toBe('exact')
          expect(partitionResult.status).toBe('exact')
          if (result.status !== 'exact') return
          if (backtrackingResult.status !== 'exact') return
          if (partitionResult.status !== 'exact') return
          const oracleCount = oracleMinimumTransferCount(balances)
          expect(result.minimumTransferCount).toBe(oracleCount)
          expect(backtrackingResult.minimumTransferCount).toBe(oracleCount)
          expect(partitionResult.minimumTransferCount).toBe(oracleCount)
          expect(
            settleWithTransfers(balances, partitionResult.transfers).every(
              (amount) => amount === 0,
            ),
          ).toBe(true)
          expect(result.transfers.every(({ amount }) => amount > 0)).toBe(true)
          expect(
            settleWithTransfers(balances, result.transfers).every(
              (amount) => amount === 0,
            ),
          ).toBe(true)
          expect(
            optimizeTransfers([...balances].reverse(), { stateBudget: 1_000_000 }),
          ).toEqual(result)
        },
      ),
      { numRuns: 500 },
    )
  })
})
