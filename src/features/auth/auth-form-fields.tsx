import type { FieldError } from 'react-hook-form'

export function FieldErrorMessage({
  id,
  error,
}: {
  readonly id: string
  readonly error: FieldError | undefined
}) {
  if (!error) {
    return null
  }

  return (
    <p className="field-error" id={id} role="alert">
      {error.message}
    </p>
  )
}

export function FormFeedback({ message }: { readonly message: string | null }) {
  if (!message) {
    return null
  }

  return (
    <p className="form-feedback" role="status" aria-live="polite">
      {message}
    </p>
  )
}
