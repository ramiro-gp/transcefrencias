import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'recovery'

export function statusForAuthEvent(
  event: AuthChangeEvent,
  session: Session | null,
  currentStatus: AuthStatus,
): AuthStatus {
  if (!session) {
    return 'anonymous'
  }

  if (event === 'PASSWORD_RECOVERY') {
    return 'recovery'
  }

  if (currentStatus === 'recovery' && event !== 'SIGNED_OUT') {
    return 'recovery'
  }

  return 'authenticated'
}
