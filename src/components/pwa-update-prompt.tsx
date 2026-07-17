import { useEffect, useState } from 'react'
import { applyPwaUpdate } from '../app/pwa-update'

export function PwaUpdatePrompt() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  useEffect(() => {
    const showUpdate = () => setIsUpdateAvailable(true)
    window.addEventListener('pwa:update-available', showUpdate)

    return () => window.removeEventListener('pwa:update-available', showUpdate)
  }, [])

  if (!isUpdateAvailable) {
    return null
  }

  return (
    <section
      className="update-prompt"
      aria-live="polite"
      aria-label="Actualización disponible"
    >
      <p>HAY UNA VERSIÓN NUEVA DISPONIBLE.</p>
      <div className="update-actions">
        <button className="button button-primary" type="button" onClick={applyPwaUpdate}>
          ACTUALIZAR
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setIsUpdateAvailable(false)}
        >
          MÁS TARDE
        </button>
      </div>
    </section>
  )
}
