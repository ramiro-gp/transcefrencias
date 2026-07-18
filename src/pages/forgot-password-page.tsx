import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../app/auth-context'
import { sanitizeReturnPath } from '../app/return-path'
import { FieldErrorMessage, FormFeedback } from '../features/auth/auth-form-fields'
import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from '../features/auth/auth-schemas'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [searchParams] = useSearchParams()
  const [feedback, setFeedback] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  })
  const next = sanitizeReturnPath(searchParams.get('next'))

  async function onSubmit(values: PasswordResetRequestValues) {
    setFeedback(null)

    try {
      await requestPasswordReset(values.email)
      setFeedback(
        'Si existe una cuenta para ese email, recibirás instrucciones para continuar.',
      )
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No pudimos solicitar el correo. Intentá de nuevo.',
      )
    }
  }

  const loginTarget = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <section className="form-page" aria-labelledby="forgot-password-title">
      <p className="eyebrow">RECUPERAR ACCESO</p>
      <h1 id="forgot-password-title">Elegí una nueva contraseña.</h1>
      <p className="intro-copy">
        Te enviaremos un enlace si la cuenta puede recibir instrucciones.
      </p>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div className="field">
          <label htmlFor="recovery-email">Email</label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? 'recovery-email-error' : undefined}
            {...register('email')}
          />
          <FieldErrorMessage id="recovery-email-error" error={errors.email} />
        </div>
        <FormFeedback message={feedback} />
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'ENVIANDO…' : 'ENVIAR INSTRUCCIONES'}
        </button>
      </form>
      <nav className="form-links" aria-label="Acciones de recuperación">
        <Link to={loginTarget}>VOLVER A INGRESAR</Link>
      </nav>
    </section>
  )
}
