import { Link, Outlet } from 'react-router'
import packageInfo from '../../package.json'
import { ConnectivityStatus } from './connectivity-status'
import { PwaUpdatePrompt } from './pwa-update-prompt'
import { SessionNavigation } from './session-navigation'

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/" aria-label="transcefrencias, inicio">
          trans<span>cef</span>rencias
        </Link>
        <div className="header-actions">
          <ConnectivityStatus />
          <SessionNavigation />
        </div>
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
