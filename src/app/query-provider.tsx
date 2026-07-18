import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof Error && error.name === 'ProfileInvariantError') {
    return false
  }

  if (error instanceof Error && error.name === 'AuthorizationError') {
    return false
  }

  return failureCount < 2
}

export function QueryProvider({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
