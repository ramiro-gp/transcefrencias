import { registerSW } from 'virtual:pwa-register'
import { setPwaUpdate } from './pwa-update'

export function registerPwa(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      window.dispatchEvent(new Event('pwa:update-available'))
    },
  })

  setPwaUpdate(() => {
    void updateServiceWorker(true)
  })
}
