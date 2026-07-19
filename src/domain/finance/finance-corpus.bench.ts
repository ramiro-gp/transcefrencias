// @vitest-environment node
/// <reference types="node" />
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bench, describe } from 'vitest'
import { calculateOriginalBalances } from './calculate-balances'
import { calculateGreedyTransferReference } from './greedy-reference'
import { optimizeTransfers, optimizeTransfersByBacktracking } from './optimize-transfers'
import type { Balance, Expense } from './types'
import {
  solveTransfersByZeroSumPartitions,
  type ZeroSumPartitionMetrics,
} from './zero-sum-partition'

const budgets = [50_000, 100_000, 250_000, 500_000] as const
const casesPerSize = 500
const baseSeed = 0x5eed_2026
const hybridWorkBudget = 20_000_000

type Profile =
  'mixed' | 'sparse-zero' | 'dense-overlap' | 'exact-components' | 'repeated-balances'

interface CorpusCase {
  readonly id: string
  readonly kind: 'realistic' | 'synthetic'
  readonly profile: string
  readonly seed: number
  readonly participantCount: number
  readonly expenseCount: number
  readonly payerConsumesCount: number
  readonly balances: readonly Balance[]
  readonly properZeroSubsetCount: number
}

interface BudgetObservation {
  readonly budget: number
  readonly status: 'exact' | 'budget-exceeded'
  readonly exploredStates: number
  readonly memoizedStates: number
  readonly maximumDepth: number
  readonly elapsedMilliseconds: number
  readonly exactTransferCount?: number
}

interface CaseMeasurement {
  readonly corpusCase: CorpusCase
  readonly observations: readonly BudgetObservation[]
  readonly greedyTransferCount: number
}

interface StoredMeasurement {
  readonly id: string
  readonly kind: 'realistic' | 'synthetic'
  readonly profile: string
  readonly seed: number
  readonly participantCount: number
  readonly expenseCount: number
  readonly payerConsumesCount: number
  readonly hasZeroBalance: boolean
  readonly hasRepeatedNonZeroBalances: boolean
  readonly properZeroSubsetCount: number
  readonly observations: readonly BudgetObservation[]
  readonly greedyTransferCount: number
  readonly lossExampleBalances?: readonly Balance[]
  readonly partitionMetrics?: ZeroSumPartitionMetrics
}

class FixedRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed === 0 ? 1 : seed >>> 0
  }

  next(): number {
    let value = this.state
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    this.state = value >>> 0
    return this.state / 0x1_0000_0000
  }

  integer(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.next() * (maximum - minimum + 1))
  }

  pick<T>(values: readonly T[]): T {
    const value = values[this.integer(0, values.length - 1)]
    if (value === undefined) throw new Error('Cannot pick from an empty collection')
    return value
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values]
    for (let index = result.length - 1; index > 0; index -= 1) {
      const otherIndex = this.integer(0, index)
      const value = result[index]
      const otherValue = result[otherIndex]
      if (value === undefined || otherValue === undefined)
        throw new Error('Shuffle failed')
      result[index] = otherValue
      result[otherIndex] = value
    }
    return result
  }
}

function participantIds(count: number): readonly string[] {
  return Array.from(
    { length: count },
    (_, index) => `p-${index.toString().padStart(2, '0')}`,
  )
}

function countProperZeroSubsets(balances: readonly Balance[]): number {
  const amounts = balances
    .filter(({ amount }) => amount !== 0)
    .map(({ amount }) => amount)
  if (amounts.length <= 1) return 0
  const fullMask = (1 << amounts.length) - 1
  let count = 0
  for (let mask = 1; mask < fullMask; mask += 1) {
    let sum = 0
    for (let index = 0; index < amounts.length; index += 1) {
      if ((mask & (1 << index)) !== 0) sum += amounts[index] ?? 0
    }
    if (sum === 0) count += 1
  }
  return count
}

function randomExpenses(
  random: FixedRandom,
  ids: readonly string[],
  profile: Exclude<Profile, 'exact-components' | 'repeated-balances'>,
): readonly Expense[] {
  const inactiveCount = profile === 'sparse-zero' ? random.integer(1, 3) : 0
  const activeIds = ids.slice(0, ids.length - inactiveCount)
  const expenseCount =
    profile === 'dense-overlap'
      ? random.integer(28, 45)
      : profile === 'sparse-zero'
        ? random.integer(6, 18)
        : random.integer(10, 32)

  return Array.from({ length: expenseCount }, (_, index) => {
    const minimumConsumers =
      profile === 'dense-overlap' ? Math.ceil(activeIds.length / 2) : 1
    const consumerCount = random.integer(minimumConsumers, activeIds.length)
    const amount = random.integer(1, 80) * 500
    const payerCount = random.integer(1, Math.min(activeIds.length, amount / 500))
    const payerIds = random.shuffle(activeIds).slice(0, payerCount)
    const baseAmount = Math.floor(amount / payerCount / 500) * 500
    const remainder = amount - baseAmount * payerCount
    return {
      id: `expense-${index.toString().padStart(2, '0')}`,
      amount,
      payers: payerIds.map((participantId, payerIndex) => ({
        participantId,
        amount: baseAmount + (payerIndex === 0 ? remainder : 0),
      })),
      consumerIds: random.shuffle(activeIds).slice(0, consumerCount),
    }
  })
}

