import { Outlet } from 'react-router'
import packageInfo from '../../package.json'
import { ConnectivityStatus } from './connectivity-status'
import { PwaUpdatePrompt } from './pwa-update-prompt'

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="transcefrencias, inicio">
          trans<span>cef</span>rencias
        </a>
        <ConnectivityStatus />
      </header>
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">v{packageInfo.version}</footer>
      <PwaUpdatePrompt />
    </div>
  )
}
