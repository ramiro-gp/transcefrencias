import { useAuth } from '../app/auth-context'
import { displayProfileName } from '../features/profile/profile-display'
import { ProfileName } from '../features/profile/profile-name'
import { useProfileQuery } from '../features/profile/use-profile-query'

export function HomePage() {
  const { user } = useAuth()
  const profile = useProfileQuery(user?.id ?? null)

  if (profile.isLoading) {
    return (
      <section className="page-state" role="status" aria-live="polite">
        <p className="eyebrow">INICIO</p>
        <p>CARGANDO PERFIL…</p>
      </section>
    )
  }

  if (profile.isError) {
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">INICIO</p>
        <p>{profile.error.message}</p>
        <button className="button" type="button" onClick={() => void profile.refetch()}>
          REINTENTAR
        </button>
      </section>
    )
  }

  if (!profile.data) {
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">INICIO</p>
        <p>No encontramos el perfil asociado a esta cuenta.</p>
      </section>
    )
  }

  return (
    <section className="intro" aria-labelledby="home-title">
      <p className="eyebrow">INICIO</p>
      <h1 id="home-title">
        Hola, <ProfileName profile={profile.data} />.
      </h1>
      <p className="intro-copy">
        {displayProfileName(profile.data)}, la gestión de eventos será la próxima función.
      </p>
    </section>
  )
}