function componentExpenses(
  random: FixedRandom,
  ids: readonly string[],
  repeated: boolean,
): readonly Expense[] {
  const expenses: Expense[] = []
  let expenseIndex = 0
  for (let index = 0; index + 1 < ids.length; index += 2) {
    const debtor = ids[index]
    const creditor = ids[index + 1]
    if (debtor === undefined || creditor === undefined)
      throw new Error('Pair is incomplete')
    const amount = (repeated ? 4 : random.integer(1, 40)) * 500
    expenses.push({
      id: `expense-${expenseIndex}`,
      amount,
      payers: [{ participantId: creditor, amount }],
      consumerIds: [debtor],
    })
    expenseIndex += 1
  }

  if (ids.length % 2 !== 0) {
    const last = ids.at(-1)
    const first = ids[0]
    const second = ids[1]
    if (last === undefined || first === undefined || second === undefined) {
      throw new Error('Cycle participants are missing')
    }
    expenses.push({
      id: `expense-${expenseIndex}`,
      amount: 1500,
      payers: [{ participantId: first, amount: 1500 }],
      consumerIds: [last],
    })
    expenses.push({
      id: `expense-${expenseIndex + 1}`,
      amount: 1000,
      payers: [{ participantId: last, amount: 1000 }],
      consumerIds: [second],
    })
  }
  return expenses
}

function createRealisticCase(participantCount: 14 | 15, index: number): CorpusCase {
  const profiles: readonly Profile[] = [
    'mixed',
    'sparse-zero',
    'dense-overlap',
    'exact-components',
    'repeated-balances',
  ]
  const profile = profiles[index % profiles.length]
  if (profile === undefined) throw new Error('Profile is missing')
  const seed = (baseSeed + participantCount * 10_000 + index * 7919) >>> 0
  const random = new FixedRandom(seed)
  const ids = participantIds(participantCount)
  const expenses =
    profile === 'exact-components'
      ? componentExpenses(random, ids, false)
      : profile === 'repeated-balances'
        ? componentExpenses(random, ids, true)
        : randomExpenses(random, ids, profile)
  const result = calculateOriginalBalances({ participantIds: ids, expenses })
  const balances = result.balances.map(({ participantId, amount }) => ({
    participantId,
    amount,
  }))

  return {
    id: `realistic-${participantCount}-${index.toString().padStart(3, '0')}`,
    kind: 'realistic',
    profile,
    seed,
    participantCount,
    expenseCount: expenses.length,
    payerConsumesCount: expenses.filter((expense) =>
      expense.payers.some(({ participantId }) =>
        expense.consumerIds.includes(participantId),
      ),
    ).length,
    balances,
    properZeroSubsetCount: countProperZeroSubsets(balances),
  }
}

function balancesFromSides(
  debts: readonly number[],
  credits: readonly number[],
): readonly Balance[] {
  return [
    ...debts.map((amount, index) => ({ participantId: `d-${index}`, amount: -amount })),
    ...credits.map((amount, index) => ({ participantId: `c-${index}`, amount })),
  ]
}

function hasProperZeroSubset(balances: readonly Balance[]): boolean {
  return countProperZeroSubsets(balances) > 0
}

function createIrreducibleBalances(
  random: FixedRandom,
  count: number,
): readonly Balance[] {
  const debtCount = Math.floor(count / 2)
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const debts = Array.from({ length: debtCount }, () => random.integer(100, 5000))
    const totalDebt = debts.reduce((sum, amount) => sum + amount, 0)
    const creditCount = count - debtCount
    const credits: number[] = []
    let remaining = totalDebt
    for (let index = 0; index < creditCount - 1; index += 1) {
      const maximum = remaining - (creditCount - index - 1)
      const amount = random.integer(1, Math.max(1, maximum))
      credits.push(amount)
      remaining -= amount
    }
    if (remaining <= 0) continue
    credits.push(remaining)
    const balances = balancesFromSides(debts, credits)
    if (!hasProperZeroSubset(balances)) return balances
  }
  throw new Error('Could not generate an irreducible balance case')
}

