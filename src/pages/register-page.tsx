import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../app/auth-context'
import { sanitizeReturnPath } from '../app/return-path'
import { FieldErrorMessage, FormFeedback } from '../features/auth/auth-form-fields'
import { registerSchema, type RegisterValues } from '../features/auth/auth-schemas'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [feedback, setFeedback] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      passwordConfirmation: '',
      fullName: '',
      nickname: '',
    },
  })
  const next = sanitizeReturnPath(searchParams.get('next')) ?? '/inicio'

  async function onSubmit(values: RegisterValues) {
    setFeedback(null)

    try {
      await signUp(values)
      reset()
      void navigate(next, { replace: true })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No pudimos crear tu cuenta.')
    }
  }

  return (
    <section className="form-page" aria-labelledby="register-title">
      <p className="eyebrow">REGISTRO</p>
      <h1 id="register-title">Creá tu cuenta.</h1>
      <p className="intro-copy">
        Tu apodo es opcional. Si lo usás, será tu nombre visible.
      </p>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email')}
          />
          <FieldErrorMessage id="register-email-error" error={errors.email} />
        </div>
        <div className="field">
          <label htmlFor="register-password">Contraseña</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            {...register('password')}
          />
          <FieldErrorMessage id="register-password-error" error={errors.password} />
        </div>
        <div className="field">
          <label htmlFor="register-password-confirmation">Repetir contraseña</label>
          <input
            id="register-password-confirmation"
            type="password"
            autoComplete="new-password"
            aria-describedby={
              errors.passwordConfirmation
                ? 'register-password-confirmation-error'
                : undefined
            }
            {...register('passwordConfirmation')}
          />
          <FieldErrorMessage
            id="register-password-confirmation-error"
            error={errors.passwordConfirmation}
          />
        </div>
        <div className="field">
          <label htmlFor="register-full-name">Nombre</label>
          <input
            id="register-full-name"
            type="text"
            autoComplete="name"
            aria-describedby={errors.fullName ? 'register-full-name-error' : undefined}
            {...register('fullName')}
          />
          <FieldErrorMessage id="register-full-name-error" error={errors.fullName} />
        </div>
        <div className="field">
          <label htmlFor="register-nickname">Apodo opcional</label>
          <input
            id="register-nickname"
            type="text"
            autoComplete="nickname"
            aria-describedby={errors.nickname ? 'register-nickname-error' : undefined}
            {...register('nickname')}
          />
          <FieldErrorMessage id="register-nickname-error" error={errors.nickname} />
        </div>
        <FormFeedback message={feedback} />
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'CREANDO CUENTA…' : 'CREAR CUENTA'}
        </button>
      </form>
      <nav className="form-links" aria-label="Acciones de registro">
        <Link to={`/login?next=${encodeURIComponent(next)}`}>YA TENGO CUENTA</Link>
      </nav>
    </section>
  )
}
