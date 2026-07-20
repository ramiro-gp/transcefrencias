export type ParticipantId = string
export type ExpenseId = string
export type Money = number
export interface ExpensePayer {
  readonly participantId: ParticipantId
  readonly amount: Money
}

export interface Expense {
  readonly id: ExpenseId
  readonly amount: Money
  readonly payers: readonly ExpensePayer[]
  readonly consumerIds: readonly ParticipantId[]
}

export interface ExpenseShare {
  readonly participantId: ParticipantId
  readonly amount: Money
}

export interface ExpenseContribution {
  readonly expenseId: ExpenseId
  readonly paidAmount: Money
  readonly consumedAmount: Money
  readonly netAmount: Money
}

export interface ExpenseBreakdown {
  readonly expenseId: ExpenseId
  readonly amount: Money
  readonly payers: readonly ExpensePayer[]
  readonly shares: readonly ExpenseShare[]
}

export interface Balance {
  readonly participantId: ParticipantId
  readonly amount: Money
}

export interface ParticipantOriginalBalance extends Balance {
  readonly paidAmount: Money
  readonly consumedAmount: Money
  readonly contributions: readonly ExpenseContribution[]
}

export interface OriginalBalanceInput {
  readonly participantIds: readonly ParticipantId[]
  readonly expenses: readonly Expense[]
}

export interface OriginalBalanceResult {
  readonly balances: readonly ParticipantOriginalBalance[]
  readonly expenseBreakdowns: readonly ExpenseBreakdown[]
}

export interface SuggestedTransfer {
  readonly fromId: ParticipantId
  readonly toId: ParticipantId
  readonly amount: Money
}

export interface OptimizationOptions {
  readonly stateBudget?: number
}

export interface OptimizationMetrics {
  readonly exploredStates: number
  readonly memoizedStates: number
  readonly maximumDepth: number
}

export interface ExactOptimizationResult {
  readonly status: 'exact'
  readonly minimumTransferCount: number
  readonly transfers: readonly SuggestedTransfer[]
  readonly metrics: OptimizationMetrics
}

export interface OptimizationBudgetExceededResult {
  readonly status: 'budget-exceeded'
  readonly stateBudget: number
  readonly metrics: OptimizationMetrics
}

export type OptimizationResult =
  ExactOptimizationResult | OptimizationBudgetExceededResult
