import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase/client'
import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} from '../features/auth/auth-service'
import { AuthContext, type AuthContextValue } from './auth-context'
import { statusForAuthEvent, type AuthStatus } from './auth-state'

type AuthClient = Pick<typeof supabase, 'auth'>

function recoveryRedirectUrl(): string {
  return new URL('/nueva-contrasena', window.location.origin).toString()
}

export function AuthProvider({
  children,
  client = supabase,
}: {
  readonly children: ReactNode
  readonly client?: AuthClient
}) {
  const queryClient = useQueryClient()
  const previousUserId = useRef<string | null>(null)
  const [auth, setAuth] = useState<{
    readonly status: AuthStatus
    readonly session: Session | null
  }>({ status: 'loading', session: null })
  const [recoveryCompleted, setRecoveryCompleted] = useState(false)

  useEffect(() => {
    let active = true

    const applyAuthEvent = (event: AuthChangeEvent, session: Session | null) => {
      if (!active) {
        return
      }

      const nextUserId = session?.user.id ?? null

      if (previousUserId.current !== nextUserId) {
        queryClient.clear()
        previousUserId.current = nextUserId
      }

      setAuth((current) => ({
        session,
        status: statusForAuthEvent(event, session, current.status),
      }))
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(applyAuthEvent)

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client, queryClient])

  const session = auth.session
  const user = session?.user ?? null

  const value: AuthContextValue = {
    status: auth.status,
    recoveryCompleted,
    isInitialized: auth.status !== 'loading',
    session,
    user,
    signUp: async (values) => {
      await signUpWithPassword(client, values)
    },
    signIn: async (values) => {
      await signInWithPassword(client, values)
    },
    signOut: async () => {
      const { error } = await client.auth.signOut({ scope: 'local' })

      if (error) {
        throw new Error('No pudimos cerrar tu sesión. Intentá de nuevo.')
      }

      previousUserId.current = null
      queryClient.clear()
      setRecoveryCompleted(false)
      setAuth({ status: 'anonymous', session: null })
    },
    requestPasswordReset: async (email) => {
      await requestPasswordReset(client, email, recoveryRedirectUrl())
    },
    updatePassword: async (password) => {
      if (auth.status !== 'recovery' || !session) {
        throw new Error('El enlace para cambiar la contraseña ya no es válido.')
      }

      await updatePassword(client, password)
    },
    completePasswordRecovery: async (password) => {
      if (auth.status !== 'recovery' || !session) {
        throw new Error('El enlace para cambiar la contraseña ya no es válido.')
      }

      await updatePassword(client, password)
      setRecoveryCompleted(true)

      const { error } = await client.auth.signOut({ scope: 'local' })

      if (error) {
        setRecoveryCompleted(false)
        throw new Error(
          'La contraseña se actualizó, pero no pudimos cerrar la sesión temporal.',
        )
      }

      previousUserId.current = null
      queryClient.clear()
      setAuth({ status: 'anonymous', session: null })
    },
    clearRecovery: () => {
      if (auth.status === 'recovery') {
        setAuth({ status: 'anonymous', session: null })
        previousUserId.current = null
        queryClient.clear()
        setRecoveryCompleted(false)
      }
    },
    clearRecoveryCompletion: () => setRecoveryCompleted(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