function createSyntheticCases(): readonly CorpusCase[] {
  const result: CorpusCase[] = []
  const profiles = [
    'greedy-hard',
    'equal-balances',
    'partition-rich',
    'irreducible',
  ] as const
  for (const profile of profiles) {
    for (let index = 0; index < 10; index += 1) {
      const count: 14 | 15 = index % 2 === 0 ? 14 : 15
      const seed =
        (baseSeed ^ ((profiles.indexOf(profile) + 1) * 100_003) ^ (index * 97)) >>> 0
      const random = new FixedRandom(seed)
      let balances: readonly Balance[]

      if (profile === 'greedy-hard') {
        const baseDebts = [8000, 7000, 6000, 5000, 1100, 1300, 1700]
        const baseCredits =
          count === 14
            ? [9000, 8000, 7000, 2000, 1100, 1300, 1700]
            : [9000, 8000, 7000, 1000, 1000, 1100, 1300, 1700]
        balances = balancesFromSides(baseDebts, baseCredits)
      } else if (profile === 'equal-balances') {
        balances =
          count === 14
            ? balancesFromSides(Array(7).fill(1000), Array(7).fill(1000))
            : balancesFromSides(Array(7).fill(8000), Array(8).fill(7000))
      } else if (profile === 'partition-rich') {
        const debts = Array.from({ length: 7 }, (_, value) => (value + 1) * 1000)
        const credits =
          count === 14 ? [...debts] : [500, 500, 2000, 3000, 4000, 5000, 6000, 7000]
        balances = balancesFromSides(debts, credits)
      } else {
        balances = createIrreducibleBalances(random, count)
      }

      result.push({
        id: `synthetic-${profile}-${count}-${index}`,
        kind: 'synthetic',
        profile,
        seed,
        participantCount: count,
        expenseCount: 0,
        payerConsumesCount: 0,
        balances,
        properZeroSubsetCount: countProperZeroSubsets(balances),
      })
    }
  }
  return result
}

function measureCase(corpusCase: CorpusCase): CaseMeasurement {
  const observations: BudgetObservation[] = []
  let exactObservation: BudgetObservation | undefined

  for (const budget of budgets) {
    if (exactObservation !== undefined) {
      observations.push({ ...exactObservation, budget })
      continue
    }

    const startedAt = performance.now()
    const result = optimizeTransfers(corpusCase.balances, { stateBudget: budget })
    const elapsedMilliseconds = performance.now() - startedAt
    const observation: BudgetObservation = {
      budget,
      status: result.status,
      exploredStates: result.metrics.exploredStates,
      memoizedStates: result.metrics.memoizedStates,
      maximumDepth: result.metrics.maximumDepth,
      elapsedMilliseconds,
      ...(result.status === 'exact'
        ? { exactTransferCount: result.minimumTransferCount }
        : {}),
    }
    observations.push(observation)
    if (observation.status === 'exact') exactObservation = observation
  }

  return {
    corpusCase,
    observations,
    greedyTransferCount: calculateGreedyTransferReference(corpusCase.balances).length,
  }
}

function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  )
  return sorted[index] ?? 0
}

function summarizeBudget(measurements: readonly StoredMeasurement[], budget: number) {
  const observations = measurements.map((measurement) => {
    const observation = measurement.observations.find((entry) => entry.budget === budget)
    if (observation === undefined) throw new Error('Budget observation is missing')
    return observation
  })
  const exactCount = observations.filter(({ status }) => status === 'exact').length
  const states = observations.map(({ exploredStates }) => exploredStates)
  const times = observations.map(({ elapsedMilliseconds }) => elapsedMilliseconds)
  const exactStates = observations
    .filter(({ status }) => status === 'exact')
    .map(({ exploredStates }) => exploredStates)
  return {
    budget,
    cases: observations.length,
    exactCount,
    exactPercentage: (exactCount / observations.length) * 100,
    exhaustedCount: observations.length - exactCount,
    exhaustedPercentage: ((observations.length - exactCount) / observations.length) * 100,
    states: {
      median: percentile(states, 50),
      p90: percentile(states, 90),
      p95: percentile(states, 95),
      p99: percentile(states, 99),
      maximum: Math.max(...states),
    },
    exactCompletionStates: {
      median: percentile(exactStates, 50),
      p90: percentile(exactStates, 90),
      p95: percentile(exactStates, 95),
      p99: percentile(exactStates, 99),
      maximum: Math.max(0, ...exactStates),
    },
    milliseconds: {
      median: percentile(times, 50),
      p90: percentile(times, 90),
      p95: percentile(times, 95),
      p99: percentile(times, 99),
      maximum: Math.max(...times),
    },
    maximumDepth: Math.max(...observations.map(({ maximumDepth }) => maximumDepth)),
    maximumMemoizedStates: Math.max(
      ...observations.map(({ memoizedStates }) => memoizedStates),
    ),
  }
}

