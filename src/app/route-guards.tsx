import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './auth-context'
import { locationToReturnPath } from './return-path'

export function AuthLoadingState() {
  return (
    <section className="page-state" role="status" aria-live="polite">
      <p className="eyebrow">VERIFICANDO SESIÓN</p>
      <p>CARGANDO…</p>
    </section>
  )
}

export function PrivateRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthLoadingState />
  }

  if (status === 'recovery') {
    return <Navigate to="/nueva-contrasena" replace />
  }

  if (status === 'anonymous') {
    const next = locationToReturnPath(location)
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingState />
  }

  if (status === 'recovery') {
    return <Navigate to="/nueva-contrasena" replace />
  }

  if (status === 'authenticated') {
    return <Navigate to="/inicio" replace />
  }

  return <Outlet />
}

export function RecoveryRoute() {
  const { recoveryCompleted, status } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingState />
  }

  if (status !== 'recovery') {
    if (recoveryCompleted) {
      return <Navigate to="/login" replace state={{ passwordUpdated: true }} />
    }

    return <Navigate to="/login?recovery=invalid" replace />
  }

  return <Outlet />
}
