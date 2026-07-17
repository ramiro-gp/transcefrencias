import { useEffect, useState } from 'react'

function getInitialOnlineStatus(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine
}

export function ConnectivityStatus() {
  const [isOnline, setIsOnline] = useState(getInitialOnlineStatus)

  useEffect(() => {
    const setOnline = () => setIsOnline(true)
    const setOffline = () => setIsOnline(false)

    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)

    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])

  return (
    <p className={`connection-status ${isOnline ? 'is-online' : 'is-offline'}`}>
      {isOnline ? 'CONEXIÓN ACTIVA' : 'SIN CONEXIÓN'}
    </p>
  )
}
