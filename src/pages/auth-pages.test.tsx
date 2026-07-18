import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './forgot-password-page'
import { LoginPage } from './login-page'
import { RegisterPage } from './register-page'
import { NewPasswordPage } from './new-password-page'

const auth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  completePasswordRecovery: vi.fn(),
  clearRecoveryCompletion: vi.fn(),
}

vi.mock('../app/auth-context', () => ({
  useAuth: () => auth,
}))

function renderPage(page: React.ReactNode, route = '/') {
  return render(<MemoryRouter initialEntries={[route]}>{page}</MemoryRouter>)
}

describe('Auth pages', () => {
  beforeEach(() => {
    auth.signIn.mockReset()
    auth.signUp.mockReset()
    auth.requestPasswordReset.mockReset()
    auth.completePasswordRecovery.mockReset()
    auth.clearRecoveryCompletion.mockReset()
  })

  it('validates login fields and submits normalized credentials once', async () => {
    auth.signIn.mockResolvedValue(undefined)
    renderPage(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' ANA@EXAMPLE.TEST ' },
    })
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'INGRESAR' }))

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledTimes(1))
    expect(auth.signIn).toHaveBeenCalledWith({
      email: 'ANA@EXAMPLE.TEST',
      password: 'password1',
    })
  })

  it('blocks an invalid registration before calling Supabase', async () => {
    renderPage(<RegisterPage />)

    fireEvent.click(screen.getByRole('button', { name: 'CREAR CUENTA' }))

    expect(await screen.findByText('Ingresá tu email.')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('uses a generic recovery confirmation without enumerating accounts', async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined)
    renderPage(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'unknown@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'ENVIAR INSTRUCCIONES' }))

    expect(
      await screen.findByText(
        'Si existe una cuenta para ese email, recibirás instrucciones para continuar.',
      ),
    ).toBeInTheDocument()
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('unknown@example.test')
  })

  it('shows the password-updated confirmation once after a completed recovery redirect', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { passwordUpdated: true } }]}
      >
        <LoginPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Contraseña actualizada. Ya podés iniciar sesión.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(auth.clearRecoveryCompletion).toHaveBeenCalledTimes(1))
  })

  it('submits a valid new password through the recovery completion action', async () => {
    auth.completePasswordRecovery.mockResolvedValue(undefined)
    renderPage(<NewPasswordPage />)

    fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'updated-password' },
    })
    fireEvent.change(screen.getByLabelText('Repetir contraseña'), {
      target: { value: 'updated-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'GUARDAR CONTRASEÑA' }))

    await waitFor(() =>
      expect(auth.completePasswordRecovery).toHaveBeenCalledWith('updated-password'),
    )
  })
})
