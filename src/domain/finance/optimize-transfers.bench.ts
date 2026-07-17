// @vitest-environment node
import { bench, describe } from 'vitest'
import { calculateGreedyTransferReference } from './greedy-reference'
import { optimizeTransfers } from './optimize-transfers'
import type { Balance } from './types'

const stateBudget = 250_000

function balancesFromSides(
  debts: readonly number[],
  credits: readonly number[],
  zeroParticipants = 0,
): readonly Balance[] {
  return [
    ...debts.map((amount, index) => ({ participantId: `d-${index}`, amount: -amount })),
    ...credits.map((amount, index) => ({ participantId: `c-${index}`, amount })),
    ...Array.from({ length: zeroParticipants }, (_, index) => ({
      participantId: `z-${index}`,
      amount: 0,
    })),
  ]
}

const cases = [
  {
    name: 'representative-14',
    balances: balancesFromSides(
      [1250, 2250, 1250, 1800, 3300, 700, 950],
      [500, 1500, 2750, 2000, 2500, 1250, 1000],
    ),
  },
  {
    name: 'representative-15-with-settled-participant',
    balances: balancesFromSides(
      [1250, 2250, 1250, 1800, 3300, 700, 950],
      [500, 1500, 2750, 2000, 2500, 1250, 1000],
      1,
    ),
  },
  {
    name: 'representative-15-active',
    balances: balancesFromSides(
      [1000, 2000, 3000, 4000, 5000, 6000, 7000],
      [500, 500, 2000, 3000, 4000, 5000, 6000, 7000],
    ),
  },
  {
    name: 'partition-rich-14',
    balances: balancesFromSides(
      [8000, 7000, 6000, 5000, 1100, 1300, 1700],
      [9000, 8000, 7000, 2000, 1100, 1300, 1700],
    ),
  },
  {
    name: 'adversarial-15',
    balances: balancesFromSides(
      [101, 203, 307, 401, 503, 601, 701],
      [89, 127, 173, 251, 337, 419, 521, 900],
    ),
  },
] as const

describe('exact optimizer benchmark', () => {
  for (const benchmarkCase of cases) {
    const measuredResult = optimizeTransfers(benchmarkCase.balances, { stateBudget })
    const greedyCount = calculateGreedyTransferReference(benchmarkCase.balances).length
    console.log(
      JSON.stringify({
        case: benchmarkCase.name,
        participants: benchmarkCase.balances.length,
        stateBudget,
        result: measuredResult,
        greedyTransferCount: greedyCount,
      }),
    )

    bench(
      benchmarkCase.name,
      () => {
        optimizeTransfers(benchmarkCase.balances, { stateBudget })
      },
      { iterations: 20, warmupIterations: 5 },
    )
  }
})