function summarizeGreedy(measurements: readonly StoredMeasurement[]) {
  const known = measurements.flatMap((measurement) => {
    const exact = [...measurement.observations]
      .reverse()
      .find(({ status }) => status === 'exact')
    if (exact?.exactTransferCount === undefined) return []
    return [
      {
        id: measurement.id,
        kind: measurement.kind,
        profile: measurement.profile,
        seed: measurement.seed,
        balances: measurement.lossExampleBalances ?? [],
        exact: exact.exactTransferCount,
        greedy: measurement.greedyTransferCount,
        difference: measurement.greedyTransferCount - exact.exactTransferCount,
      },
    ]
  })
  const matching = known.filter(({ difference }) => difference === 0).length
  const differences = known.map(({ difference }) => difference)
  const positiveDifferences = differences.filter((difference) => difference > 0)
  const worstDifference = Math.max(0, ...differences)
  return {
    casesWithKnownExact: known.length,
    matchingCount: matching,
    matchingPercentage: known.length === 0 ? 0 : (matching / known.length) * 100,
    worseCount: positiveDifferences.length,
    worsePercentage:
      known.length === 0 ? 0 : (positiveDifferences.length / known.length) * 100,
    averageDifference:
      known.length === 0
        ? 0
        : differences.reduce((sum, difference) => sum + difference, 0) / known.length,
    averageDifferenceWhenWorse:
      positiveDifferences.length === 0
        ? 0
        : positiveDifferences.reduce((sum, difference) => sum + difference, 0) /
          positiveDifferences.length,
    worstDifference,
    representativeLosses: known
      .filter(({ difference }) => difference > 0)
      .sort(
        (left, right) =>
          right.difference - left.difference ||
          left.balances.length - right.balances.length,
      )
      .slice(0, 5),
  }
}

function summarizeComposition(cases: readonly StoredMeasurement[]) {
  const realistic = cases.filter(({ kind }) => kind === 'realistic')
  const expenseCounts = realistic.map(({ expenseCount }) => expenseCount)
  const expenses = realistic.reduce((sum, { expenseCount }) => sum + expenseCount, 0)
  const payerConsumes = realistic.reduce(
    (sum, { payerConsumesCount }) => sum + payerConsumesCount,
    0,
  )
  return {
    total: cases.length,
    realistic: realistic.length,
    synthetic: cases.length - realistic.length,
    byParticipantCount: Object.fromEntries(
      [14, 15].map((count) => [
        count,
        cases.filter((entry) => entry.participantCount === count).length,
      ]),
    ),
    profiles: Object.fromEntries(
      [...new Set(cases.map(({ profile }) => profile))].map((profile) => [
        profile,
        cases.filter((entry) => entry.profile === profile).length,
      ]),
    ),
    expenseCount: {
      total: expenses,
      minimum: Math.min(...expenseCounts),
      median: percentile(expenseCounts, 50),
      maximum: Math.max(...expenseCounts),
    },
    payerConsumesPercentage: (payerConsumes / expenses) * 100,
    casesWithZeroBalances: cases.filter(({ hasZeroBalance }) => hasZeroBalance).length,
    casesWithRepeatedNonZeroBalances: cases.filter(
      ({ hasRepeatedNonZeroBalances }) => hasRepeatedNonZeroBalances,
    ).length,
    zeroSubsetDistribution: {
      none: cases.filter(({ properZeroSubsetCount }) => properZeroSubsetCount === 0)
        .length,
      few1To10: cases.filter(
        ({ properZeroSubsetCount }) =>
          properZeroSubsetCount >= 1 && properZeroSubsetCount <= 10,
      ).length,
      manyOver10: cases.filter(({ properZeroSubsetCount }) => properZeroSubsetCount > 10)
        .length,
      maximum: Math.max(
        ...cases.map(({ properZeroSubsetCount }) => properZeroSubsetCount),
      ),
    },
    seedDefinition: {
      baseSeed,
      realisticFormula: '(baseSeed + participantCount * 10000 + index * 7919) >>> 0',
      casesPerSize,
    },
  }
}

let syntheticCaseCache: readonly CorpusCase[] | undefined

function createCaseByGlobalIndex(globalIndex: number): CorpusCase {
  if (globalIndex < casesPerSize) return createRealisticCase(14, globalIndex)
  if (globalIndex < casesPerSize * 2) {
    return createRealisticCase(15, globalIndex - casesPerSize)
  }
  syntheticCaseCache ??= createSyntheticCases()
  const synthetic = syntheticCaseCache[globalIndex - casesPerSize * 2]
  if (synthetic === undefined) throw new Error(`Unknown corpus index ${globalIndex}`)
  return synthetic
}

