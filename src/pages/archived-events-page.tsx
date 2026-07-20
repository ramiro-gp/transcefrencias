import { Link } from 'react-router'
import { useAuth } from '../app/auth-context'
import { useEventList } from '../features/events/event-queries'
import { eventStatusLabel } from '../features/events/event-service'

export function ArchivedEventsPage() {
  const { user } = useAuth()
  const events = useEventList(user?.id ?? null, 'archived')

  if (events.isLoading)
    return (
      <section className="page-state" role="status">
        <p className="eyebrow">EVENTOS ARCHIVADOS</p>
        <p>CARGANDO EVENTOS…</p>
      </section>
    )
  if (events.isError)
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">EVENTOS ARCHIVADOS</p>
        <p>{events.error.message}</p>
        <button className="button" onClick={() => void events.refetch()}>
          REINTENTAR
        </button>
      </section>
    )

  return (
    <section className="events-page" aria-labelledby="archived-events-title">
      <p className="eyebrow">EVENTOS</p>
      <h1 id="archived-events-title">ARCHIVADOS</h1>
      {events.data?.length ? (
        <ul className="event-list">
          {events.data.map((event) => (
            <li key={event.id}>
              <Link to={`/eventos/${event.id}`}>
                <span>{event.name}</span>
                <small>
                  ARCHIVADO · ESTADO ANTERIOR:{' '}
                  {event.archivedFromStatus
                    ? eventStatusLabel(event.archivedFromStatus)
                    : 'NO DISPONIBLE'}
                </small>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="intro-copy">NO HAY EVENTOS ARCHIVADOS</p>
      )}
      <Link className="button button-wide" to="/inicio">
        VOLVER A EVENTOS ACTIVOS
      </Link>
    </section>
  )
}
