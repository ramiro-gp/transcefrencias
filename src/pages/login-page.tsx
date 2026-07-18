import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../app/auth-context'
import { sanitizeReturnPath } from '../app/return-path'
import { FieldErrorMessage, FormFeedback } from '../features/auth/auth-form-fields'
import { loginSchema, type LoginValues } from '../features/auth/auth-schemas'

function hasPasswordUpdatedState(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'passwordUpdated' in state &&
    state.passwordUpdated === true
  )
}

export function LoginPage() {
  const { clearRecoveryCompletion, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const passwordUpdated = hasPasswordUpdatedState(location.state)
  const [searchParams] = useSearchParams()
  const [feedback, setFeedback] = useState<string | null>(
    searchParams.get('recovery') === 'invalid'
      ? 'El enlace para cambiar la contraseña es inválido, venció o ya fue utilizado.'
      : passwordUpdated
        ? 'Contraseña actualizada. Ya podés iniciar sesión.'
        : null,
  )
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })
  const next = sanitizeReturnPath(searchParams.get('next')) ?? '/inicio'

  useEffect(() => {
    if (passwordUpdated) {
      clearRecoveryCompletion()
      void navigate('/login', { replace: true, state: null })
    }
  }, [clearRecoveryCompletion, navigate, passwordUpdated])

  async function onSubmit(values: LoginValues) {
    setFeedback(null)

    try {
      await signIn(values)
      void navigate(next, { replace: true })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos iniciar sesión.')
    }
  }

  return (
    <section className="form-page" aria-labelledby="login-title">
      <p className="eyebrow">ACCESO</p>
      <h1 id="login-title">Entrá a tu cuenta.</h1>
      <p className="intro-copy">
        Usá el email y la contraseña con los que te registraste.
      </p>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            {...register('email')}
          />
          <FieldErrorMessage id="login-email-error" error={errors.email} />
        </div>
        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            {...register('password')}
          />
          <FieldErrorMessage id="login-password-error" error={errors.password} />
        </div>
        <FormFeedback message={feedback} />
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'INGRESANDO…' : 'INGRESAR'}
        </button>
      </form>
      <nav className="form-links" aria-label="Acciones de acceso">
        <Link to={`/olvide-mi-contrasena?next=${encodeURIComponent(next)}`}>
          OLVIDÉ MI CONTRASEÑA
        </Link>
        <Link to={`/registro?next=${encodeURIComponent(next)}`}>CREAR CUENTA</Link>
      </nav>
    </section>
  )
}
