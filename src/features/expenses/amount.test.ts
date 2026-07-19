import { describe, expect, it } from 'vitest'
import { parseAmount, roundToExpenseAmount } from './amount'

describe('expense amount input', () => {
  it('accepts plain pesos and compact thousands', () => {
    expect(parseAmount('10000')).toBe(10000)
    expect(parseAmount('$10k')).toBe(10000)
    expect(parseAmount('10.000')).toBe(10000)
  })

  it('preserves exact integer input', () => {
    expect(roundToExpenseAmount(1600)).toBe(1600)
    expect(roundToExpenseAmount(1750)).toBe(1750)
    expect(roundToExpenseAmount(1900)).toBe(1900)
  })

  it('rejects non-positive and invalid inputs', () => {
    expect(parseAmount('10.5k')).toBeNull()
    expect(roundToExpenseAmount(0)).toBeNull()
    expect(roundToExpenseAmount(-500)).toBeNull()
  })
})
