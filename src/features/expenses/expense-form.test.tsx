import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import type { Participant } from '../events/event-service'
import { ExpenseForm } from './expense-form'
import type { ExpenseFormValues } from './expense-schemas'

const participants: Participant[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    profileId: 'u1',
    displayName: 'Ana',
    active: true,
    mergedIntoId: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    profileId: 'u2',
    displayName: 'Beto',
    active: true,
    mergedIntoId: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    profileId: null,
    displayName: 'Cata',
    active: true,
    mergedIntoId: null,
  },
]
const initial = (amount = 20000): ExpenseFormValues => ({
  concept: 'Cena',
  category: 'food',
  amount,
  payers: [{ participantId: participants[0]!.id, amount }],
  participantIds: participants.map((p) => p.id),
})
const setup = (values = initial(), onSubmit = vi.fn()) => {
  render(
    <ExpenseForm
      participants={participants}
      initialValues={values}
      submitLabel="CARGAR GASTO"
      isPending={false}
      onSubmit={onSubmit}
    />,
  )
  return onSubmit
}

describe('ExpenseForm multipayer interactions', () => {
  it('starts at $20.000 with a full-width centered amount and all quick controls', () => {
    setup()
    const amount = screen.getByRole('button', { name: /Editar importe \$20\.000/ })
    expect(amount).toHaveClass('amount-display')
    for (const name of ['− $500', '− $1K', '− $5K', '+ $500', '+ $1K', '+ $5K'])
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CARGAR GASTO' })).toBeEnabled()
  })
  it('changes and redistributes the total with quick buttons', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    fireEvent.click(screen.getByRole('button', { name: '+ $500' }))
    expect(
      screen
        .getAllByLabelText(/Aporte de/)
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['10250', '10250'])
    fireEvent.click(screen.getByRole('button', { name: '− $1K' }))
    expect(
      screen
        .getAllByLabelText(/Aporte de/)
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['9750', '9750'])
  })
  it.each([
    ['1750', '$1.750'],
    ['10k', '$10.000'],
  ])('preserves manual input %s', (input, visible) => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Editar importe/ }))
    const field = screen.getByLabelText('Importe del gasto')
    fireEvent.change(field, { target: { value: input } })
    fireEvent.blur(field)
    expect(
      screen.getByRole('button', {
        name: `Editar importe ${visible}`,
      }),
    ).toBeInTheDocument()
  })
  it('adds three unique payers and distributes integer remainders deterministically', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    expect(
      screen
        .getAllByLabelText(/Aporte de/)
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['6667', '6667', '6666'])
    expect(screen.queryByRole('button', { name: /^[+−]\$500$/ })).not.toBeInTheDocument()
    const selects = screen.getAllByRole('combobox')
    expect(within(selects[2]!).getByRole('option', { name: 'Ana' })).toBeDisabled()
  })
  it('redistributes after removing a payer', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'QUITAR' })[0]!)
    expect(
      screen
        .getAllByLabelText(/Aporte de/)
        .map((input) => (input as HTMLInputElement).value),
    ).toEqual(['10000', '10000'])
  })
  it('preserves other manual contributions, reports differences, and blocks saving', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'AGREGAR PAGADOR' }))
    const inputs = screen.getAllByLabelText(/Aporte de/)
    fireEvent.change(inputs[0]!, { target: { value: '7000' } })
    expect((inputs[1] as HTMLInputElement).value).toBe('10000')
    expect(screen.getByText(/FALTA ASIGNAR/)).toHaveTextContent('$3.000')
    expect(screen.getByRole('button', { name: 'CARGAR GASTO' })).toBeDisabled()
    fireEvent.change(inputs[0]!, { target: { value: '13000' } })
    expect(screen.getByText(/SOBRAN/)).toHaveTextContent('$3.000')
  })
  it('allows a payer outside consumers and shows one exact visible quota', async () => {
    const submit = setup({
      ...initial(1750),
      participantIds: [participants[1]!.id, participants[2]!.id],
    })
    expect(screen.getByText('$875 POR PERSONA')).toBeInTheDocument()
    expect(screen.queryByText(/aprox| a \$/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CARGAR GASTO' }))
    await waitFor(() => expect(submit).toHaveBeenCalled())
  })
  it('warns that later members are not added automatically', () => {
    setup()
    expect(
      screen.getByText(/Quienes se unan después no se agregarán automáticamente/),
    ).toBeInTheDocument()
  })
  it('allows a payer contribution to be cleared and replaced without restoring its prior value', () => {
    setup()
    const input = screen.getByLabelText('Aporte de Ana')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
    expect(screen.getByText(/FALTA ASIGNAR/)).toHaveTextContent('$20.000')
    expect(screen.getByRole('button', { name: 'CARGAR GASTO' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '10k' } })
    fireEvent.blur(input)
    expect(input).toHaveValue('10000')
  })
  it('allows the total to be cleared and rewritten without redistributing intermediate text', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Editar importe/ }))
    const input = screen.getByLabelText('Importe del gasto')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
    expect(screen.getByRole('button', { name: 'CARGAR GASTO' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '1750' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(
      screen.getByRole('button', { name: 'Editar importe $1.750' }),
    ).toBeInTheDocument()
  })
})
