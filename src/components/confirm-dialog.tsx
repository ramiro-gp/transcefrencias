import { useEffect, useRef, useState } from 'react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  readonly open: boolean
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly onConfirm: () => Promise<void>
  readonly onOpenChange: (open: boolean) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        else dialog.setAttribute('open', '')
      }
      cancelRef.current?.focus()
      return
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  const close = () => {
    if (isPending) return
    setError(null)
    onOpenChange(false)
    triggerRef.current?.focus()
  }

  const confirm = async () => {
    if (isPending) return
    setIsPending(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
      triggerRef.current?.focus()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No pudimos completar la acción.',
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClose={() => {
        if (!isPending) onOpenChange(false)
      }}
    >
      <section>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        {error && (
          <p className="form-feedback" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-dialog-actions">
          <button
            ref={cancelRef}
            className="button"
            type="button"
            disabled={isPending}
            onClick={close}
          >
            CANCELAR
          </button>
          <button
            className="button button-danger"
            type="button"
            disabled={isPending}
            onClick={() => void confirm()}
          >
            {isPending ? 'PROCESANDO…' : confirmLabel}
          </button>
        </div>
      </section>
    </dialog>
  )
}