function compactMeasurement(measurement: CaseMeasurement): StoredMeasurement {
  const exact = [...measurement.observations]
    .reverse()
    .find(({ status }) => status === 'exact')
  const exactTransferCount = exact?.exactTransferCount
  const hasLoss =
    exactTransferCount !== undefined &&
    measurement.greedyTransferCount > exactTransferCount
  const nonZeroAmounts = measurement.corpusCase.balances
    .filter(({ amount }) => amount !== 0)
    .map(({ amount }) => amount)
  return {
    id: measurement.corpusCase.id,
    kind: measurement.corpusCase.kind,
    profile: measurement.corpusCase.profile,
    seed: measurement.corpusCase.seed,
    participantCount: measurement.corpusCase.participantCount,
    expenseCount: measurement.corpusCase.expenseCount,
    payerConsumesCount: measurement.corpusCase.payerConsumesCount,
    hasZeroBalance: measurement.corpusCase.balances.some(({ amount }) => amount === 0),
    hasRepeatedNonZeroBalances: new Set(nonZeroAmounts).size !== nonZeroAmounts.length,
    properZeroSubsetCount: measurement.corpusCase.properZeroSubsetCount,
    observations: measurement.observations,
    greedyTransferCount: measurement.greedyTransferCount,
    ...(hasLoss ? { lossExampleBalances: measurement.corpusCase.balances } : {}),
  }
}

function measureHybridCase(corpusCase: CorpusCase): StoredMeasurement {
  const startedAt = performance.now()
  const result = solveTransfersByZeroSumPartitions(corpusCase.balances, {
    subsetBudget: hybridWorkBudget,
    transitionBudget: hybridWorkBudget,
  })
  const elapsedMilliseconds = performance.now() - startedAt
  if (result.status === 'unsupported')
    throw new Error('Hybrid corpus case is unsupported')
  const exactTransferCount =
    result.status === 'exact' ? result.minimumTransferCount : undefined
  const greedyTransferCount = calculateGreedyTransferReference(corpusCase.balances).length
  const nonZeroAmounts = corpusCase.balances
    .filter(({ amount }) => amount !== 0)
    .map(({ amount }) => amount)
  const observation: BudgetObservation = {
    budget: hybridWorkBudget,
    status: result.status,
    exploredStates: result.metrics.evaluatedSubsets + result.metrics.partitionTransitions,
    memoizedStates: result.metrics.memoizedStates,
    maximumDepth: result.metrics.maximumDepth,
    elapsedMilliseconds,
    ...(exactTransferCount === undefined ? {} : { exactTransferCount }),
  }
  return {
    id: corpusCase.id,
    kind: corpusCase.kind,
    profile: corpusCase.profile,
    seed: corpusCase.seed,
    participantCount: corpusCase.participantCount,
    expenseCount: corpusCase.expenseCount,
    payerConsumesCount: corpusCase.payerConsumesCount,
    hasZeroBalance: corpusCase.balances.some(({ amount }) => amount === 0),
    hasRepeatedNonZeroBalances: new Set(nonZeroAmounts).size !== nonZeroAmounts.length,
    properZeroSubsetCount: corpusCase.properZeroSubsetCount,
    observations: [observation],
    greedyTransferCount,
    partitionMetrics: result.metrics,
    ...(exactTransferCount !== undefined && greedyTransferCount > exactTransferCount
      ? { lossExampleBalances: corpusCase.balances }
      : {}),
  }
}

function measureAdversarialEscalation() {
  const balances = balancesFromSides(
    [101, 203, 307, 401, 503, 601, 701],
    [89, 127, 173, 251, 337, 419, 521, 900],
  )
  const results = []
  for (const stateBudget of [500_000, 1_000_000, 2_000_000]) {
    const startedAt = performance.now()
    const result = optimizeTransfers(balances, { stateBudget })
    results.push({
      stateBudget,
      elapsedMilliseconds: performance.now() - startedAt,
      result,
    })
    if (result.status === 'exact') break
  }
  return {
    balances,
    greedyTransferCount: calculateGreedyTransferReference(balances).length,
    results,
  }
}

function adversarialBalances(): readonly Balance[] {
  return balancesFromSides(
    [101, 203, 307, 401, 503, 601, 701],
    [89, 127, 173, 251, 337, 419, 521, 900],
  )
}

function compactPartitionResult(
  result: ReturnType<typeof solveTransfersByZeroSumPartitions>,
) {
  if (result.status === 'unsupported') return result
  return {
    status: result.status,
    ...(result.status === 'exact'
      ? { minimumTransferCount: result.minimumTransferCount }
      : { reason: result.reason }),
    metrics: result.metrics,
  }
}

function measureHybridAdversarial() {
  const balances = adversarialBalances()
  const startedAt = performance.now()
  const result = solveTransfersByZeroSumPartitions(balances, {
    subsetBudget: hybridWorkBudget,
    transitionBudget: hybridWorkBudget,
  })
  return {
    balances,
    elapsedMilliseconds: performance.now() - startedAt,
    result: compactPartitionResult(result),
    greedyTransferCount: calculateGreedyTransferReference(balances).length,
  }
}

