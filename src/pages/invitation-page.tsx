import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../app/auth-context'
import {
  clearInvitationSecret,
  readInvitationSecret,
  storeInvitationSecret,
} from '../features/events/invitation-storage'
import { getInvitationPreview, joinInvitation } from '../features/events/event-service'
import { eventDetailKey, eventListKey } from '../features/events/event-queries'
import { supabase } from '../lib/supabase/client'

const secretPattern = /^[0-9a-f]{64}$/

export function InvitationPage() {
  const { invitationId } = useParams()
  const { status, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [secret] = useState<string | null>(() => {
    if (!invitationId) return null
    const fragment = window.location.hash.slice(1)
    return secretPattern.test(fragment) ? fragment : readInvitationSecret(invitationId)
  })

  useEffect(() => {
    if (!invitationId || !window.location.hash) return
    const fragment = window.location.hash.slice(1)
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
    if (secretPattern.test(fragment)) storeInvitationSecret(invitationId, fragment)
  }, [invitationId])

  const preview = useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: () => getInvitationPreview(supabase, invitationId!, secret!),
    enabled: status === 'authenticated' && Boolean(invitationId && secret),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
  const join = useMutation({
    mutationFn: () => joinInvitation(supabase, invitationId!, secret!),
    onSuccess: async (eventId) => {
      clearInvitationSecret(invitationId!)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventDetailKey(eventId) }),
        ...(user
          ? [queryClient.invalidateQueries({ queryKey: eventListKey(user.id) })]
          : []),
      ])
      void navigate(`/eventos/${eventId}`, { replace: true })
    },
  })

  if (!invitationId || !secret)
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">INVITACIÓN</p>
        <p>El enlace no contiene una invitación válida.</p>
      </section>
    )
  if (status === 'loading')
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">INVITACIÓN</p>
        <p>VERIFICANDO SESIÓN…</p>
      </section>
    )
  if (status !== 'authenticated')
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(`/invitacion/${invitationId}`)}`}
        replace
      />
    )
  if (preview.isLoading)
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">INVITACIÓN</p>
        <p>VALIDANDO ENLACE…</p>
      </section>
    )
  if (preview.isError)
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">INVITACIÓN</p>
        <p>{preview.error.message}</p>
        <button className="button" onClick={() => void preview.refetch()}>
          REINTENTAR
        </button>
      </section>
    )
  const invitation = preview.data
  if (!invitation) return null
  if (invitation.status === 'archived')
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">EVENTO ARCHIVADO</p>
        <h1>{invitation.name}</h1>
        <p>Este evento está en modo solo lectura.</p>
        {invitation.alreadyMember && (
          <button
            className="button button-primary"
            onClick={() => void navigate(`/eventos/${invitation.eventId}`)}
          >
            ABRIR EVENTO
          </button>
        )}
      </section>
    )
  if (invitation.status === 'paying' && !invitation.alreadyMember)
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">HORA DE PAGAR</p>
        <h1>{invitation.name}</h1>
        <p>El evento debe volver a CARGANDO GASTOS antes de que puedas unirte.</p>
      </section>
    )
  if (invitation.alreadyMember)
    return (
      <section className="page-state">
        <p className="eyebrow">INVITACIÓN</p>
        <p>Ya participás de {invitation.name}.</p>
        <button
          className="button button-primary"
          onClick={() => void navigate(`/eventos/${invitation.eventId}`)}
        >
          ABRIR EVENTO
        </button>
      </section>
    )
  return (
    <section className="page-state">
      <p className="eyebrow">INVITACIÓN</p>
      <h1>TE INVITARON A {invitation.name}</h1>
      {join.isError && (
        <p className="form-feedback" role="alert">
          {join.error.message}
        </p>
      )}
      <button
        className="button button-primary"
        disabled={join.isPending}
        onClick={() => join.mutate()}
      >
        {join.isPending ? 'UNIENDO…' : 'UNIRME'}
      </button>
    </section>
  )
}
