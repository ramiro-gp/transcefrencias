import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../app/auth-context'

export function SessionNavigation() {
  const { signOut, status } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading' || status === 'recovery') {
    return null
  }

  if (status === 'anonymous') {
    return (
      <nav className="session-navigation" aria-label="Sesión">
        <Link to="/login">INGRESAR</Link>
      </nav>
    )
  }

  async function handleSignOut() {
    setError(null)
    setIsSigningOut(true)

    try {
      await signOut()
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : 'No pudimos cerrar la sesión.',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <nav className="session-navigation" aria-label="Sesión">
      <Link to="/perfil">PERFIL</Link>
      <button type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>
        {isSigningOut ? 'SALIENDO…' : 'SALIR'}
      </button>
      {error ? (
        <p className="session-navigation-error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
    </nav>
  )
}
