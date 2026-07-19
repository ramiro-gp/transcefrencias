/// <reference lib="webworker" />
import { calculateEventSettlement } from './settlement-model'

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (event: MessageEvent<Parameters<typeof calculateEventSettlement>>) => {
  try {
    self.postMessage({ type: 'success', result: calculateEventSettlement(...event.data) })
  } catch {
    self.postMessage({ type: 'error', message: 'No pudimos calcular la liquidación.' })
  }
}
