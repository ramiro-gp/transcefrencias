import { createBrowserRouter } from 'react-router'
import { AppLayout } from '../components/app-layout'
import { HomePage } from '../pages/home-page'
import { NotFoundPage } from '../pages/not-found-page'

export const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
])
