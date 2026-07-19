import { useEffect, useRef, useState } from 'react'
import type { Participant } from '../events/event-service'
import type { EventExpense } from '../expenses/expense-service'
import type { SettlementModel } from './settlement-model'

type SettlementState =
  | { readonly status: 'idle' }
  | { readonly status: 'calculating' }
  | { readonly status: 'cancelled' }
  | { readonly status: 'success'; readonly result: SettlementModel }
  | { readonly status: 'error'; readonly message: string }

export function useSettlement(
  expenses: readonly EventExpense[] | undefined,
  participants: readonly Participant[] | undefined,
  enabled: boolean,
) {
  const worker = useRef<Worker | null>(null)
  const request = useRef(0)
  const [unlimited, setUnlimited] = useState(false)
  const [state, setState] = useState<SettlementState>({ status: 'idle' })

  const cancel = () => {
    request.current += 1
    worker.current?.terminate()
    worker.current = null
    setState({ status: 'cancelled' })
  }

  useEffect(() => {
    if (!enabled || !expenses || !participants) {
      worker.current?.terminate()
      worker.current = null
      return
    }
    const currentRequest = ++request.current
    worker.current?.terminate()
    const nextWorker = new Worker(new URL('./settlement.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.current = nextWorker
    nextWorker.onmessage = (
      event: MessageEvent<{ type: string; result?: SettlementModel; message?: string }>,
    ) => {
      if (currentRequest !== request.current) return
      if (event.data.type === 'success' && event.data.result) {
        setState({ status: 'success', result: event.data.result })
      } else {
        setState({
          status: 'error',
          message: event.data.message ?? 'No pudimos calcular la liquidación.',
        })
      }
      nextWorker.terminate()
      if (worker.current === nextWorker) worker.current = null
    }
    nextWorker.onerror = () => {
      if (currentRequest === request.current) {
        setState({ status: 'error', message: 'No pudimos calcular la liquidación.' })
      }
      nextWorker.terminate()
      if (worker.current === nextWorker) worker.current = null
    }
    nextWorker.postMessage([expenses, participants, unlimited] as const)
    return () => {
      nextWorker.terminate()
      if (worker.current === nextWorker) worker.current = null
    }
  }, [enabled, expenses, participants, unlimited])

  const continueExactly = () => {
    setState({ status: 'calculating' })
    setUnlimited(true)
  }

  return { state, cancel, continueExactly }
}
