import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from './auth-context'
import { AuthProvider } from './auth-provider'
import { statusForAuthEvent } from './auth-state'

function createSession(userId: string): Session {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: 2_000_000_000,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.test',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }
}

function Probe() {
  const { status, user } = useAuth()
  return <p>{`${status}:${user?.id ?? 'none'}`}</p>
}

describe('AuthProvider', () => {
  it('handles initial, repeated and recovery events without treating recovery as ordinary access', () => {
    let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined
    const unsubscribe = vi.fn()
    const client = {
      auth: {
        onAuthStateChange(
          callback: (event: AuthChangeEvent, session: Session | null) => void,
        ) {
          listener = callback
          callback('INITIAL_SESSION', null)
          return { data: { subscription: { unsubscribe } } }
        },
      },
    } as unknown as NonNullable<React.ComponentProps<typeof AuthProvider>['client']>
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={client}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('anonymous:none')).toBeInTheDocument()

    act(() => {
      listener?.('SIGNED_IN', createSession('user-a'))
      listener?.('SIGNED_IN', createSession('user-a'))
    })
    expect(screen.getByText('authenticated:user-a')).toBeInTheDocument()

    act(() => {
      listener?.('PASSWORD_RECOVERY', createSession('user-a'))
    })
    expect(screen.getByText('recovery:user-a')).toBeInTheDocument()
  })

  it('clears cached data when the authenticated user changes', () => {
    let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined
    const client = {
      auth: {
        onAuthStateChange(
          callback: (event: AuthChangeEvent, session: Session | null) => void,
        ) {
          listener = callback
          callback('INITIAL_SESSION', createSession('user-a'))
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        },
      },
    } as unknown as NonNullable<React.ComponentProps<typeof AuthProvider>['client']>
    const queryClient = new QueryClient()
    queryClient.setQueryData(['profile', 'user-a'], { fullName: 'A' })

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={client}>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

    act(() => {
      listener?.('SIGNED_IN', createSession('user-b'))
    })

    expect(queryClient.getQueryData(['profile', 'user-a'])).toBeUndefined()
  })
})

describe('statusForAuthEvent', () => {
  it('keeps recovery through token refreshes and returns anonymous after sign out', () => {
    const session = createSession('user-a')
    expect(statusForAuthEvent('TOKEN_REFRESHED', session, 'recovery')).toBe('recovery')
    expect(statusForAuthEvent('SIGNED_OUT', null, 'recovery')).toBe('anonymous')
  })
})
