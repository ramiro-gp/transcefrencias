import { useState } from 'react'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { formatMoney } from '../expenses/amount'
import type { SettlementModel } from './settlement-model'
import { useSettlement } from './use-settlement'
import type { Participant } from '../events/event-service'
import type { EventExpense } from '../expenses/expense-service'

interface Props {
  readonly expenses: readonly EventExpense[] | undefined
  readonly participants: readonly Participant[]
  readonly userId: string
}

export function SettlementView({ expenses, participants, userId }: Props) {
  const [general, setGeneral] = useState(false)
  const [confirmContinuation, setConfirmContinuation] = useState(false)
  const { state, cancel, continueExactly } = useSettlement(expenses, participants, true)
  if (state.status === 'idle' || state.status === 'calculating') {
    return (
      <p role="status">
        CALCULANDO LIQUIDACIÓN…{' '}
        <button className="link-inline" onClick={cancel}>
          CANCELAR
        </button>
      </p>
    )
  }
  if (state.status === 'cancelled') {
    return (
      <p role="status">
        CÁLCULO CANCELADO.{' '}
        <button className="link-inline" onClick={continueExactly}>
          CALCULAR DE NUEVO
        </button>
      </p>
    )
  }
  if (state.status === 'error')
    return (
      <p className="form-feedback" role="alert">
        {state.message}
      </p>
    )
  const model = state.result
  if (model.optimization.status === 'budget-exceeded') {
    return (
      <>
        <ViewToggle general={general} setGeneral={setGeneral} />
        <BalanceList model={model} userId={userId} general={general} />
        <p className="form-feedback" role="status">
          El cálculo exacto protegido alcanzó su límite. No mostramos transferencias
          parciales.
        </p>
        <button className="button" onClick={() => setConfirmContinuation(true)}>
          CONTINUAR CÁLCULO EXACTO
        </button>
        <p>Puede tardar. Podés cancelarlo en cualquier momento.</p>
        <ConfirmDialog
          open={confirmContinuation}
          title="CONTINUAR CÁLCULO EXACTO"
          description="Puede tardar. Podés cancelar el cálculo en cualquier momento."
          confirmLabel="CONTINUAR"
          onConfirm={() => {
            continueExactly()
            return Promise.resolve()
          }}
          onOpenChange={setConfirmContinuation}
        />
      </>
    )
  }
  return (
    <>
      <ViewToggle general={general} setGeneral={setGeneral} />
      <BalanceList model={model} userId={userId} general={general} />
      <section className="event-section" aria-labelledby="transfers-title">
        <h2 id="transfers-title" className="financial-title">
          TRANSFERENCIAS SUGERIDAS
        </h2>
        {model.optimization.transfers.length === 0 ? (
          <p>No hacen falta transferencias.</p>
        ) : (
          <ul className="member-list">
            {model.optimization.transfers.map((transfer) => (
              <li key={`${transfer.fromId}-${transfer.toId}`}>
                <span>
                  {nameFor(model, transfer.fromId)} PAGA A {nameFor(model, transfer.toId)}
                </span>
                <strong>{formatMoney(transfer.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
        <p>
          Son sugerencias. Los movimientos informados se incorporarán en una etapa
          posterior.
        </p>
      </section>
    </>
  )
}

function ViewToggle({
  general,
  setGeneral,
}: {
  readonly general: boolean
  readonly setGeneral: (value: boolean) => void
}) {
  return (
    <div className="button-row" aria-label="Vista de liquidación">
      <button
        className="button button-small"
        aria-pressed={!general}
        onClick={() => setGeneral(false)}
      >
        TU VISTA
      </button>
      <button
        className="button button-small"
        aria-pressed={general}
        onClick={() => setGeneral(true)}
      >
        VISTA GENERAL
      </button>
    </div>
  )
}

function BalanceList({
  model,
  userId,
  general,
}: {
  readonly model: SettlementModel
  readonly userId: string
  readonly general: boolean
}) {
  const people = general
    ? model.people
    : model.people.filter((person) => person.profileId === userId)
  return (
    <section className="event-section" aria-labelledby="balances-title">
      <h2 id="balances-title" className={general ? undefined : 'financial-title'}>
        {general ? 'SALDOS' : 'TU SALDO'}
      </h2>
      <ul className="member-list balance-list">
        {people.map((person) => (
          <li key={person.id}>
            <div className="balance-summary">
              <strong className="balance-name">{person.displayName}</strong>
              <strong
                className={`balance-result ${
                  person.balance.amount < 0
                    ? 'balance-debt'
                    : person.balance.amount > 0
                      ? 'balance-credit'
                      : 'balance-settled'
                }`}
              >
                {person.balance.amount < 0
                  ? `TENÉS QUE PAGAR ${formatMoney(-person.balance.amount)}`
                  : person.balance.amount > 0
                    ? `TENÉS QUE RECIBIR ${formatMoney(person.balance.amount)}`
                    : 'ESTÁS AL DÍA'}
              </strong>
            </div>
            <details className="balance-explanation">
              <summary>VER EXPLICACIÓN</summary>
              <p>
                PAGÓ {formatMoney(person.balance.paidAmount)} · CONSUMIÓ{' '}
                {formatMoney(person.balance.consumedAmount)}
              </p>
              <ul>
                {person.balance.contributions.map((contribution) => (
                  <li key={contribution.expenseId}>
                    {model.expenseNames.get(contribution.expenseId) ?? 'Gasto histórico'}:
                    pagó {formatMoney(contribution.paidAmount)}, consumió{' '}
                    {formatMoney(contribution.consumedAmount)}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}

function nameFor(model: SettlementModel, id: string) {
  return (
    model.people.find((person) => person.id === id)?.displayName ?? 'Persona histórica'
  )
}
