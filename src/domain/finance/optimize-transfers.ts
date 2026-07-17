import { FinanceDomainError } from './errors'
import {
  calculateGreedyTransferReference,
  compareSuggestedTransfers,
} from './greedy-reference'
import type {
  Balance,
  ExactOptimizationResult,
  OptimizationMetrics,
  OptimizationOptions,
  OptimizationResult,
  ParticipantId,
  SuggestedTransfer,
} from './types'
import { compareIds, validateBalances } from './validation'
import { solveTransfersByZeroSumPartitions } from './zero-sum-partition'

export const HYBRID_PARTITION_MAX_PARTICIPANTS = 15

interface SearchEntry {
  readonly participantId: ParticipantId
  readonly amount: number
}

interface SearchSolution {
  readonly count: number
  readonly transfers: readonly SuggestedTransfer[]
}

class StateBudgetExceeded extends Error {}

function stateKey(state: readonly SearchEntry[]): string {
  return state.map((entry) => entry.amount).join(',')
}

function lowerBound(state: readonly SearchEntry[]): number {
  let debtors = 0
  let creditors = 0
  for (const entry of state) {
    if (entry.amount < 0) debtors += 1
    if (entry.amount > 0) creditors += 1
  }
  return Math.max(debtors, creditors)
}

function applyTransfer(
  state: readonly SearchEntry[],
  firstIndex: number,
  counterpartIndex: number,
): { readonly state: readonly SearchEntry[]; readonly transfer: SuggestedTransfer } {
  const first = state[firstIndex]
  const counterpart = state[counterpartIndex]
  if (first === undefined || counterpart === undefined) {
    throw new Error('Search entry is missing')
  }
  const amount = Math.min(Math.abs(first.amount), Math.abs(counterpart.amount))
  const next = state.map((entry) => ({ ...entry }))
  const nextFirst = next[firstIndex]
  const nextCounterpart = next[counterpartIndex]
  if (nextFirst === undefined || nextCounterpart === undefined) {
    throw new Error('Copied search entry is missing')
  }

  if (first.amount < 0) {
    next[firstIndex] = { ...nextFirst, amount: nextFirst.amount + amount }
    next[counterpartIndex] = {
      ...nextCounterpart,
      amount: nextCounterpart.amount - amount,
    }
    return {
      state: next,
      transfer: { fromId: first.participantId, toId: counterpart.participantId, amount },
    }
  }

  next[firstIndex] = { ...nextFirst, amount: nextFirst.amount - amount }
  next[counterpartIndex] = {
    ...nextCounterpart,
    amount: nextCounterpart.amount + amount,
  }
  return {
    state: next,
    transfer: { fromId: counterpart.participantId, toId: first.participantId, amount },
  }
}

