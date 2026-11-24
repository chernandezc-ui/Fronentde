import { AlertTriangle, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/shared/api/client'

interface ApiErrorBannerProps {
  error: unknown
  title?: string
  onRetry?: () => void
}

export function ApiErrorBanner({ error, title = 'Error al cargar datos', onRetry }: ApiErrorBannerProps) {
  const isApi = error instanceof ApiError
  const message = isApi
    ? error.detail
    : error instanceof Error
      ? error.message
      : 'No se pudo completar la consulta al backend.'
  const requestId = isApi ? error.requestId : null

  return (
    <Alert variant="destructive" className="border-rose-500/35 bg-rose-500/8">
      <AlertTriangle className="size-4" />
      <AlertTitle className="flex flex-wrap items-center justify-between gap-2">
        <span>{title}</span>
        {isApi && <span className="font-mono text-xs opacity-80">HTTP {error.status}</span>}
      </AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm">{message}</p>
          {requestId && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(requestId)
                toast.success('X-Request-ID copiado')
              }}
              className="inline-flex items-center gap-1.5 font-mono text-xs underline-offset-4 hover:underline"
            >
              <Copy className="size-3" />
              Request ID: {requestId}
            </button>
          )}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw className="mr-1.5 size-3.5" />
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
