import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { EventExpense } from '../expenses/expense-service'
import type { Participant } from '../events/event-service'
import { useSettlement } from './use-settlement'

class WorkerMock {
  static instances: WorkerMock[] = []
  readonly terminate = vi.fn()
  readonly postMessage = vi.fn()
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    WorkerMock.instances.push(this)
  }
}

const participants: Participant[] = [
  { id: 'p1', profileId: 'me', displayName: 'Ana', active: true, mergedIntoId: null },
]
const expenses: EventExpense[] = [
  {
    id: 'e1',
    concept: 'Cena',
    category: 'food',
    amount: 500,
    payers: [{ participantId: 'p1', amount: 500 }],
    participantIds: ['p1'],
    createdBy: 'me',
    revision: 1,
    createdAt: 'now',
  },
]
const success = {
  type: 'success',
  result: {
    people: [],
    expenseNames: new Map(),
    optimization: {
      status: 'exact',
      minimumTransferCount: 0,
      transfers: [],
      metrics: { exploredStates: 0, memoizedStates: 0, maximumDepth: 0 },
    },
  },
}

function Probe({ list = expenses }: { readonly list?: readonly EventExpense[] }) {
  const { state, cancel, continueExactly } = useSettlement(list, participants, true)
  return (
    <>
      <output>{state.status}</output>
      <button onClick={cancel}>CANCELAR</button>
      <button onClick={continueExactly}>CONTINUAR</button>
    </>
  )
}

describe('useSettlement', () => {
  beforeEach(() => {
    WorkerMock.instances = []
    vi.stubGlobal('Worker', WorkerMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('terminates obsolete workers and ignores their responses', () => {
    const { rerender, unmount } = render(<Probe />)
    const first = WorkerMock.instances[0]!
    rerender(<Probe list={[{ ...expenses[0]!, id: 'e2' }]} />)
    const second = WorkerMock.instances[1]!

    expect(first.terminate).toHaveBeenCalled()
    act(() => first.onmessage?.({ data: success } as MessageEvent))
    expect(screen.getByText('idle')).toBeInTheDocument()
    act(() => second.onmessage?.({ data: success } as MessageEvent))
    expect(screen.getByText('success')).toBeInTheDocument()
    unmount()
    expect(second.terminate).toHaveBeenCalled()
  })

  it('cancels the active worker and keeps the interface usable', () => {
    render(<Probe />)
    const worker = WorkerMock.instances[0]!
    act(() => screen.getByRole('button', { name: 'CANCELAR' }).click())

    expect(worker.terminate).toHaveBeenCalled()
    expect(screen.getByText('cancelled')).toBeInTheDocument()
  })

  it('starts an explicit unlimited calculation after the protected result', () => {
    render(<Probe />)
    const first = WorkerMock.instances[0]!
    act(() => screen.getByRole('button', { name: 'CONTINUAR' }).click())
    const second = WorkerMock.instances[1]!

    expect(first.terminate).toHaveBeenCalled()
    expect(second.postMessage).toHaveBeenCalledWith([expenses, participants, true])
  })
})
