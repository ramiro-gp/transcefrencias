export type FinanceErrorCode =
  | 'empty-payers'
  | 'duplicate-payer'
  | 'invalid-payer-amount'
  | 'payer-total-mismatch'
  | 'duplicate-participant'
  | 'invalid-participant-id'
  | 'unknown-participant'
  | 'duplicate-expense'
  | 'invalid-expense-id'
  | 'invalid-expense-amount'
  | 'empty-consumers'
  | 'duplicate-consumer'
  | 'duplicate-balance'
  | 'unbalanced-balances'
  | 'unsafe-money-total'
  | 'invalid-state-budget'

export class FinanceDomainError extends Error {
  readonly code: FinanceErrorCode
  readonly context: Readonly<Record<string, string | number>>

  constructor(
    code: FinanceErrorCode,
    message: string,
    context: Readonly<Record<string, string | number>> = {},
  ) {
    super(message)
    this.name = 'FinanceDomainError'
    this.code = code
    this.context = context
  }
}
