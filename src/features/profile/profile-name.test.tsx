import { fireEvent, render, screen } from '@testing-library/react'
import { displayProfileName } from './profile-display'
import { ProfileName } from './profile-name'

describe('ProfileName', () => {
  it('prefers the nickname and reveals the real name with an accessible button', () => {
    render(<ProfileName profile={{ fullName: 'Ana María', nickname: 'Nani' }} />)

    const button = screen.getByRole('button', { name: 'Nani' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('(Ana María)')).not.toBeInTheDocument()

    fireEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('(Ana María)')).toBeInTheDocument()
  })

  it('uses the real name directly when there is no nickname', () => {
    expect(displayProfileName({ fullName: 'Ana María', nickname: null })).toBe(
      'Ana María',
    )
    render(<ProfileName profile={{ fullName: 'Ana María', nickname: null }} />)
    expect(screen.getByText('Ana María')).toBeInTheDocument()
  })
})
