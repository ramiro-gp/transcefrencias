import {
  compareSuggestedTransfers,
  settleZeroSumGroupDeterministically,
} from './greedy-reference'
import { FinanceDomainError } from './errors'
import type { Balance, SuggestedTransfer } from './types'
import { validateBalances } from './validation'

const MAX_MASK_PARTICIPANTS = 20

export interface ZeroSumPartitionOptions {
  readonly subsetBudget?: number
  readonly partitionStateBudget?: number
  readonly transitionBudget?: number
}

export interface ZeroSumPartitionMetrics {
  readonly participantCount: number
  readonly allocatedMaskCount: number
  readonly evaluatedSubsets: number
  readonly zeroSumSubsets: number
  readonly partitionStates: number
  readonly memoizedStates: number
  readonly partitionTransitions: number
  readonly maximumDepth: number
  readonly estimatedWorkingBytes: number
  readonly directIrreducibleProof: boolean
}

export interface ExactZeroSumPartitionResult {
  readonly status: 'exact'
  readonly minimumTransferCount: number
  readonly groups: readonly (readonly string[])[]
  readonly transfers: readonly SuggestedTransfer[]
  readonly metrics: ZeroSumPartitionMetrics
}

export interface ZeroSumPartitionBudgetExceededResult {
  readonly status: 'budget-exceeded'
  readonly reason: 'subset-budget' | 'partition-state-budget' | 'transition-budget'
  readonly metrics: ZeroSumPartitionMetrics
}

export interface ZeroSumPartitionUnsupportedResult {
  readonly status: 'unsupported'
  readonly participantCount: number
  readonly maximumSupportedParticipants: number
}

export type ZeroSumPartitionResult =
  | ExactZeroSumPartitionResult
  | ZeroSumPartitionBudgetExceededResult
  | ZeroSumPartitionUnsupportedResult

class TransitionBudgetExceeded extends Error {}
class PartitionStateBudgetExceeded extends Error {}

function compareMasksLexicographically(
  left: number,
  right: number,
  count: number,
): number {
  const leftIndexes: number[] = []
  const rightIndexes: number[] = []
  for (let index = 0; index < count; index += 1) {
    const bit = 1 << index
    if ((left & bit) !== 0) leftIndexes.push(index)
    if ((right & bit) !== 0) rightIndexes.push(index)
  }
  const commonLength = Math.min(leftIndexes.length, rightIndexes.length)
  for (let index = 0; index < commonLength; index += 1) {
    const leftIndex = leftIndexes[index]
    const rightIndex = rightIndexes[index]
    if (leftIndex === undefined || rightIndex === undefined) break
    if (leftIndex !== rightIndex) return leftIndex - rightIndex
  }
  return leftIndexes.length - rightIndexes.length
}

function validateBudget(value: number | undefined, name: string): void {
  if (value === undefined) return
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new FinanceDomainError(
      'invalid-state-budget',
      `${name} must be a non-negative safe integer`,
      { [name]: value },
    )
  }
}

