import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { AppProviders } from './app/app-providers'
import { registerPwa } from './app/pwa-register'
import { RouteLoadingState } from './app/route-loading'
import { router } from './app/router'
import './styles/index.css'

registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <Suspense fallback={<RouteLoadingState />}>
        <RouterProvider router={router} />
      </Suspense>
    </AppProviders>
  </StrictMode>,
)
