import { solveTransfersByZeroSumPartitions } from './zero-sum-partition'
import type { Balance, SuggestedTransfer } from './types'

function applyTransfers(
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

describe('solveTransfersByZeroSumPartitions', () => {
  it('proves n - 1 directly when no proper zero-sum subset exists', () => {
    const balances = [
      { participantId: 'a', amount: -1 },
      { participantId: 'b', amount: -2 },
      { participantId: 'c', amount: 3 },
    ]

    const result = solveTransfersByZeroSumPartitions(balances)

    expect(result).toMatchObject({
      status: 'exact',
      minimumTransferCount: 2,
      metrics: { directIrreducibleProof: true, evaluatedSubsets: 7 },
    })
    if (result.status !== 'exact') throw new Error('Expected exact result')
    expect(
      applyTransfers(balances, result.transfers).every((amount) => amount === 0),
    ).toBe(true)
  })

  it('reconstructs a maximum deterministic partition with repeated balances', () => {
    const balances = [
      { participantId: 'd', amount: 500 },
      { participantId: 'b', amount: -500 },
      { participantId: 'c', amount: 500 },
      { participantId: 'a', amount: -500 },
    ]

    const result = solveTransfersByZeroSumPartitions(balances)
    const reversed = solveTransfersByZeroSumPartitions([...balances].reverse())

    expect(result).toEqual(reversed)
    expect(result).toMatchObject({
      status: 'exact',
      minimumTransferCount: 2,
      groups: [
        ['a', 'c'],
        ['b', 'd'],
      ],
    })
  })

  it('finds the documented A-F minimum', () => {
    const result = solveTransfersByZeroSumPartitions([
      { participantId: 'a', amount: -1250 },
      { participantId: 'b', amount: -2250 },
      { participantId: 'c', amount: 500 },
      { participantId: 'd', amount: 1500 },
      { participantId: 'e', amount: 2750 },
      { participantId: 'f', amount: -1250 },
    ])

    expect(result).toMatchObject({ status: 'exact', minimumTransferCount: 5 })
  })

  it('solves the previous two-million-state adversarial case', () => {
    const result = solveTransfersByZeroSumPartitions([
      { participantId: 'd-0', amount: -101 },
      { participantId: 'd-1', amount: -203 },
      { participantId: 'd-2', amount: -307 },
      { participantId: 'd-3', amount: -401 },
      { participantId: 'd-4', amount: -503 },
      { participantId: 'd-5', amount: -601 },
      { participantId: 'd-6', amount: -701 },
      { participantId: 'c-0', amount: 89 },
      { participantId: 'c-1', amount: 127 },
      { participantId: 'c-2', amount: 173 },
      { participantId: 'c-3', amount: 251 },
      { participantId: 'c-4', amount: 337 },
      { participantId: 'c-5', amount: 419 },
      { participantId: 'c-6', amount: 521 },
      { participantId: 'c-7', amount: 900 },
    ])

    expect(result).toMatchObject({
      status: 'exact',
      minimumTransferCount: 13,
      metrics: {
        evaluatedSubsets: 32767,
        zeroSumSubsets: 13,
      },
    })
  })

  it('returns discriminated protection results without claiming exactness', () => {
    const balances = [
      { participantId: 'a', amount: -500 },
      { participantId: 'b', amount: 500 },
    ]

    expect(
      solveTransfersByZeroSumPartitions(balances, { subsetBudget: 2 }),
    ).toMatchObject({
      status: 'budget-exceeded',
      reason: 'subset-budget',
    })
    expect(
      solveTransfersByZeroSumPartitions(
        [
          { participantId: 'a', amount: -500 },
          { participantId: 'b', amount: -500 },
          { participantId: 'c', amount: 500 },
          { participantId: 'd', amount: 500 },
        ],
        { transitionBudget: 0 },
      ),
    ).toMatchObject({ status: 'budget-exceeded', reason: 'transition-budget' })
    expect(
      solveTransfersByZeroSumPartitions(
        [
          { participantId: 'a', amount: -500 },
          { participantId: 'b', amount: -500 },
          { participantId: 'c', amount: 500 },
          { participantId: 'd', amount: 500 },
        ],
        { partitionStateBudget: 1 },
      ),
    ).toMatchObject({ status: 'budget-exceeded', reason: 'partition-state-budget' })
  })

  it('reports unsupported bitmask size without rejecting the event globally', () => {
    const balances = Array.from({ length: 21 }, (_, index) => ({
      participantId: `p-${index.toString().padStart(2, '0')}`,
      amount: index === 20 ? 20 : -1,
    }))

    expect(solveTransfersByZeroSumPartitions(balances)).toEqual({
      status: 'unsupported',
      participantCount: 21,
      maximumSupportedParticipants: 20,
    })
  })
})
