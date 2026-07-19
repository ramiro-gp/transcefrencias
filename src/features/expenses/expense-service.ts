import { supabase } from '../../lib/supabase/client'
import type { ExpenseCategory } from './expense-categories'

type ExpenseClient = Pick<typeof supabase, 'from' | 'rpc'>

export interface EventExpense {
  readonly id: string
  readonly concept: string
  readonly category: ExpenseCategory
  readonly amount: number
  readonly payers: readonly { readonly participantId: string; readonly amount: number }[]
  readonly participantIds: readonly string[]
  readonly createdBy: string
  readonly revision: number
  readonly createdAt: string
}

export class ExpenseRequestError extends Error {
  constructor(message = 'No pudimos completar el gasto. Intentá de nuevo.') {
    super(message)
    this.name = 'ExpenseRequestError'
  }
}

export async function listExpenses(
  client: ExpenseClient,
  eventId: string,
): Promise<EventExpense[]> {
  const { data, error } = await client
    .from('expenses')
    .select(
      'id, concept, category, amount, created_by, revision, created_at, expense_participants(participant_id), expense_payers(participant_id, amount)',
    )
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error || !data) throw new ExpenseRequestError('No pudimos cargar los gastos.')
  return data.map((expense) => ({
    id: expense.id,
    concept: expense.concept,
    category: expense.category as ExpenseCategory,
    amount: expense.amount,
    payers: expense.expense_payers.map((item) => ({
      participantId: item.participant_id,
      amount: item.amount,
    })),
    participantIds: expense.expense_participants.map((item) => item.participant_id),
    createdBy: expense.created_by,
    revision: expense.revision,
    createdAt: expense.created_at,
  }))
}

export async function getExpense(
  client: ExpenseClient,
  eventId: string,
  expenseId: string,
) {
  const expenses = await listExpenses(client, eventId)
  const expense = expenses.find((item) => item.id === expenseId)
  if (!expense) throw new ExpenseRequestError('No encontramos ese gasto.')
  return expense
}

export async function createExpense(
  client: ExpenseClient,
  eventId: string,
  values: Omit<EventExpense, 'id' | 'createdBy' | 'revision' | 'createdAt'>,
) {
  const { error } = await client.rpc('create_expense', {
    target_event_id: eventId,
    expense_concept: values.concept.trim(),
    expense_category: values.category,
    expense_amount: values.amount,
    expense_payer_ids: values.payers.map((payer) => payer.participantId),
    expense_payer_amounts: values.payers.map((payer) => payer.amount),
    expense_participant_ids: [...values.participantIds],
  })
  if (error) throw new ExpenseRequestError(error.message)
}

export async function updateExpense(
  client: ExpenseClient,
  expense: EventExpense,
  values: Omit<EventExpense, 'id' | 'createdBy' | 'revision' | 'createdAt'>,
) {
  const { error } = await client.rpc('update_expense', {
    target_expense_id: expense.id,
    expected_revision: expense.revision,
    expense_concept: values.concept.trim(),
    expense_category: values.category,
    expense_amount: values.amount,
    expense_payer_ids: values.payers.map((payer) => payer.participantId),
    expense_payer_amounts: values.payers.map((payer) => payer.amount),
    expense_participant_ids: [...values.participantIds],
  })
  if (error) throw new ExpenseRequestError(error.message)
}

export async function deleteExpense(client: ExpenseClient, expense: EventExpense) {
  const { error } = await client.rpc('delete_expense', {
    target_expense_id: expense.id,
    expected_revision: expense.revision,
  })
  if (error) throw new ExpenseRequestError(error.message)
}
