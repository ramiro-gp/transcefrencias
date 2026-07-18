import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectivityStatus } from './connectivity-status'

function setOnlineStatus(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

describe('ConnectivityStatus', () => {
  beforeEach(() => {
    setOnlineStatus(true)
  })

  it('does not occupy header space while the browser is online', () => {
    render(<ConnectivityStatus />)
    expect(screen.queryByText('CONEXIÓN ACTIVA')).not.toBeInTheDocument()
    expect(screen.queryByText('SIN CONEXIÓN')).not.toBeInTheDocument()
  })

  it('shows a text warning when the browser becomes offline', () => {
    render(<ConnectivityStatus />)
    setOnlineStatus(false)
    fireEvent(window, new Event('offline'))

    expect(screen.getByRole('status')).toHaveTextContent('SIN CONEXIÓN')
  })
})
