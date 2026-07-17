import { applyMovements } from './apply-movements'
import { calculateOriginalBalances } from './calculate-balances'
import { optimizeTransfers } from './optimize-transfers'
import type { OptimizationOptions, SettlementInput, SettlementResult } from './types'

export function calculateSettlement(
  input: SettlementInput,
  options: OptimizationOptions = {},
): SettlementResult {
  const original = calculateOriginalBalances(input)
  const pending = applyMovements({
    originalBalances: original.balances,
    movements: input.movements,
  })
  const optimization = optimizeTransfers(pending.balances, options)
  return { original, pending, optimization }
}
