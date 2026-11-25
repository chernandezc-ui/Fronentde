import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/shared/auth/authStore'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 10_000,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  )

  // Limpiar caché de consultas ante cualquier cierre de sesión (manual o auto-logout 401 HTTP/SSE)
  useEffect(() => {
    return useAuthStore.subscribe((state, prevState) => {
      if (prevState.token && !state.token) {
        queryClient.clear()
      }
    })
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={200}>
        {children}
        <Toaster richColors position="bottom-right" closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
