import { PlugZap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/shared/components/StatusBadge'

interface EndpointPendingBannerProps {
  title: string
  endpoint: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  description?: string
  onRetry?: () => void
  isRetrying?: boolean
}

/**
 * Aviso limpio y transparente para vistas Etapa 2 ya construidas en el frontend
 * cuyo endpoint todavía devuelve 404/405/501 en el backend.
 */
export function EndpointPendingBanner({
  title,
  endpoint,
  method = 'GET',
  description,
  onRetry,
  isRetrying = false,
}: EndpointPendingBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <PlugZap className="size-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <StatusBadge label="Esperando API Backend" tone="pending" />
          </div>
          <p className="text-xs text-muted-foreground">
            {description ||
              'La interfaz y validaciones ya están listas. En cuanto publiques esta ruta en FastAPI, los datos se cargarán automáticamente.'}
          </p>
          <p className="font-mono text-[11px] text-amber-800 break-all dark:text-amber-300">
            {method} {endpoint}
          </p>
        </div>
      </div>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="shrink-0"
        >
          <RefreshCw className={`size-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          Comprobar API
        </Button>
      )}
    </div>
  )
}
