import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../app/auth-context'
import { ExpenseForm } from '../features/expenses/expense-form'
import {
  invalidateExpenseQueries,
  useExpense,
} from '../features/expenses/expense-queries'
import { createExpense, updateExpense } from '../features/expenses/expense-service'
import type { ExpenseFormValues } from '../features/expenses/expense-schemas'
import { useEventDetail } from '../features/events/event-queries'
import { supabase } from '../lib/supabase/client'

export function ExpenseFormPage() {
  const { eventId, expenseId } = useParams()
  const { user } = useAuth()
  const event = useEventDetail(eventId, user?.id ?? null)
  const expense = useExpense(eventId, expenseId)
  const editing = Boolean(expenseId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (values: ExpenseFormValues) =>
      editing
        ? updateExpense(supabase, expense.data!, values)
        : createExpense(supabase, eventId!, values),
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient, eventId!, expenseId)
      void navigate(`/eventos/${eventId}`)
    },
  })
  if (event.isLoading || (editing && expense.isLoading))
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">GASTO</p>
        <p>ABRIENDO GASTO…</p>
      </section>
    )
  if (event.isError || !event.data || (editing && (expense.isError || !expense.data)))
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">GASTO</p>
        <p>
          {event.error?.message ?? expense.error?.message ?? 'No encontramos el gasto.'}
        </p>
        <Link className="button" to={`/eventos/${eventId}`}>
          VOLVER AL EVENTO
        </Link>
      </section>
    )
  const initialValues: ExpenseFormValues = editing
    ? {
        concept: expense.data!.concept,
        category: expense.data!.category,
        amount: expense.data!.amount,
        payers: [...expense.data!.payers],
        participantIds: [...expense.data!.participantIds],
      }
    : {
        concept: '',
        category: 'food',
        amount: 20000,
        payers: [
          {
            participantId:
              event.data.participants.find(
                (item) => item.profileId === user?.id && item.active,
              )?.id ?? '',
            amount: 20000,
          },
        ],
        participantIds: event.data.participants
          .filter((item) => item.active)
          .map((item) => item.id),
      }
  return (
    <section className="form-page" aria-labelledby="expense-form-title">
      <p className="eyebrow">{editing ? 'EDITAR GASTO' : 'NUEVO GASTO'}</p>
      <h1 id="expense-form-title">{event.data.name}</h1>
      {mutation.isError && (
        <p className="form-feedback" role="alert">
          {mutation.error.message}{' '}
          <button
            className="link-inline"
            type="button"
            onClick={() => void (editing ? expense.refetch() : event.refetch())}
          >
            RECARGAR
          </button>
        </p>
      )}
      <ExpenseForm
        participants={event.data.participants}
        initialValues={initialValues}
        submitLabel={editing ? 'GUARDAR CAMBIOS' : 'CARGAR GASTO'}
        isPending={mutation.isPending}
        onSubmit={(values) => mutation.mutate(values)}
      />
      <Link className="link-button" to={`/eventos/${eventId}`}>
        CANCELAR
      </Link>
    </section>
  )
}
