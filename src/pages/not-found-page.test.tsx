import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { NotFoundPage } from './not-found-page'

describe('NotFoundPage', () => {
  it('offers an accessible way back to the home route', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Esta ruta no existe.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'VOLVER AL INICIO' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
