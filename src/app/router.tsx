import { createBrowserRouter } from 'react-router'
import { GuestRoute, PrivateRoute, RecoveryRoute } from './route-guards'
import { AppLayout } from '../components/app-layout'
import { SessionRedirectPage } from '../pages/session-redirect-page'

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: SessionRedirectPage,
      },
      {
        Component: GuestRoute,
        children: [
          {
            path: 'login',
            lazy: () =>
              import('../pages/login-page').then(({ LoginPage: Component }) => ({
                Component,
              })),
          },
          {
            path: 'registro',
            lazy: () =>
              import('../pages/register-page').then(({ RegisterPage: Component }) => ({
                Component,
              })),
          },
        ],
      },
      {
        path: 'olvide-mi-contrasena',
        lazy: () =>
          import('../pages/forgot-password-page').then(
            ({ ForgotPasswordPage: Component }) => ({
              Component,
            }),
          ),
      },
      {
        Component: RecoveryRoute,
        children: [
          {
            path: 'nueva-contrasena',
            lazy: () =>
              import('../pages/new-password-page').then(
                ({ NewPasswordPage: Component }) => ({
                  Component,
                }),
              ),
          },
        ],
      },
      {
        Component: PrivateRoute,
        children: [
          {
            path: 'inicio',
            lazy: () =>
              import('../pages/home-page').then(({ HomePage: Component }) => ({
                Component,
              })),
          },
          {
            path: 'perfil',
            lazy: () =>
              import('../pages/profile-page').then(({ ProfilePage: Component }) => ({
                Component,
              })),
          },
        ],
      },
      {
        path: '*',
        lazy: () =>
          import('../pages/not-found-page').then(({ NotFoundPage: Component }) => ({
            Component,
          })),
      },
    ],
  },
])