function balancedRepeatedCase(count: number): readonly Balance[] {
  const debtCount = Math.floor(count / 2)
  const creditCount = count - debtCount
  return balancesFromSides(
    Array(debtCount).fill(creditCount * 1000),
    Array(creditCount).fill(debtCount * 1000),
  )
}

function structuredPartitionCase(count: number): readonly Balance[] {
  const debtCount = Math.floor(count / 2)
  const creditCount = count - debtCount
  const debts = Array.from({ length: debtCount }, (_, index) => (index + 1) * 1000)
  const total = debts.reduce((sum, amount) => sum + amount, 0)
  const credits = Array.from({ length: creditCount - 1 }, (_, index) =>
    index < debts.length ? (debts[index] ?? 1000) : 1000,
  )
  const remaining = total - credits.reduce((sum, amount) => sum + amount, 0)
  if (remaining <= 0) return balancedRepeatedCase(count)
  credits.push(remaining)
  return balancesFromSides(debts, credits)
}

function measureScalingSize(participantCount: number) {
  const fixtures = [
    {
      name: 'irreducible',
      balances: createIrreducibleBalances(
        new FixedRandom((baseSeed + participantCount * 65_537) >>> 0),
        participantCount,
      ),
    },
    { name: 'repeated', balances: balancedRepeatedCase(participantCount) },
    { name: 'partition-rich', balances: structuredPartitionCase(participantCount) },
  ]

  return {
    participantCount,
    subsetCount: 2 ** participantCount - 1,
    fixtures: fixtures.map((fixture) => {
      const partitionStartedAt = performance.now()
      const partition = solveTransfersByZeroSumPartitions(fixture.balances, {
        subsetBudget: 2 ** participantCount - 1,
        transitionBudget: hybridWorkBudget,
      })
      const partitionMilliseconds = performance.now() - partitionStartedAt
      const backtrackingStartedAt = performance.now()
      const backtracking = optimizeTransfersByBacktracking(fixture.balances, {
        stateBudget: 500_000,
      })
      return {
        name: fixture.name,
        partitionMilliseconds,
        partition: compactPartitionResult(partition),
        backtrackingMilliseconds: performance.now() - backtrackingStartedAt,
        backtracking,
      }
    }),
    peakRssBytes: process.memoryUsage().rss,
  }
}

function warmUp(): void {
  const balances = [
    { participantId: 'warm-debtor', amount: -1000 },
    { participantId: 'warm-creditor', amount: 1000 },
  ]
  for (let index = 0; index < 5; index += 1) {
    optimizeTransfers(balances, { stateBudget: 50_000 })
  }
}

function summarizePartitionMetrics(measurements: readonly StoredMeasurement[]) {
  const metrics = measurements.flatMap(({ partitionMetrics }) =>
    partitionMetrics === undefined ? [] : [partitionMetrics],
  )
  const work = metrics.map(
    ({ evaluatedSubsets, partitionTransitions }) =>
      evaluatedSubsets + partitionTransitions,
  )
  const subsets = metrics.map(({ evaluatedSubsets }) => evaluatedSubsets)
  const partitionStates = metrics.map(({ partitionStates }) => partitionStates)
  const transitions = metrics.map(({ partitionTransitions }) => partitionTransitions)
  const workingBytes = metrics.map(({ estimatedWorkingBytes }) => estimatedWorkingBytes)
  return {
    cases: metrics.length,
    directIrreducibleProofs: metrics.filter(({ directIrreducibleProof }) =>
      Boolean(directIrreducibleProof),
    ).length,
    work: {
      median: percentile(work, 50),
      p90: percentile(work, 90),
      p95: percentile(work, 95),
      p99: percentile(work, 99),
      maximum: Math.max(...work),
    },
    evaluatedSubsets: {
      median: percentile(subsets, 50),
      p90: percentile(subsets, 90),
      p95: percentile(subsets, 95),
      p99: percentile(subsets, 99),
      maximum: Math.max(...subsets),
    },
    partitionStates: {
      median: percentile(partitionStates, 50),
      p90: percentile(partitionStates, 90),
      p95: percentile(partitionStates, 95),
      p99: percentile(partitionStates, 99),
      maximum: Math.max(...partitionStates),
    },
    partitionTransitions: {
      median: percentile(transitions, 50),
      p90: percentile(transitions, 90),
      p95: percentile(transitions, 95),
      p99: percentile(transitions, 99),
      maximum: Math.max(...transitions),
    },
    estimatedWorkingBytes: {
      median: percentile(workingBytes, 50),
      p95: percentile(workingBytes, 95),
      maximum: Math.max(...workingBytes),
    },
  }
}

