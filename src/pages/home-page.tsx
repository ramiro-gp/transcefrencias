import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { useAuth } from '../app/auth-context'
import { createEvent } from '../features/events/event-service'
import { eventListKey, useEventList } from '../features/events/event-queries'
import { eventNameSchema } from '../features/events/event-schemas'
import { supabase } from '../lib/supabase/client'

type EventForm = { name: string }

export function HomePage() {
  const { user } = useAuth()
  const events = useEventList(user?.id ?? null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<EventForm>({
    resolver: zodResolver(z.object({ name: eventNameSchema })),
    defaultValues: { name: '' },
  })
  const create = useMutation({
    mutationFn: (values: EventForm) => createEvent(supabase, values.name),
    onSuccess: ({ eventId }) => {
      if (user) void queryClient.invalidateQueries({ queryKey: eventListKey(user.id) })
      void navigate(`/eventos/${eventId}`)
    },
  })

  if (events.isLoading)
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">EVENTOS</p>
        <p>CARGANDO EVENTOS…</p>
      </section>
    )
  if (events.isError)
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">EVENTOS</p>
        <p>{events.error.message}</p>
        <button className="button" onClick={() => void events.refetch()}>
          REINTENTAR
        </button>
      </section>
    )

  return (
    <section className="events-page" aria-labelledby="events-title">
      <p className="eyebrow">EVENTOS</p>
      <h1 id="events-title">JUNTADAS</h1>
      {events.data?.length ? (
        <ul className="event-list">
          {events.data.map((event) => (
            <li key={event.id}>
              <Link to={`/eventos/${event.id}`}>
                <span>{event.name}</span>
                <small>
                  {event.status === 'paying' ? 'HORA DE PAGAR · ' : 'CARGANDO GASTOS · '}
                  {event.role === 'owner'
                    ? 'PROPIETARIO'
                    : event.role === 'coadmin'
                      ? 'COADMIN'
                      : 'MIEMBRO'}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="intro-copy">
          Todavía no participás de ningún evento. Creá uno o abrí un enlace de invitación.
        </p>
      )}
      <form
        className="form-stack event-create"
        onSubmit={(event) =>
          void form.handleSubmit((values) => create.mutate(values))(event)
        }
      >
        <div className="field">
          <label htmlFor="event-name">NUEVA JUNTADA</label>
          <input
            id="event-name"
            {...form.register('name')}
            disabled={create.isPending}
            autoComplete="off"
          />
          {form.formState.errors.name && (
            <p className="field-error">{form.formState.errors.name.message}</p>
          )}
        </div>
        {create.isError && (
          <p className="form-feedback" role="alert">
            {create.error.message}
          </p>
        )}
        <button className="button button-primary" disabled={create.isPending}>
          {create.isPending ? 'CREANDO…' : 'CREAR EVENTO'}
        </button>
      </form>
      <Link
        className="button button-wide archived-events-action"
        to="/eventos/archivados"
      >
        VER EVENTOS ARCHIVADOS
      </Link>
    </section>
  )
}
