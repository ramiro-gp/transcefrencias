import { calculateGreedyTransferReference } from './greedy-reference'
import { optimizeTransfers } from './optimize-transfers'
import type { Balance, SuggestedTransfer } from './types'

function applyTransfers(
  balances: readonly Balance[],
  transfers: readonly SuggestedTransfer[],
): readonly Balance[] {
  const result = new Map(
    balances.map((balance) => [balance.participantId, balance.amount]),
  )
  for (const transfer of transfers) {
    result.set(transfer.fromId, (result.get(transfer.fromId) ?? 0) + transfer.amount)
    result.set(transfer.toId, (result.get(transfer.toId) ?? 0) - transfer.amount)
  }
  return [...result].map(([participantId, amount]) => ({ participantId, amount }))
}

describe('optimizeTransfers', () => {
  it('returns no transfers for settled balances while retaining exact metrics', () => {
    const result = optimizeTransfers([
      { participantId: 'b', amount: 0 },
      { participantId: 'a', amount: 0 },
    ])

    expect(result).toMatchObject({
      status: 'exact',
      minimumTransferCount: 0,
      transfers: [],
    })
  })

  it('finds fewer transfers than largest-balance greedy when possible', () => {
    const balances = [
      { participantId: 'd8', amount: -8000 },
      { participantId: 'd7', amount: -7000 },
      { participantId: 'd6', amount: -6000 },
      { participantId: 'd5', amount: -5000 },
      { participantId: 'c9', amount: 9000 },
      { participantId: 'c8', amount: 8000 },
      { participantId: 'c7', amount: 7000 },
      { participantId: 'c2', amount: 2000 },
    ]

    const result = optimizeTransfers(balances)
    expect(result.status).toBe('exact')
    if (result.status !== 'exact') throw new Error('Expected exact optimization')
    expect(result.minimumTransferCount).toBe(5)
    expect(calculateGreedyTransferReference(balances)).toHaveLength(7)
    expect(
      applyTransfers(balances, result.transfers).every(({ amount }) => amount === 0),
    ).toBe(true)
  })

  it('uses the partition strategy to solve the former adversarial case exactly', () => {
    const result = optimizeTransfers([
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

    expect(result).toMatchObject({ status: 'exact', minimumTransferCount: 13 })
  })

  it('keeps larger events functional through exact backtracking selection', () => {
    const balances = [
      ...Array.from({ length: 8 }, (_, index) => ({
        participantId: `d-${index}`,
        amount: -1000,
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        participantId: `c-${index}`,
        amount: 1000,
      })),
    ]

    expect(optimizeTransfers(balances)).toMatchObject({
      status: 'exact',
      minimumTransferCount: 8,
      metrics: { exploredStates: 1 },
    })
  })

  it('is deterministic across balance input permutations', () => {
    const balances = [
      { participantId: 'a', amount: -500 },
      { participantId: 'b', amount: -500 },
      { participantId: 'c', amount: 500 },
      { participantId: 'd', amount: 500 },
    ]

    expect(optimizeTransfers(balances)).toEqual(
      optimizeTransfers([...balances].reverse()),
    )
  })

  it('returns a discriminated result instead of a partial solution when budget is exceeded', () => {
    const result = optimizeTransfers(
      [
        { participantId: 'a', amount: -500 },
        { participantId: 'b', amount: 500 },
      ],
      { stateBudget: 0 },
    )

    expect(result).toEqual({
      status: 'budget-exceeded',
      stateBudget: 0,
      metrics: { exploredStates: 0, memoizedStates: 0, maximumDepth: 0 },
    })
  })

  it('keeps stateBudget measured in search states under the partition strategy', () => {
    expect(
      optimizeTransfers(
        [
          { participantId: 'a', amount: -500 },
          { participantId: 'b', amount: 500 },
        ],
        { stateBudget: 1 },
      ),
    ).toMatchObject({
      status: 'exact',
      minimumTransferCount: 1,
      metrics: { exploredStates: 1 },
    })

    expect(
      optimizeTransfers(
        [
          { participantId: 'a', amount: -500 },
          { participantId: 'b', amount: -500 },
          { participantId: 'c', amount: 500 },
          { participantId: 'd', amount: 500 },
        ],
        { stateBudget: 1 },
      ),
    ).toMatchObject({ status: 'budget-exceeded', stateBudget: 1 })
  })

  it('rejects unbalanced inputs and invalid budgets', () => {
    expect(() => optimizeTransfers([{ participantId: 'a', amount: 1 }])).toThrowError(
      expect.objectContaining({ code: 'unbalanced-balances' }),
    )
    expect(() => optimizeTransfers([], { stateBudget: -1 })).toThrowError(
      expect.objectContaining({ code: 'invalid-state-budget' }),
    )
  })

  it('validates unsafe aggregate volume independently of input order', () => {
    const maximum = Number.MAX_SAFE_INTEGER
    const balances = [
      { participantId: 'a', amount: maximum },
      { participantId: 'b', amount: 1 },
      { participantId: 'c', amount: -maximum },
      { participantId: 'd', amount: -1 },
    ]

    for (const input of [balances, [...balances].reverse()]) {
      expect(() => optimizeTransfers(input)).toThrowError(
        expect.objectContaining({ code: 'unsafe-money-total' }),
      )
    }
  })
})
