import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { LoginValues, RegisterValues } from '../features/auth/auth-schemas'
import type { AuthStatus } from './auth-state'

export interface AuthContextValue {
  readonly status: AuthStatus
  readonly recoveryCompleted: boolean
  readonly isInitialized: boolean
  readonly session: Session | null
  readonly user: User | null
  readonly signUp: (values: RegisterValues) => Promise<void>
  readonly signIn: (values: LoginValues) => Promise<void>
  readonly signOut: () => Promise<void>
  readonly requestPasswordReset: (email: string) => Promise<void>
  readonly updatePassword: (password: string) => Promise<void>
  readonly completePasswordRecovery: (password: string) => Promise<void>
  readonly clearRecovery: () => void
  readonly clearRecoveryCompletion: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  }

  return context
}
