import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../app/auth-context'
import { FieldErrorMessage, FormFeedback } from '../features/auth/auth-form-fields'
import { newPasswordSchema, type NewPasswordValues } from '../features/auth/auth-schemas'

export function NewPasswordPage() {
  const { completePasswordRecovery } = useAuth()
  const [feedback, setFeedback] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', passwordConfirmation: '' },
  })

  async function onSubmit(values: NewPasswordValues) {
    setFeedback(null)

    try {
      await completePasswordRecovery(values.password)
      reset()
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'No pudimos actualizar tu contraseña.',
      )
    }
  }

  return (
    <section className="form-page" aria-labelledby="new-password-title">
      <p className="eyebrow">NUEVA CONTRASEÑA</p>
      <h1 id="new-password-title">Protegé tu cuenta.</h1>
      <p className="intro-copy">
        Al guardar, vas a volver a ingresar con tu nueva contraseña.
      </p>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div className="field">
          <label htmlFor="new-password">Nueva contraseña</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.password ? 'new-password-error' : undefined}
            {...register('password')}
          />
          <FieldErrorMessage id="new-password-error" error={errors.password} />
        </div>
        <div className="field">
          <label htmlFor="new-password-confirmation">Repetir contraseña</label>
          <input
            id="new-password-confirmation"
            type="password"
            autoComplete="new-password"
            aria-describedby={
              errors.passwordConfirmation ? 'new-password-confirmation-error' : undefined
            }
            {...register('passwordConfirmation')}
          />
          <FieldErrorMessage
            id="new-password-confirmation-error"
            error={errors.passwordConfirmation}
          />
        </div>
        <FormFeedback message={feedback} />
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'GUARDANDO…' : 'GUARDAR CONTRASEÑA'}
        </button>
      </form>
    </section>
  )
}
