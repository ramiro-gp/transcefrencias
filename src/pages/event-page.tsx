import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../app/auth-context'
import { ConfirmDialog } from '../components/confirm-dialog'
import { ProfileName } from '../features/profile/profile-name'
import {
  eventDetailKey,
  eventListKey,
  useEventDetail,
} from '../features/events/event-queries'
import {
  callEventRpc,
  createManualParticipant,
  getEventInvitation,
  renameEvent,
} from '../features/events/event-service'
import { eventNameSchema, participantNameSchema } from '../features/events/event-schemas'
import { invitationUrl } from '../features/events/invitation-storage'
import { supabase } from '../lib/supabase/client'
import { categoryLabel } from '../features/expenses/expense-categories'
import { formatMoney } from '../features/expenses/amount'
import { deleteExpense } from '../features/expenses/expense-service'
import {
  invalidateExpenseQueries,
  useExpenses,
} from '../features/expenses/expense-queries'
import { calculatePersonalExpenseSummary } from '../features/expenses/expense-summary'

type NameForm = { name: string }

export function EventPage() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const event = useEventDetail(eventId, user?.id ?? null)
  const expenses = useExpenses(eventId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [participantToLink, setParticipantToLink] = useState<string>('')
  const [profileToLink, setProfileToLink] = useState<string>('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    title: string
    description: string
    confirmLabel: string
    execute: () => Promise<void>
  } | null>(null)
  const refresh = () =>
    eventId
      ? void queryClient.invalidateQueries({ queryKey: eventDetailKey(eventId) })
      : undefined
  const isAdmin = event.data?.role === 'owner' || event.data?.role === 'coadmin'
  const isOwner = event.data?.role === 'owner'
  const removeExpense = useMutation({
    mutationFn: (expense: Parameters<typeof deleteExpense>[1]) =>
      deleteExpense(supabase, expense),
    onSuccess: () =>
      eventId ? invalidateExpenseQueries(queryClient, eventId) : undefined,
  })
  const rename = useMutation({
    mutationFn: (values: NameForm) => renameEvent(supabase, eventId!, values.name),
    onSuccess: refresh,
  })
  const manual = useMutation({
    mutationFn: (values: NameForm) =>
      createManualParticipant(supabase, eventId!, values.name),
    onSuccess: refresh,
  })
  const action = useMutation({
    mutationFn: ({
      name,
      args,
    }: {
      name:
        | 'leave_event'
        | 'deactivate_participant'
        | 'link_manual_participant'
        | 'set_coadmin'
        | 'expel_event_member'
        | 'allow_event_rejoin'
      args: Record<string, string | boolean>
    }) => callEventRpc(supabase, name, args),
    onSuccess: () => {
      refresh()
      if (user) void queryClient.invalidateQueries({ queryKey: eventListKey(user.id) })
    },
  })
  const invitation = useQuery({
    queryKey: ['event-invitation', eventId],
    queryFn: () => getEventInvitation(supabase, eventId!),
    enabled: Boolean(eventId && isOwner),
  })
  const copyInvitation = useMutation({
    mutationFn: async () => {
      if (!invitation.data) throw new Error('No pudimos cargar la invitación.')
      await navigator.clipboard.writeText(invitationUrl(invitation.data))
    },
    onSuccess: () => setCopyFeedback('INVITACIÓN COPIADA'),
  })
  const renameForm = useForm<NameForm>({
    resolver: zodResolver(z.object({ name: eventNameSchema })),
    values: { name: event.data?.name ?? '' },
  })
  const manualForm = useForm<NameForm>({
    resolver: zodResolver(z.object({ name: participantNameSchema })),
    defaultValues: { name: '' },
  })

  if (event.isLoading)
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">EVENTO</p>
        <p>ABRIENDO EVENTO…</p>
      </section>
    )
  if (event.isError || !event.data)
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">EVENTO</p>
        <p>{event.error?.message ?? 'No encontramos el evento.'}</p>
        <button className="button" onClick={() => void event.refetch()}>
          REINTENTAR
        </button>
      </section>
    )
  const data = event.data
  let summary: ReturnType<typeof calculatePersonalExpenseSummary> | null = null
  let balanceError: string | null = null
  try {
    summary =
      expenses.data && user
        ? calculatePersonalExpenseSummary(expenses.data, data.participants, user.id)
        : null
  } catch {
    balanceError = 'No pudimos calcular tu resumen personal.'
  }
  return (
    <section className="event-detail" aria-labelledby="event-title">
      <p className="eyebrow">CARGANDO GASTOS</p>
      <h1 id="event-title">{data.name}</h1>
      {balanceError && (
        <p className="form-feedback" role="alert">
          {balanceError}
        </p>
      )}
      {expenses.data && summary && (
        <section className="event-summary">
          <p>
            TOTAL <strong>{formatMoney(summary.total)}</strong>
          </p>
          <p>
            TU CONSUMO <strong>{formatMoney(summary.consumedAmount)}</strong>
          </p>
          <p>
            TU SALDO{' '}
            <strong>
              {summary.balance < 0
                ? `TENÉS QUE PAGAR ${formatMoney(-summary.balance)}`
                : summary.balance > 0
                  ? `TENÉS QUE RECIBIR ${formatMoney(summary.balance)}`
                  : 'ESTÁS AL DÍA'}
            </strong>
          </p>
        </section>
      )}
      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation?.title ?? ''}
        description={confirmation?.description ?? ''}
        confirmLabel={confirmation?.confirmLabel ?? ''}
        onConfirm={() => confirmation?.execute() ?? Promise.resolve()}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null)
        }}
      />
      {(rename.isError || manual.isError || action.isError) && (
        <p className="form-feedback" role="alert">
          {rename.error?.message ?? manual.error?.message ?? action.error?.message}
        </p>
      )}
      <section className="event-section" aria-labelledby="expenses-title">
        <div className="section-heading">
          <h2 id="expenses-title">GASTOS</h2>
          <Link
            className="button button-primary button-small"
            to={`/eventos/${eventId}/gastos/nuevo`}
          >
            CARGAR GASTO
          </Link>
        </div>
        {expenses.isLoading && <p role="status">CARGANDO GASTOS…</p>}
        {expenses.isError && (
          <p className="form-feedback" role="alert">
            {expenses.error.message}{' '}
            <button className="link-inline" onClick={() => void expenses.refetch()}>
              REINTENTAR
            </button>
          </p>
        )}
        {expenses.data?.length === 0 && <p>Todavía no hay gastos cargados.</p>}
        {expenses.data && expenses.data.length > 0 && (
          <ul className="expense-list">
            {expenses.data.map((expense) => {
              const payer = expense.payers
                .map(
                  (payer) =>
                    `${data.participants.find((participant) => participant.id === payer.participantId)?.displayName ?? 'Persona histórica'} ${formatMoney(payer.amount)}`,
                )
                .join(' · ')
              const canManage = isAdmin || expense.createdBy === user?.id
              return (
                <li key={expense.id}>
                  <div>
                    <strong>{expense.concept}</strong>
                    <small>
                      {categoryLabel(expense.category)} · {payer} ·{' '}
                      {expense.participantIds.length} participan
                    </small>
                  </div>
                  <div>
                    <strong>{formatMoney(expense.amount)}</strong>
                    {canManage && (
                      <div className="button-row">
                        <Link
                          className="button button-small"
                          to={`/eventos/${eventId}/gastos/${expense.id}/editar`}
                        >
                          EDITAR
                        </Link>
                        <button
                          className="button button-small button-danger"
                          onClick={() =>
                            setConfirmation({
                              title: 'ELIMINAR GASTO',
                              description: `Vas a eliminar ${expense.concept} del cálculo. El historial se conserva.`,
                              confirmLabel: 'ELIMINAR GASTO',
                              execute: async () => {
                                await removeExpense.mutateAsync(expense)
                              },
                            })
                          }
                        >
                          ELIMINAR
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {isOwner && (
        <section className="event-section invitation-section">
          <h2>INVITACIÓN</h2>
          <p>Compartí este enlace con quienes quieras sumar al evento.</p>
          <button
            className="button button-primary invitation-action"
            disabled={!invitation.data || copyInvitation.isPending}
            onClick={() => copyInvitation.mutate()}
          >
            {copyInvitation.isPending ? 'COPIANDO…' : 'COPIAR INVITACIÓN'}
          </button>
          {copyFeedback && (
            <p className="copy-feedback" role="status" aria-live="polite">
              {copyFeedback}
            </p>
          )}
          {(invitation.isError || copyInvitation.isError) && (
            <p className="form-feedback" role="alert">
              {invitation.error?.message ?? 'No pudimos copiar la invitación.'}
            </p>
          )}
        </section>
      )}
      {isAdmin && (
        <form
          className="inline-form"
          onSubmit={(event) =>
            void renameForm.handleSubmit((values) => rename.mutate(values))(event)
          }
        >
          <label htmlFor="rename-event">NOMBRE DEL EVENTO</label>
          <input id="rename-event" {...renameForm.register('name')} />
          {renameForm.formState.errors.name && (
            <p className="field-error">{renameForm.formState.errors.name.message}</p>
          )}
          <button className="button" disabled={rename.isPending}>
            RENOMBRAR
          </button>
        </form>
      )}
      <section className="event-section">
        <h2>MIEMBROS</h2>
        <ul className="member-list">
          {data.members.map((member) => (
            <li key={member.profileId}>
              <ProfileName profile={member} />
              <small>
                {member.role === 'owner'
                  ? 'ADMIN'
                  : member.role === 'coadmin'
                    ? 'COADMIN'
                    : 'MIEMBRO'}
              </small>
              {isOwner && member.profileId !== user?.id && (
                <button
                  className="button button-small"
                  onClick={() => {
                    const args = {
                      target_event_id: data.id,
                      target_profile_id: member.profileId,
                      make_coadmin: member.role !== 'coadmin',
                    }
                    if (member.role === 'coadmin') {
                      setConfirmation({
                        title: `QUITAR COADMIN A ${member.nickname ?? member.fullName}`,
                        description: `${member.nickname ?? member.fullName} seguirá siendo MIEMBRO del evento.`,
                        confirmLabel: 'QUITAR COADMIN',
                        execute: () => action.mutateAsync({ name: 'set_coadmin', args }),
                      })
                    } else action.mutate({ name: 'set_coadmin', args })
                  }}
                >
                  {member.role === 'coadmin' ? 'QUITAR COADMIN' : 'HACER COADMIN'}
                </button>
              )}
              {isAdmin && member.role !== 'owner' && member.profileId !== user?.id && (
                <button
                  className="button button-small button-danger"
                  onClick={() =>
                    setConfirmation({
                      title: `EXPULSAR A ${(member.nickname ?? member.fullName).toUpperCase()}`,
                      description: `${member.nickname ?? member.fullName} perderá el acceso al evento hasta que el ADMIN permita su ingreso.`,
                      confirmLabel: 'EXPULSAR',
                      execute: () =>
                        action.mutateAsync({
                          name: 'expel_event_member',
                          args: {
                            target_event_id: data.id,
                            target_profile_id: member.profileId,
                          },
                        }),
                    })
                  }
                >
                  EXPULSAR
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="event-section">
        <h2>PERSONAS</h2>
        <ul className="member-list">
          {data.participants.map((participant) => (
            <li key={participant.id}>
              <span>{participant.displayName}</span>
              <small>
                {participant.active
                  ? participant.profileId
                    ? 'CUENTA'
                    : 'MANUAL'
                  : 'INACTIVO'}
              </small>
              {isAdmin && participant.active && !participant.profileId && (
                <div className="button-row">
                  <button
                    className="button button-small"
                    onClick={() => setParticipantToLink(participant.id)}
                  >
                    VINCULAR
                  </button>
                  <button
                    className="button button-small"
                    onClick={() =>
                      setConfirmation({
                        title: `DESACTIVAR A ${participant.displayName}`,
                        description: `${participant.displayName} dejará de estar disponible para gastos nuevos, pero su historial se conservará.`,
                        confirmLabel: 'DESACTIVAR',
                        execute: () =>
                          action.mutateAsync({
                            name: 'deactivate_participant',
                            args: { target_participant_id: participant.id },
                          }),
                      })
                    }
                  >
                    DESACTIVAR
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form
          className="inline-form"
          onSubmit={(event) =>
            void manualForm.handleSubmit((values) => manual.mutate(values))(event)
          }
        >
          <label htmlFor="manual-name">AGREGAR PERSONA MANUAL</label>
          <input id="manual-name" {...manualForm.register('name')} />
          {manualForm.formState.errors.name && (
            <p className="field-error">{manualForm.formState.errors.name.message}</p>
          )}
          <button className="button" disabled={manual.isPending}>
            AGREGAR
          </button>
        </form>
      </section>
      {isAdmin && participantToLink && (
        <section className="event-section">
          <h2>VINCULAR PERSONA</h2>
          <p>Solo se pueden vincular cuentas que ya participan del evento.</p>
          <label className="field" htmlFor="link-profile">
            <span>CUENTA</span>
            <select
              id="link-profile"
              value={profileToLink}
              onChange={(input) => setProfileToLink(input.target.value)}
            >
              <option value="">ELEGÍ UNA CUENTA</option>
              {data.members.map((member) => (
                <option key={member.profileId} value={member.profileId}>
                  {member.nickname ?? member.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button
              className="button button-primary"
              disabled={!profileToLink || action.isPending}
              onClick={() => {
                action.mutate(
                  {
                    name: 'link_manual_participant',
                    args: {
                      target_participant_id: participantToLink,
                      target_profile_id: profileToLink,
                    },
                  },
                  {
                    onSuccess: () => {
                      setParticipantToLink('')
                      setProfileToLink('')
                    },
                  },
                )
              }}
            >
              VINCULAR
            </button>
            <button className="button" onClick={() => setParticipantToLink('')}>
              CANCELAR
            </button>
          </div>
        </section>
      )}
      {isOwner && data.blockedMembers.length > 0 && (
        <section className="event-section">
          <h2>CUENTAS EXPULSADAS</h2>
          <ul className="member-list">
            {data.blockedMembers.map((member) => (
              <li key={member.profileId}>
                <span>{member.displayName}</span>
                <button
                  className="button button-small"
                  onClick={() =>
                    action.mutate({
                      name: 'allow_event_rejoin',
                      args: {
                        target_event_id: data.id,
                        target_profile_id: member.profileId,
                      },
                    })
                  }
                >
                  PERMITIR REINGRESO
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.role !== 'owner' && (
        <section className="event-section">
          <button
            className="button"
            onClick={() =>
              setConfirmation({
                title: 'SALIR DEL EVENTO',
                description:
                  'Perderás el acceso al evento. Tu historial se conservará y podrás volver con la invitación.',
                confirmLabel: 'SALIR',
                execute: async () => {
                  await action.mutateAsync({
                    name: 'leave_event',
                    args: { target_event_id: data.id },
                  })
                  await navigate('/inicio')
                },
              })
            }
          >
            SALIR DEL EVENTO
          </button>
        </section>
      )}
      <section className="event-section">
        <h2>HISTORIAL</h2>
        <ul className="audit-list">
          {data.audit.map((entry) => (
            <li key={entry.id}>
              <span>
                {entry.actorDisplayName} {entry.summary}
              </span>
              <small>{new Date(entry.createdAt).toLocaleString('es-AR')}</small>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
