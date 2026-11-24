import { useCallback, useEffect, useRef, useState } from 'react'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import { asArray, asFiniteNumber, asRecord, asString } from '@/shared/api/normalize'
import { subscribeSSE, type SseStatus } from '@/shared/api/sse'
import { useAuthStore } from '@/shared/auth/authStore'

export interface CalidadTopItem {
  etiqueta: string
  cuenta: number
}

export interface CalidadSsePayload {
  total_hoy: number
  top_tipos: CalidadTopItem[]
  top_fundos: CalidadTopItem[]
  timestamp_servidor: string | null
  error: string | null
}

function parseTopItems(rawList: unknown, labelKey: string): CalidadTopItem[] {
  return asArray<unknown>(rawList)
    .map((entry) => {
      const rec = asRecord(entry)
      const label = asString(
        rec[labelKey] ?? rec.etiqueta ?? rec.nombre ?? rec.label,
        'Sin especificar',
      ).trim()
      return {
        etiqueta: label || 'Sin especificar',
        cuenta: Math.max(0, asFiniteNumber(rec.Cuenta ?? rec.cuenta ?? rec.total, 0)),
      }
    })
    .filter((item) => item.cuenta > 0 || item.etiqueta !== 'Sin especificar')
}

export function normalizeCalidadPayload(raw: unknown): CalidadSsePayload {
  const obj = asRecord(raw)
  return {
    total_hoy: Math.max(0, asFiniteNumber(obj.total_hoy, 0)),
    top_tipos: parseTopItems(obj.top_tipos, 'Tipo_Error_Raw'),
    top_fundos: parseTopItems(obj.top_fundos, 'Fundo_Raw'),
    timestamp_servidor:
      typeof obj.timestamp_servidor === 'string' && obj.timestamp_servidor.trim()
        ? obj.timestamp_servidor
        : null,
    error: typeof obj.error === 'string' && obj.error.trim() ? obj.error : null,
  }
}

export function useCalidadStream(enabled = true) {
  const token = useAuthStore((s) => s.token)
  const [status, setStatus] = useState<SseStatus>('idle')
  const [latest, setLatest] = useState<CalidadSsePayload | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [connectNonce, setConnectNonce] = useState(0)
  const unsubRef = useRef<(() => void) | null>(null)

  const reconnect = useCallback(() => {
    setConnectNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !token) {
      unsubRef.current?.()
      unsubRef.current = null
      return
    }

    const unsub = subscribeSSE(API_ENDPOINTS.health.calidadStream, {
      maxRetries: 5,
      retryDelayMs: 5000,
      onStatusChange: (nextStatus) => {
        setStatus(nextStatus)
      },
      onMessage: (msg) => {
        if (!msg.data) return
        if (msg.event === 'error') {
          try {
            const parsed = asRecord(JSON.parse(msg.data))
            setLastError(asString(parsed.error, 'Error en stream de calidad'))
          } catch {
            setLastError(msg.data)
          }
          return
        }

        if (msg.event === 'calidad' || !msg.event) {
          try {
            const parsed = JSON.parse(msg.data) as unknown
            if (parsed && typeof parsed === 'object') {
              const normalized = normalizeCalidadPayload(parsed)
              setLatest(normalized)
              setLastError(normalized.error)
            }
          } catch {
            // Ignora heartbeats o tramas SSE no JSON
          }
        }
      },
      onError: (err) => {
        setLastError(err.message)
      },
    })

    unsubRef.current = unsub
    return () => {
      unsub()
      if (unsubRef.current === unsub) {
        unsubRef.current = null
      }
    }
  }, [enabled, token, connectNonce])

  return {
    status: !enabled || !token ? ('idle' as SseStatus) : status,
    latest: !enabled || !token ? null : latest,
    lastError: !enabled || !token ? null : lastError,
    reconnect,
  }
}
