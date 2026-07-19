import { describe, expect, it } from 'vitest'
import { expenseFormSchema } from './expense-schemas'
const id = '10000000-0000-4000-8000-000000000001'
describe('expense form schema', () => {
  it('rejects duplicate payers', () => {
    const result = expenseFormSchema.safeParse({
      concept: 'Cena',
      category: 'food',
      amount: 1750,
      payers: [
        { participantId: id, amount: 1000 },
        { participantId: id, amount: 750 },
      ],
      participantIds: [id],
    })
    expect(result.success).toBe(false)
  })
  it('accepts exact integer amounts outside $500 steps', () => {
    expect(
      expenseFormSchema.safeParse({
        concept: 'Cena',
        category: 'food',
        amount: 20001,
        payers: [{ participantId: id, amount: 20001 }],
        participantIds: [id],
      }).success,
    ).toBe(true)
  })
})
