import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { getExpense, listExpenses } from './expense-service'

export const expensesKey = (eventId: string) => ['expenses', eventId] as const
export const expenseKey = (eventId: string, expenseId: string) =>
  ['expense', eventId, expenseId] as const

export async function invalidateExpenseQueries(
  client: Pick<QueryClient, 'invalidateQueries'>,
  eventId: string,
  expenseId?: string,
) {
  await Promise.all([
    client.invalidateQueries({ queryKey: expensesKey(eventId) }),
    client.invalidateQueries({ queryKey: ['event', eventId] }),
    ...(expenseId
      ? [client.invalidateQueries({ queryKey: expenseKey(eventId, expenseId) })]
      : []),
  ])
}

export function useExpenses(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? expensesKey(eventId) : ['expenses', 'missing'],
    queryFn: () => listExpenses(supabase, eventId!),
    enabled: Boolean(eventId),
    refetchOnWindowFocus: true,
  })
}

export function useExpense(eventId: string | undefined, expenseId: string | undefined) {
  return useQuery({
    queryKey:
      eventId && expenseId ? expenseKey(eventId, expenseId) : ['expense', 'missing'],
    queryFn: () => getExpense(supabase, eventId!, expenseId!),
    enabled: Boolean(eventId && expenseId),
    refetchOnWindowFocus: true,
  })
}
