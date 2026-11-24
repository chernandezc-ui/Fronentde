import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'
import { API_BASE_URL } from '@/shared/api/client'
import { useAuthStore } from '@/shared/auth/authStore'

export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error'

export interface SseOptions {
  onStatusChange?: (status: SseStatus) => void
  onMessage: (msg: EventSourceMessage) => void
  onError?: (err: Error) => void
  maxRetries?: number
  retryDelayMs?: number
}

/**
 * Suscripción SSE con Bearer JWT usando @microsoft/fetch-event-source.
 * Devuelve una función cleanup que aborta el stream de forma segura.
 */
export function subscribeSSE(path: string, options: SseOptions): () => void {
  const { onStatusChange, onMessage, onError, maxRetries = 5, retryDelayMs = 3000 } = options
  const controller = new AbortController()
  let retries = 0
  let closedManually = false

  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = `${API_BASE_URL}${normalized}`

  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  onStatusChange?.('connecting')

  void fetchEventSource(url, {
    method: 'GET',
    headers,
    signal: controller.signal,
    openWhenHidden: true,
    async onopen(response) {
      if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
        retries = 0
        onStatusChange?.('open')
        return
      }
      if (response.status === 401) {
        useAuthStore.getState().logout()
        throw new Error('Sesión expirada (401)')
      }
      throw new Error(`No se pudo abrir el stream SSE (HTTP ${response.status})`)
    },
    onmessage(ev) {
      onMessage(ev)
    },
    onclose() {
      if (!closedManually) {
        onStatusChange?.('closed')
      }
    },
    onerror(err) {
      if (closedManually || controller.signal.aborted) {
        throw err
      }
      const errorObj = err instanceof Error ? err : new Error(String(err))
      retries += 1
      if (retries > maxRetries || errorObj.message.includes('401')) {
        onStatusChange?.('error')
        onError?.(errorObj)
        throw errorObj
      }
      onStatusChange?.('reconnecting')
      return retryDelayMs
    },
  }).catch((err) => {
    if (!closedManually && !controller.signal.aborted) {
      onStatusChange?.('error')
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  })

  return () => {
    closedManually = true
    controller.abort()
    onStatusChange?.('closed')
  }
}
