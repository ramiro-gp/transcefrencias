import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ConfirmDialog } from './confirm-dialog'

function renderDialog(onConfirm = vi.fn(() => Promise.resolve())) {
  const onOpenChange = vi.fn()
  render(
    <ConfirmDialog
      open
      title="EXPULSAR A PEDRO"
      description="Pedro perderá el acceso al evento."
      confirmLabel="EXPULSAR"
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
    />,
  )
  return { onConfirm, onOpenChange }
}

describe('ConfirmDialog', () => {
  it('describes the affected person and cancels without executing', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()
    const { onConfirm, onOpenChange } = renderDialog()

    expect(screen.getByRole('heading', { name: 'EXPULSAR A PEDRO' })).toBeInTheDocument()
    expect(screen.getByText('Pedro perderá el acceso al evento.')).toBeInTheDocument()
    const cancel = screen.getByRole('button', { name: 'CANCELAR' })
    expect(cancel).toHaveFocus()
    fireEvent.click(cancel)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(trigger).toHaveFocus()
  })

  it('closes with Escape before submission', () => {
    const { onConfirm, onOpenChange } = renderDialog()
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('submits exactly once while pending', async () => {
    let resolve: (() => void) | undefined
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done
        }),
    )
    renderDialog(onConfirm)
    const confirm = screen.getByRole('button', { name: 'EXPULSAR' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(confirm).toBeDisabled()
    resolve?.()
    await waitFor(() => expect(confirm).not.toBeDisabled())
  })

  it('keeps the dialog open and reports a failure', async () => {
    const { onOpenChange } = renderDialog(
      vi.fn(() => Promise.reject(new Error('Falló la expulsión.'))),
    )
    fireEvent.click(screen.getByRole('button', { name: 'EXPULSAR' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falló la expulsión.')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('closes after a successful submission', async () => {
    const { onOpenChange } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'EXPULSAR' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
