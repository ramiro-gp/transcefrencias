import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { splitExpense } from '../../domain/finance/split-expense'
import type { Participant } from '../events/event-service'
import {
  formatCompactMoney,
  formatMoney,
  parseAmount,
  roundToExpenseAmount,
} from './amount'
import { expenseCategories } from './expense-categories'
import { expenseFormSchema, type ExpenseFormValues } from './expense-schemas'

type Props = {
  readonly participants: readonly Participant[]
  readonly initialValues: ExpenseFormValues
  readonly submitLabel: string
  readonly isPending: boolean
  readonly onSubmit: (v: ExpenseFormValues) => void
}
function equal(total: number, count: number) {
  const base = Math.floor(total / count),
    rest = total % count
  return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0))
}
export function ExpenseForm({
  participants,
  initialValues,
  submitLabel,
  isPending,
  onSubmit,
}: Props) {
  const [editing, setEditing] = useState(false),
    [text, setText] = useState(''),
    [payerTexts, setPayerTexts] = useState<Record<string, string>>({})
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    values: initialValues,
  })
  const { fields, replace } = useFieldArray({ control: form.control, name: 'payers' })
  const values = useWatch({ control: form.control })
  const amount = values.amount ?? 0,
    payers = (values.payers ?? []) as { participantId: string; amount: number }[],
    selected = values.participantIds ?? [],
    active = participants.filter((p) => p.active),
    visible = participants.filter(
      (p) =>
        p.active ||
        payers.some((x) => x.participantId === p.id) ||
        selected.includes(p.id),
    )
  const transientPayers = payers.map((payer, index) => {
    const fieldId = fields[index]?.id
    const transient = fieldId ? payerTexts[fieldId] : undefined
    return transient === undefined ? payer.amount : (parseAmount(transient) ?? 0)
  })
  const hasInvalidPayerText = Object.values(payerTexts).some(
    (value) => parseAmount(value) === null,
  )
  const reported = transientPayers.reduce((s, amount) => s + amount, 0),
    difference = amount - reported
  const setAmount = (next: number) => {
    if (next <= 0) return
    form.setValue('amount', next, { shouldValidate: true })
    replace(
      payers.map((payer, i) => ({
        ...payer,
        amount: equal(next, payers.length)[i] ?? 0,
      })),
    )
  }
  const confirmAmountText = () => {
    const parsed = parseAmount(text)
    const next = parsed === null ? null : roundToExpenseAmount(parsed)
    if (next === null) {
      form.setError('amount', { message: 'Ingresá un importe entero positivo válido.' })
      return
    }
    form.clearErrors('amount')
    setAmount(next)
    setText(String(next))
    setEditing(false)
  }
  const confirmPayerText = (index: number, fieldId: string) => {
    const raw = payerTexts[fieldId]
    const parsed = raw === undefined ? (payers[index]?.amount ?? null) : parseAmount(raw)
    if (parsed === null) {
      form.setError('payers', {
        message: 'Cada aporte debe ser un entero positivo válido.',
      })
      return
    }
    form.clearErrors('payers')
    form.setValue(`payers.${index}.amount`, parsed, { shouldValidate: true })
    setPayerTexts((current) => ({ ...current, [fieldId]: String(parsed) }))
  }
  const distribute = () =>
    replace(
      payers.map((payer, i) => ({
        ...payer,
        amount: equal(amount, payers.length)[i] ?? 0,
      })),
    )
  const add = () => {
    const candidate = active.find((p) => !payers.some((x) => x.participantId === p.id))
    if (!candidate) return
    const next = [...payers, { participantId: candidate.id, amount: 0 }]
    replace(
      next.map((payer, i) => ({ ...payer, amount: equal(amount, next.length)[i] ?? 0 })),
    )
  }
  const removePayer = (index: number) => {
    const next = payers.filter((_, i) => i !== index)
    replace(
      next.map((payer, i) => ({ ...payer, amount: equal(amount, next.length)[i] ?? 0 })),
    )
  }
  let share = 'Elegí consumidores para ver la cuota.'
  if (amount > 0 && selected.length > 0 && payers.length > 0) {
    try {
      splitExpense({ id: 'preview', amount, payers, consumerIds: selected })
      share = `${formatMoney(Math.floor(amount / selected.length))} POR PERSONA`
    } catch {
      // The form schema presents incomplete values to the user.
    }
  }
  return (
    <form
      className="form-stack expense-form"
      onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
    >
      <div className="field">
        <label htmlFor="expense-concept">CONCEPTO</label>
        <input id="expense-concept" {...form.register('concept')} />
        {form.formState.errors.concept && (
          <p className="field-error">{form.formState.errors.concept.message}</p>
        )}
      </div>
      <div className="field">
        <label htmlFor="expense-category">CATEGORÍA</label>
        <select id="expense-category" {...form.register('category')}>
          {expenseCategories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <section className="amount-field">
        <h2>IMPORTE</h2>
        <div className="amount-controls top">
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount - 500)}
          >
            − $500
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount - 1000)}
          >
            − $1K
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount - 5000)}
          >
            − $5K
          </button>
        </div>
        {editing ? (
          <input
            autoFocus
            className="amount-input"
            inputMode="numeric"
            aria-label="Importe del gasto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              confirmAmountText()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmAmountText()
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="amount-display"
            aria-label={`Editar importe ${formatMoney(amount)}`}
            onClick={() => {
              setText(String(amount))
              setEditing(true)
            }}
          >
            {formatCompactMoney(amount)}
            <span className="sr-only"> {formatMoney(amount)}</span>
          </button>
        )}
        <div className="amount-controls">
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount + 500)}
          >
            + $500
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount + 1000)}
          >
            + $1K
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setAmount(amount + 5000)}
          >
            + $5K
          </button>
        </div>
      </section>
      <section className="payers" aria-labelledby="payers-title">
        <h2 id="payers-title">PAGARON</h2>
        {fields.map((field, index) => (
          <div className="payer-row" key={field.id}>
            <select
              value={payers[index]?.participantId ?? ''}
              onChange={(e) =>
                form.setValue(`payers.${index}.participantId`, e.target.value, {
                  shouldValidate: true,
                })
              }
            >
              {visible.map((p) => (
                <option
                  key={p.id}
                  disabled={payers.some(
                    (x, i) => i !== index && x.participantId === p.id,
                  )}
                  value={p.id}
                >
                  {p.displayName}
                  {p.active ? '' : ' (histórico)'}
                </option>
              ))}
            </select>
            <input
              inputMode="numeric"
              aria-label={`Aporte de ${visible.find((p) => p.id === payers[index]?.participantId)?.displayName ?? 'pagador'}`}
              value={payerTexts[field.id] ?? String(payers[index]?.amount ?? '')}
              onChange={(e) =>
                setPayerTexts((current) => ({ ...current, [field.id]: e.target.value }))
              }
              onBlur={() => confirmPayerText(index, field.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  confirmPayerText(index, field.id)
                }
              }}
            />
            {payers.length > 1 && (
              <button
                type="button"
                className="button button-small button-danger"
                onClick={() => removePayer(index)}
              >
                QUITAR
              </button>
            )}
          </div>
        ))}
        <button type="button" className="button button-wide" onClick={add}>
          AGREGAR PAGADOR
        </button>
        {payers.length > 1 && (
          <button type="button" className="button button-wide" onClick={distribute}>
            DISTRIBUIR EN PARTES IGUALES
          </button>
        )}
        <div className="payer-summary">
          <p>
            TOTAL DEL GASTO <strong>{formatMoney(amount)}</strong>
          </p>
          <p>
            INFORMADO POR PAGADORES <strong>{formatMoney(reported)}</strong>
          </p>
          <p className={difference === 0 ? '' : 'expense-warning'}>
            {difference === 0
              ? 'APORTES COMPLETOS'
              : difference > 0
                ? 'FALTA ASIGNAR'
                : 'SOBRAN'}{' '}
            {difference === 0 ? '' : formatMoney(Math.abs(difference))}
          </p>
        </div>
        {form.formState.errors.payers && (
          <p className="field-error">{form.formState.errors.payers.message}</p>
        )}
      </section>
      <section className="consumer-selector">
        <h2>CONSUMIERON</h2>
        <p>
          Revisá que estén todas las personas que participaron de este gasto. Quienes se
          unan después no se agregarán automáticamente.
        </p>
        <p>
          {selected.length} DE {active.length} PARTICIPAN
        </p>
        <div className="consumer-list">
          {visible.map((p) => (
            <label className="consumer-row" key={p.id}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                disabled={!p.active && !selected.includes(p.id)}
                onChange={() =>
                  form.setValue(
                    'participantIds',
                    selected.includes(p.id)
                      ? selected.filter((x) => x !== p.id)
                      : [...selected, p.id],
                    { shouldValidate: true },
                  )
                }
              />
              {p.displayName}
            </label>
          ))}
        </div>
      </section>
      <section className="expense-summary">
        <h2>RESUMEN</h2>
        <p>{share}</p>
      </section>
      <button
        className="button button-primary button-wide"
        disabled={
          isPending ||
          difference !== 0 ||
          hasInvalidPayerText ||
          (editing && parseAmount(text) === null)
        }
        type="submit"
      >
        {isPending ? 'GUARDANDO…' : submitLabel}
      </button>
    </form>
  )
}
