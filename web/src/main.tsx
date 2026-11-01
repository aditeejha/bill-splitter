import '@fontsource-variable/inter'
import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CrashScreen } from './components/CrashScreen'
import { ApiError } from './lib/api'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx answer will not change if we ask again, so only network errors, timeouts and
      // 5xx answers are retried, and only once.
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.isClientError),
      staleTime: 15_000,
    },
  },
})

const router = createRouter({ routeTree, defaultErrorComponent: CrashScreen })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('root element missing')

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
