import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { GuestRoute, PrivateRoute, RecoveryRoute } from './route-guards'

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))

vi.mock('./auth-context', () => ({
  useAuth,
}))

function renderPrivate(status: 'loading' | 'anonymous' | 'authenticated' | 'recovery') {
  useAuth.mockReturnValue({ status })
  render(
    <MemoryRouter initialEntries={['/perfil?tab=identity']}>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/perfil" element={<p>PERFIL PRIVADO</p>} />
        </Route>
        <Route path="/login" element={<p>LOGIN</p>} />
        <Route path="/nueva-contrasena" element={<p>RECOVERY</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('route guards', () => {
  it('keeps a loading state instead of redirecting before Auth initializes', () => {
    renderPrivate('loading')
    expect(screen.getByRole('status')).toHaveTextContent('CARGANDO…')
  })

  it('redirects anonymous private access to login', () => {
    renderPrivate('anonymous')
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('allows authenticated private access and sends recovery to its restricted route', () => {
    renderPrivate('authenticated')
    expect(screen.getByText('PERFIL PRIVADO')).toBeInTheDocument()

    renderPrivate('recovery')
    expect(screen.getByText('RECOVERY')).toBeInTheDocument()
  })

  it('prevents authenticated users from returning to guest routes', () => {
    useAuth.mockReturnValue({ status: 'authenticated' })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<p>FORMULARIO</p>} />
          </Route>
          <Route path="/inicio" element={<p>INICIO</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('INICIO')).toBeInTheDocument()
  })

  it('rejects an ordinary session from the recovery route', () => {
    useAuth.mockReturnValue({ status: 'authenticated' })
    render(
      <MemoryRouter initialEntries={['/nueva-contrasena']}>
        <Routes>
          <Route element={<RecoveryRoute />}>
            <Route path="/nueva-contrasena" element={<p>NUEVA CONTRASEÑA</p>} />
          </Route>
          <Route path="/login" element={<p>LOGIN</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('routes a completed recovery to login with an ephemeral success state', () => {
    useAuth.mockReturnValue({ status: 'anonymous', recoveryCompleted: true })
    render(
      <MemoryRouter initialEntries={['/nueva-contrasena']}>
        <Routes>
          <Route element={<RecoveryRoute />}>
            <Route path="/nueva-contrasena" element={<p>NUEVA CONTRASEÑA</p>} />
          </Route>
          <Route path="/login" element={<p>CONTRASEÑA ACTUALIZADA</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('CONTRASEÑA ACTUALIZADA')).toBeInTheDocument()
  })
})
