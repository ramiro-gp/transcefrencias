import { describe, expect, it, vi } from 'vitest'
import { createExpense, listExpenses, updateExpense } from './expense-service'

function queryResult(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data, error: null })),
  }
  return query
}
const expense = {
  id: 'e1',
  concept: 'Cena',
  category: 'food' as const,
  amount: 1750,
  payers: [
    { participantId: 'p1', amount: 1000 },
    { participantId: 'p2', amount: 750 },
  ],
  participantIds: ['p1', 'p2'],
  createdBy: 'u1',
  revision: 2,
  createdAt: 'now',
}

describe('expense service', () => {
  it('maps all payers returned by Supabase', async () => {
    const from = vi.fn(() =>
      queryResult([
        {
          id: 'e1',
          concept: 'Cena',
          category: 'food',
          amount: 1750,
          created_by: 'u1',
          revision: 2,
          created_at: 'now',
          expense_participants: [{ participant_id: 'p1' }, { participant_id: 'p2' }],
          expense_payers: [
            { participant_id: 'p1', amount: 1000 },
            { participant_id: 'p2', amount: 750 },
          ],
        },
      ]),
    )
    await expect(listExpenses({ from } as never, 'event')).resolves.toEqual([expense])
  })
  it('sends parallel payer arrays to create and update RPCs', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    await createExpense({ rpc } as never, 'event', expense)
    expect(rpc).toHaveBeenCalledWith(
      'create_expense',
      expect.objectContaining({
        expense_payer_ids: ['p1', 'p2'],
        expense_payer_amounts: [1000, 750],
      }),
    )
    await updateExpense({ rpc } as never, expense, expense)
    expect(rpc).toHaveBeenCalledWith(
      'update_expense',
      expect.objectContaining({
        expected_revision: 2,
        expense_payer_ids: ['p1', 'p2'],
        expense_payer_amounts: [1000, 750],
      }),
    )
  })
  it('surfaces optimistic revision conflicts', async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: {
        message: 'This expense changed. Reload the current data before saving.',
      },
    })
    await expect(updateExpense({ rpc } as never, expense, expense)).rejects.toThrow(
      /changed.*Reload/i,
    )
  })
})