export function optimizeTransfersByBacktracking(
  balances: readonly Balance[],
  { stateBudget }: OptimizationOptions = {},
): OptimizationResult {
  if (
    stateBudget !== undefined &&
    (!Number.isSafeInteger(stateBudget) || stateBudget < 0)
  ) {
    throw new FinanceDomainError(
      'invalid-state-budget',
      'State budget must be a non-negative safe integer',
      { stateBudget },
    )
  }

  const sortedBalances = validateBalances(balances)
  const initialState: readonly SearchEntry[] = sortedBalances.map((balance) => ({
    participantId: balance.participantId,
    amount: balance.amount,
  }))
  const memo = new Map<string, SearchSolution>()
  let exploredStates = 0
  let maximumDepth = 0

  function search(state: readonly SearchEntry[], depth: number): SearchSolution {
    const key = stateKey(state)
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    if (stateBudget !== undefined && exploredStates >= stateBudget) {
      throw new StateBudgetExceeded()
    }

    exploredStates += 1
    maximumDepth = Math.max(maximumDepth, depth)
    const firstIndex = state.findIndex((entry) => entry.amount !== 0)
    if (firstIndex === -1) {
      const solution = { count: 0, transfers: [] }
      memo.set(key, solution)
      return solution
    }

    const greedyTransfers = calculateGreedyTransferReference(
      state.map((entry) => ({
        participantId: entry.participantId,
        amount: entry.amount,
      })),
    )
    let best: SearchSolution = {
      count: greedyTransfers.length,
      transfers: greedyTransfers,
    }
    const first = state[firstIndex]
    if (first === undefined) throw new Error('First search entry is missing')
    const counterpartIndexes = state
      .map((entry, index) => ({ entry, index }))
      .filter(
        ({ entry }) =>
          (entry.amount < 0 && first.amount > 0) ||
          (entry.amount > 0 && first.amount < 0),
      )
      .sort((left, right) => {
        const leftExact = left.entry.amount + first.amount === 0
        const rightExact = right.entry.amount + first.amount === 0
        if (leftExact !== rightExact) return leftExact ? -1 : 1
        return compareIds(left.entry.participantId, right.entry.participantId)
      })

    const seenCounterpartAmounts = new Set<number>()
    for (const { entry, index } of counterpartIndexes) {
      if (seenCounterpartAmounts.has(entry.amount)) continue
      seenCounterpartAmounts.add(entry.amount)

      const transition = applyTransfer(state, firstIndex, index)
      if (1 + lowerBound(transition.state) >= best.count) continue
      const remainder = search(transition.state, depth + 1)
      const candidateCount = 1 + remainder.count
      if (candidateCount < best.count) {
        best = {
          count: candidateCount,
          transfers: [transition.transfer, ...remainder.transfers],
        }
      }
      if (best.count === lowerBound(state)) break
    }

    memo.set(key, best)
    return best
  }

  try {
    const solution = search(initialState, 0)
    const metrics: OptimizationMetrics = {
      exploredStates,
      memoizedStates: memo.size,
      maximumDepth,
    }
    const result: ExactOptimizationResult = {
      status: 'exact',
      minimumTransferCount: solution.count,
      transfers: [...solution.transfers].sort(compareSuggestedTransfers),
      metrics,
    }
    return result
  } catch (error) {
    if (!(error instanceof StateBudgetExceeded) || stateBudget === undefined) throw error
    return {
      status: 'budget-exceeded',
      stateBudget,
      metrics: {
        exploredStates,
        memoizedStates: memo.size,
        maximumDepth,
      },
    }
  }
}

export function optimizeTransfers(
  balances: readonly Balance[],
  options: OptimizationOptions = {},
): OptimizationResult {
  if (
    options.stateBudget !== undefined &&
    (!Number.isSafeInteger(options.stateBudget) || options.stateBudget < 0)
  ) {
    throw new FinanceDomainError(
      'invalid-state-budget',
      'State budget must be a non-negative safe integer',
      { stateBudget: options.stateBudget },
    )
  }
  const nonZeroCount = validateBalances(balances).filter(
    ({ amount }) => amount !== 0,
  ).length
  if (nonZeroCount > HYBRID_PARTITION_MAX_PARTICIPANTS) {
    return optimizeTransfersByBacktracking(balances, options)
  }

  if (options.stateBudget === 0) {
    return {
      status: 'budget-exceeded',
      stateBudget: 0,
      metrics: { exploredStates: 0, memoizedStates: 0, maximumDepth: 0 },
    }
  }
  const partitionResult = solveTransfersByZeroSumPartitions(balances, {
    ...(options.stateBudget === undefined
      ? {}
      : { partitionStateBudget: options.stateBudget }),
  })
  if (partitionResult.status === 'unsupported') {
    return optimizeTransfersByBacktracking(balances, options)
  }

  const metrics: OptimizationMetrics = {
    exploredStates: partitionResult.metrics.partitionStates,
    memoizedStates: partitionResult.metrics.memoizedStates,
    maximumDepth: partitionResult.metrics.maximumDepth,
  }
  if (partitionResult.status === 'budget-exceeded') {
    if (options.stateBudget === undefined) {
      throw new Error('Unbudgeted partition optimization was interrupted')
    }
    return {
      status: 'budget-exceeded',
      stateBudget: options.stateBudget,
      metrics,
    }
  }
  return {
    status: 'exact',
    minimumTransferCount: partitionResult.minimumTransferCount,
    transfers: partitionResult.transfers,
    metrics,
  }
}
