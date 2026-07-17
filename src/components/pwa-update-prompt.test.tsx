import { fireEvent, render, screen } from '@testing-library/react'
import { setPwaUpdate } from '../app/pwa-update'
import { PwaUpdatePrompt } from './pwa-update-prompt'

describe('PwaUpdatePrompt', () => {
  it('only applies an update after the user confirms it', () => {
    let updateCalls = 0
    setPwaUpdate(() => {
      updateCalls += 1
    })

    render(<PwaUpdatePrompt />)

    expect(screen.queryByRole('button', { name: 'ACTUALIZAR' })).not.toBeInTheDocument()
    expect(updateCalls).toBe(0)

    fireEvent(window, new Event('pwa:update-available'))
    fireEvent.click(screen.getByRole('button', { name: 'ACTUALIZAR' }))

    expect(updateCalls).toBe(1)
  })

  it('hides the prompt when the user defers the update', () => {
    render(<PwaUpdatePrompt />)

    fireEvent(window, new Event('pwa:update-available'))
    fireEvent.click(screen.getByRole('button', { name: 'MÁS TARDE' }))

    expect(screen.queryByRole('button', { name: 'ACTUALIZAR' })).not.toBeInTheDocument()
  })
})
