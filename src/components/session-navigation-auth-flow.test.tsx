import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../app/auth-provider'
import { SessionNavigation } from './session-navigation'

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

describe('SessionNavigation auth flow', () => {
  it('shows enabled logout after login and only shows signing out after its click', async () => {
    let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined
    let completeSignOut: (() => void) | undefined
    const client = {
      auth: {
        onAuthStateChange(
          callback: (event: AuthChangeEvent, session: Session | null) => void,
        ) {
          listener = callback
          callback('INITIAL_SESSION', null)
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        },
        signOut: vi.fn(
          () =>
            new Promise<{ error: null }>((resolve) => {
              completeSignOut = () => {
                listener?.('SIGNED_OUT', null)
                resolve({ error: null })
              }
            }),
        ),
      },
    } as unknown as NonNullable<React.ComponentProps<typeof AuthProvider>['client']>

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider client={client}>
          <MemoryRouter>
            <SessionNavigation />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('link', { name: 'INGRESAR' })).toBeInTheDocument()

    act(() => {
      listener?.('SIGNED_IN', createSession('user-a'))
    })

    const signOutButton = screen.getByRole('button', { name: 'SALIR' })
    expect(signOutButton).toBeEnabled()

    fireEvent.click(signOutButton)
    expect(screen.getByRole('button', { name: 'SALIENDO…' })).toBeDisabled()

    await act(() => {
      completeSignOut?.()
      return Promise.resolve()
    })

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'INGRESAR' })).toBeInTheDocument(),
    )

    act(() => {
      listener?.('SIGNED_IN', createSession('user-a'))
    })

    expect(screen.getByRole('button', { name: 'SALIR' })).toBeEnabled()
  })
})