export function solveTransfersByZeroSumPartitions(
  balances: readonly Balance[],
  { subsetBudget, partitionStateBudget, transitionBudget }: ZeroSumPartitionOptions = {},
): ZeroSumPartitionResult {
  validateBudget(subsetBudget, 'subsetBudget')
  validateBudget(partitionStateBudget, 'partitionStateBudget')
  validateBudget(transitionBudget, 'transitionBudget')
  const entries = validateBalances(balances).filter(({ amount }) => amount !== 0)
  const participantCount = entries.length
  if (participantCount > MAX_MASK_PARTICIPANTS) {
    return {
      status: 'unsupported',
      participantCount,
      maximumSupportedParticipants: MAX_MASK_PARTICIPANTS,
    }
  }

  const maskCount = 2 ** participantCount
  const requiredSubsets = maskCount - 1
  const emptyMetrics: ZeroSumPartitionMetrics = {
    participantCount,
    allocatedMaskCount: 0,
    evaluatedSubsets: 0,
    zeroSumSubsets: 0,
    partitionStates: 0,
    memoizedStates: 0,
    partitionTransitions: 0,
    maximumDepth: 0,
    estimatedWorkingBytes: 0,
    directIrreducibleProof: false,
  }
  if (subsetBudget !== undefined && requiredSubsets > subsetBudget) {
    return { status: 'budget-exceeded', reason: 'subset-budget', metrics: emptyMetrics }
  }
  if (participantCount === 0) {
    return {
      status: 'exact',
      minimumTransferCount: 0,
      groups: [],
      transfers: [],
      metrics: emptyMetrics,
    }
  }

  const fullMask = maskCount - 1
  const subsetSums = new Float64Array(maskCount)
  const maximumGroups = new Int16Array(maskCount)
  const chosenGroup = new Int32Array(maskCount)
  maximumGroups.fill(-1)
  chosenGroup.fill(-1)
  maximumGroups[0] = 0
  const zeroMasksByParticipant = Array.from(
    { length: participantCount },
    (): number[] => [],
  )
  let zeroSumSubsets = 0

  for (let mask = 1; mask <= fullMask; mask += 1) {
    const lowestBit = mask & -mask
    const participantIndex = 31 - Math.clz32(lowestBit)
    const entry = entries[participantIndex]
    if (entry === undefined) throw new Error('Subset participant is missing')
    const previousSum = subsetSums[mask ^ lowestBit]
    if (previousSum === undefined) throw new Error('Previous subset sum is missing')
    subsetSums[mask] = previousSum + entry.amount
    if (subsetSums[mask] !== 0) continue
    zeroSumSubsets += 1
    for (let index = 0; index < participantCount; index += 1) {
      if ((mask & (1 << index)) !== 0) zeroMasksByParticipant[index]?.push(mask)
    }
  }
  for (const masks of zeroMasksByParticipant) {
    masks.sort((left, right) =>
      compareMasksLexicographically(left, right, participantCount),
    )
  }

  let partitionStates = 0
  let memoizedStates = 1
  let partitionTransitions = 0
  let maximumDepth = 0
  const estimatedWorkingBytes =
    subsetSums.byteLength +
    maximumGroups.byteLength +
    chosenGroup.byteLength +
    zeroMasksByParticipant.reduce((sum, masks) => sum + masks.length * 8, 0)

  function metrics(directIrreducibleProof: boolean): ZeroSumPartitionMetrics {
    return {
      participantCount,
      allocatedMaskCount: maskCount,
      evaluatedSubsets: requiredSubsets,
      zeroSumSubsets,
      partitionStates,
      memoizedStates,
      partitionTransitions,
      maximumDepth,
      estimatedWorkingBytes,
      directIrreducibleProof,
    }
  }

  function buildTransfers(groupMasks: readonly number[]) {
    const groups = groupMasks.map((groupMask) =>
      entries.filter((_, index) => (groupMask & (1 << index)) !== 0),
    )
    const transfers = groups.flatMap((group) => {
      const groupTransfers = settleZeroSumGroupDeterministically(group)
      if (groupTransfers.length !== group.length - 1) {
        throw new Error('Maximum zero-sum partition produced a reducible group')
      }
      return groupTransfers
    })
    return {
      groups: groups.map((group) => group.map(({ participantId }) => participantId)),
      transfers: transfers.sort(compareSuggestedTransfers),
    }
  }

  if (zeroSumSubsets === 1) {
    if (partitionStateBudget !== undefined && partitionStateBudget < 1) {
      return {
        status: 'budget-exceeded',
        reason: 'partition-state-budget',
        metrics: metrics(true),
      }
    }
    partitionStates = 1
    const settlement = buildTransfers([fullMask])
    return {
      status: 'exact',
      minimumTransferCount: participantCount - 1,
      ...settlement,
      metrics: metrics(true),
    }
  }

  function findMaximumGroups(mask: number, depth: number): number {
    const cached = maximumGroups[mask]
    if (cached !== undefined && cached >= 0) return cached
    if (partitionStateBudget !== undefined && partitionStates >= partitionStateBudget) {
      throw new PartitionStateBudgetExceeded()
    }
    partitionStates += 1
    maximumDepth = Math.max(maximumDepth, depth)
    const anchorBit = mask & -mask
    const anchorIndex = 31 - Math.clz32(anchorBit)
    const candidates = zeroMasksByParticipant[anchorIndex]
    if (candidates === undefined) throw new Error('Partition candidates are missing')
    let bestGroupCount = -1
    let bestGroupMask = -1

    for (const groupMask of candidates) {
      if ((groupMask & mask) !== groupMask) continue
      if (transitionBudget !== undefined && partitionTransitions >= transitionBudget) {
        throw new TransitionBudgetExceeded()
      }
      partitionTransitions += 1
      const groupCount = 1 + findMaximumGroups(mask ^ groupMask, depth + 1)
      if (groupCount > bestGroupCount) {
        bestGroupCount = groupCount
        bestGroupMask = groupMask
      }
    }
    if (bestGroupMask < 0) throw new Error('Zero-sum partition is incomplete')
    maximumGroups[mask] = bestGroupCount
    chosenGroup[mask] = bestGroupMask
    memoizedStates += 1
    return bestGroupCount
  }

  try {
    const groupCount = findMaximumGroups(fullMask, 0)
    const groupMasks: number[] = []
    let remainingMask = fullMask
    while (remainingMask !== 0) {
      const groupMask = chosenGroup[remainingMask]
      if (groupMask === undefined || groupMask <= 0) {
        throw new Error('Partition reconstruction is incomplete')
      }
      groupMasks.push(groupMask)
      remainingMask ^= groupMask
    }
    const settlement = buildTransfers(groupMasks)
    return {
      status: 'exact',
      minimumTransferCount: participantCount - groupCount,
      ...settlement,
      metrics: metrics(false),
    }
  } catch (error) {
    if (
      !(error instanceof TransitionBudgetExceeded) &&
      !(error instanceof PartitionStateBudgetExceeded)
    ) {
      throw error
    }
    return {
      status: 'budget-exceeded',
      reason:
        error instanceof PartitionStateBudgetExceeded
          ? 'partition-state-budget'
          : 'transition-budget',
      metrics: metrics(false),
    }
  }
}
