import { describe, expect, it, vi } from 'vitest'
import { invalidateExpenseQueries } from './expense-queries'
describe('expense query invalidation', () => {
  it('invalidates list, event summary, and edited expense', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    await invalidateExpenseQueries({ invalidateQueries } as never, 'event', 'expense')
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['expenses', 'event'],
    })
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['event', 'event'] })
    expect(invalidateQueries).toHaveBeenNthCalledWith(3, {
      queryKey: ['expense', 'event', 'expense'],
    })
  })
  it('invalidates list and summary after create or delete', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    await invalidateExpenseQueries({ invalidateQueries } as never, 'event')
    expect(invalidateQueries).toHaveBeenCalledTimes(2)
  })
})