function loadStoredMeasurements(directory: string): readonly StoredMeasurement[] {
  if (
    !existsSync(directory) ||
    !readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isFile())
  ) {
    return []
  }
  return readdirSync(directory)
    .filter((fileName) => /^batch-\d{3}\.json$/.test(fileName))
    .sort()
    .flatMap((batchFile) => {
      const checkpoint = JSON.parse(
        readFileSync(resolve(directory, batchFile), 'utf8'),
      ) as { readonly measurements: readonly StoredMeasurement[] }
      return checkpoint.measurements
    })
}

const mode = process.env.FINANCE_CORPUS_MODE
const solverMode = process.env.FINANCE_CORPUS_SOLVER ?? 'backtracking'
const resultDirectory = process.env.FINANCE_CORPUS_RESULT_DIR
if (resultDirectory === undefined)
  throw new Error('FINANCE_CORPUS_RESULT_DIR is required')
mkdirSync(resultDirectory, { recursive: true })

let reportTotal = 0
if (mode === 'batch') {
  const batchIndex = Number(process.env.FINANCE_CORPUS_BATCH_INDEX)
  const batchStart = Number(process.env.FINANCE_CORPUS_BATCH_START)
  const batchCount = Number(process.env.FINANCE_CORPUS_BATCH_COUNT)
  if (![batchIndex, batchStart, batchCount].every(Number.isSafeInteger)) {
    throw new Error('Batch coordinates must be safe integers')
  }

  warmUp()
  const rssStartBytes = process.memoryUsage().rss
  let peakRssBytes = rssStartBytes
  const storedMeasurements: StoredMeasurement[] = []
  for (let offset = 0; offset < batchCount; offset += 1) {
    const corpusCase = createCaseByGlobalIndex(batchStart + offset)
    storedMeasurements.push(
      solverMode === 'hybrid'
        ? measureHybridCase(corpusCase)
        : compactMeasurement(measureCase(corpusCase)),
    )
    peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss)
  }
  const checkpoint = {
    batchIndex,
    batchStart,
    batchCount,
    rssStartBytes,
    peakRssBytes,
    rssEndBytes: process.memoryUsage().rss,
    measurements: storedMeasurements,
  }
  writeFileSync(
    resolve(resultDirectory, `batch-${batchIndex.toString().padStart(3, '0')}.json`),
    JSON.stringify(checkpoint),
  )
  reportTotal = storedMeasurements.length
  console.log(
    `FINANCE_CORPUS_BATCH=${JSON.stringify({ ...checkpoint, measurements: undefined })}`,
  )
} else if (mode === 'adversarial') {
  warmUp()
  const checkpoint =
    solverMode === 'hybrid' ? measureHybridAdversarial() : measureAdversarialEscalation()
  writeFileSync(resolve(resultDirectory, 'adversarial.json'), JSON.stringify(checkpoint))
  reportTotal = 'results' in checkpoint ? checkpoint.results.length : 1
  console.log(`FINANCE_CORPUS_ADVERSARIAL=${JSON.stringify(checkpoint)}`)
} else if (mode === 'scaling') {
  const participantCount = Number(process.env.FINANCE_CORPUS_PARTICIPANT_COUNT)
  if (![14, 15, 16, 18, 20].includes(participantCount)) {
    throw new Error('Scaling participant count is invalid')
  }
  warmUp()
  const checkpoint = measureScalingSize(participantCount)
  writeFileSync(
    resolve(resultDirectory, `scaling-${participantCount}.json`),
    JSON.stringify(checkpoint),
  )
  reportTotal = checkpoint.fixtures.length
  console.log(`FINANCE_CORPUS_SCALING=${JSON.stringify(checkpoint)}`)
} else if (mode === 'aggregate') {
  const batchFiles = readdirSync(resultDirectory)
    .filter((fileName) => /^batch-\d{3}\.json$/.test(fileName))
    .sort()
  const measurements: StoredMeasurement[] = []
  const batchMemory: Array<{
    readonly batchIndex: number
    readonly rssStartBytes: number
    readonly peakRssBytes: number
    readonly rssEndBytes: number
  }> = []
  for (const batchFile of batchFiles) {
    const checkpoint = JSON.parse(
      readFileSync(resolve(resultDirectory, batchFile), 'utf8'),
    ) as {
      readonly batchIndex: number
      readonly rssStartBytes: number
      readonly peakRssBytes: number
      readonly rssEndBytes: number
      readonly measurements: readonly StoredMeasurement[]
    }
    measurements.push(...checkpoint.measurements)
    batchMemory.push({
      batchIndex: checkpoint.batchIndex,
      rssStartBytes: checkpoint.rssStartBytes,
      peakRssBytes: checkpoint.peakRssBytes,
      rssEndBytes: checkpoint.rssEndBytes,
    })
  }
  if (measurements.length !== 1040) {
    throw new Error(`Expected 1040 completed cases, found ${measurements.length}`)
  }
  const adversarial = JSON.parse(
    readFileSync(resolve(resultDirectory, 'adversarial.json'), 'utf8'),
  ) as unknown
  const realistic = measurements.filter(({ kind }) => kind === 'realistic')
  const synthetic = measurements.filter(({ kind }) => kind === 'synthetic')
  const peakValues = batchMemory.map(({ peakRssBytes }) => peakRssBytes)
  const rssGrowthValues = batchMemory.map(
    ({ rssStartBytes, rssEndBytes }) => rssEndBytes - rssStartBytes,
  )
  const activeBudgets = solverMode === 'hybrid' ? [hybridWorkBudget] : budgets
  const scaling =
    solverMode === 'hybrid'
      ? [14, 15, 16, 18, 20].map(
          (participantCount) =>
            JSON.parse(
              readFileSync(
                resolve(resultDirectory, `scaling-${participantCount}.json`),
                'utf8',
              ),
            ) as unknown,
        )
      : undefined
  const backtrackingMeasurements =
    solverMode === 'hybrid'
      ? loadStoredMeasurements(resolve(resultDirectory, '..', 'finance-corpus'))
      : []
  const hybridById = new Map(
    measurements.map((measurement) => [measurement.id, measurement]),
  )
  const backtrackingComparisons = backtrackingMeasurements.flatMap((measurement) => {
    const backtrackingExact = [...measurement.observations]
      .reverse()
      .find(({ status }) => status === 'exact')
    const hybrid = hybridById.get(measurement.id)
    const hybridExact = hybrid?.observations.find(({ status }) => status === 'exact')
    if (
      backtrackingExact?.exactTransferCount === undefined ||
      hybridExact?.exactTransferCount === undefined
    ) {
      return []
    }
    return [
      {
        id: measurement.id,
        backtracking: backtrackingExact.exactTransferCount,
        hybrid: hybridExact.exactTransferCount,
      },
    ]
  })
  const report = {
    solverMode,
    completedCases: measurements.length,
    failedCases: 0,
    composition: summarizeComposition(measurements),
    realisticByBudget: activeBudgets.map((budget) => summarizeBudget(realistic, budget)),
    syntheticByBudget: activeBudgets.map((budget) => summarizeBudget(synthetic, budget)),
    realisticByParticipantCount: Object.fromEntries(
      [14, 15].map((participantCount) => [
        participantCount,
        activeBudgets.map((budget) =>
          summarizeBudget(
            realistic.filter(
              (measurement) => measurement.participantCount === participantCount,
            ),
            budget,
          ),
        ),
      ]),
    ),
    realisticProfilesByBudget: Object.fromEntries(
      [...new Set(realistic.map(({ profile }) => profile))].map((profile) => [
        profile,
        activeBudgets.map((budget) =>
          summarizeBudget(
            realistic.filter((measurement) => measurement.profile === profile),
            budget,
          ),
        ),
      ]),
    ),
    allCasesGreedyQuality: summarizeGreedy(measurements),
    realisticGreedyQuality: summarizeGreedy(realistic),
    syntheticGreedyQuality: summarizeGreedy(synthetic),
    adversarialEscalation: adversarial,
    ...(solverMode === 'hybrid'
      ? {
          partitionMetrics: summarizePartitionMetrics(measurements),
          scaling,
          backtrackingComparison: {
            comparedExactCases: backtrackingComparisons.length,
            matchingCases: backtrackingComparisons.filter(
              ({ backtracking, hybrid }) => backtracking === hybrid,
            ).length,
            mismatches: backtrackingComparisons.filter(
              ({ backtracking, hybrid }) => backtracking !== hybrid,
            ),
          },
        }
      : {}),
    memoryByProcess: {
      batchCount: batchMemory.length,
      batchSize: 5,
      medianPeakRssBytes: percentile(peakValues, 50),
      p95PeakRssBytes: percentile(peakValues, 95),
      maximumPeakRssBytes: Math.max(...peakValues),
      medianRssGrowthBytes: percentile(rssGrowthValues, 50),
      p95RssGrowthBytes: percentile(rssGrowthValues, 95),
      maximumRssGrowthBytes: Math.max(...rssGrowthValues),
      maximumMemoizedStates: Math.max(
        ...measurements.flatMap(({ observations }) =>
          observations.map(({ memoizedStates }) => memoizedStates),
        ),
      ),
    },
  }
  writeFileSync(resolve(resultDirectory, 'report.json'), JSON.stringify(report, null, 2))
  reportTotal = measurements.length
  console.log(`FINANCE_CORPUS_REPORT=${JSON.stringify(report)}`)
} else {
  throw new Error('Use pnpm benchmark:finance:corpus to run or resume the corpus')
}

describe('finance corpus measurement', () => {
  bench(
    'report generated',
    () => {
      void reportTotal
    },
    {
      iterations: 1,
      warmupIterations: 0,
    },
  )
})
