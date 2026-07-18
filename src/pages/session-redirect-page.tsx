import { Navigate } from 'react-router'
import { AuthLoadingState } from '../app/route-guards'
import { useAuth } from '../app/auth-context'

export function SessionRedirectPage() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingState />
  }

  if (status === 'recovery') {
    return <Navigate to="/nueva-contrasena" replace />
  }

  return <Navigate to={status === 'authenticated' ? '/inicio' : '/login'} replace />
}
