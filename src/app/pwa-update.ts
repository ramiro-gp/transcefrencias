let updateServiceWorker: (() => void) | undefined

export function setPwaUpdate(update: () => void): void {
  updateServiceWorker = update
}

export function applyPwaUpdate(): void {
  updateServiceWorker?.()
}
