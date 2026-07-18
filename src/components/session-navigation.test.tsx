import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionNavigation } from './session-navigation'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))

vi.mock('../app/auth-context', () => ({ useAuth }))

describe('SessionNavigation', () => {
  const signOut = vi.fn()

  beforeEach(() => {
    signOut.mockReset()
  })

  it('shows login only for anonymous sessions', () => {
    useAuth.mockReturnValue({ status: 'anonymous', signOut })
    render(
      <MemoryRouter>
        <SessionNavigation />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'INGRESAR' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.queryByRole('button', { name: 'SALIR' })).not.toBeInTheDocument()
  })

  it('offers compact profile and logout actions for an ordinary session', async () => {
    signOut.mockResolvedValue(undefined)
    useAuth.mockReturnValue({ status: 'authenticated', signOut })
    render(
      <MemoryRouter>
        <SessionNavigation />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'PERFIL' })).toHaveAttribute(
      'href',
      '/perfil',
    )
    fireEvent.click(screen.getByRole('button', { name: 'SALIR' }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
  })

  it('does not expose ordinary navigation during recovery', () => {
    useAuth.mockReturnValue({ status: 'recovery', signOut })
    render(
      <MemoryRouter>
        <SessionNavigation />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('navigation', { name: 'Sesión' })).not.toBeInTheDocument()
  })

  it('restores logout after a sign out failure', async () => {
    signOut.mockRejectedValueOnce(new Error('No pudimos cerrar la sesión.'))
    useAuth.mockReturnValue({ status: 'authenticated', signOut })
    render(
      <MemoryRouter>
        <SessionNavigation />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'SALIR' }))

    expect(screen.getByRole('button', { name: 'SALIENDO…' })).toBeDisabled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'SALIR' })).toBeEnabled(),
    )
    expect(screen.getByRole('status')).toHaveTextContent('No pudimos cerrar la sesión.')
  })
})
