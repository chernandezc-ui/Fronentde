import { ApiError } from '@/shared/api/client'
import { toast } from 'sonner'

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-PE').format(value)
}

export function notifyApiError(err: unknown, fallback = 'Ocurrió un error al comunicarse con la API'): void {
  if (err instanceof ApiError) {
    const reqSuffix = err.requestId ? ` · ID: ${err.requestId}` : ''
    toast.error(err.detail || fallback, {
      description: `HTTP ${err.status}${reqSuffix}`,
      action: err.requestId
        ? {
            label: 'Copiar ID',
            onClick: () => {
              void navigator.clipboard.writeText(err.requestId!)
            },
          }
        : undefined,
    })
    return
  }
  toast.error(err instanceof Error ? err.message : fallback)
}
