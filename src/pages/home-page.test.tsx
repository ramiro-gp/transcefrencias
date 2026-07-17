import { render, screen } from '@testing-library/react'
import { HomePage } from './home-page'

describe('HomePage', () => {
  it('explains that the application is being prepared without presenting mock data', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', {
        name: 'Cada gasto. Las personas que realmente participaron.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'LA APLICACIÓN TODAVÍA ESTÁ EN PREPARACIÓN.',
    )
  })
})
