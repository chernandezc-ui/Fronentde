import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { subscribeSSE, type SseStatus } from '@/shared/api/sse'
import { useAuthStore } from '@/shared/auth/authStore'
import type { TelemetriaSsePayload } from '@/features/dashboard/dashboardApi'

export interface TelemetrySample {
  timestamp: string
  latencia_ms: number | null
  conectado: boolean
  corridas_activas: number
}

const MAX_SAMPLES = 30

interface TelemetryStoreState {
  status: SseStatus
  latest: TelemetriaSsePayload | null
  history: TelemetrySample[]
  lastError: string | null
  setStatus: (status: SseStatus) => void
  pushSample: (payload: TelemetriaSsePayload) => void
  setError: (message: string | null) => void
  reset: () => void
}

const useTelemetryStore = create<TelemetryStoreState>((set) => ({
  status: 'idle',
  latest: null,
  history: [],
  lastError: null,
  setStatus: (status) => set({ status }),
  pushSample: (payload) =>
    set((state) => {
      const sample: TelemetrySample = {
        timestamp: payload.timestamp,
        latencia_ms: payload.latencia_ms,
        conectado: payload.conectado,
        corridas_activas: payload.corridas_activas,
      }
      const nextHistory = [...state.history, sample].slice(-MAX_SAMPLES)
      return {
        latest: payload,
        history: nextHistory,
        lastError: null,
      }
    }),
  setError: (lastError) => set({ lastError }),
  reset: () => set({ status: 'idle', latest: null, history: [], lastError: null }),
}))

// Gestor singleton ref-counted para compartir una sola conexión SSE entre AppShell y DashboardPage.
let activeSubscribers = 0
let activeUnsubscribe: (() => void) | null = null
let activeToken: string | null = null

function startConnection(token: string) {
  stopConnection()
  activeToken = token
  const store = useTelemetryStore.getState()
  store.setError(null)

  activeUnsubscribe = subscribeSSE('/health/telemetria/stream', {
    maxRetries: 6,
    retryDelayMs: 3500,
    onStatusChange: (status) => {
      useTelemetryStore.getState().setStatus(status)
    },
    onMessage: (msg) => {
      if (!msg.data) return
      if (msg.event === 'error') {
        try {
          const parsed = JSON.parse(msg.data) as { error?: string }
          useTelemetryStore.getState().setError(parsed.error || 'Error en evento SSE')
        } catch {
          useTelemetryStore.getState().setError(msg.data)
        }
        return
      }

      if (msg.event === 'telemetria' || !msg.event) {
        try {
          const parsed = JSON.parse(msg.data) as TelemetriaSsePayload
          if (typeof parsed.conectado === 'boolean') {
            useTelemetryStore.getState().pushSample(parsed)
          }
        } catch {
          // Ignora heartbeats o tramas no JSON
        }
      }
    },
    onError: (err) => {
      useTelemetryStore.getState().setError(err.message)
    },
  })
}

function stopConnection() {
  if (activeUnsubscribe) {
    activeUnsubscribe()
    activeUnsubscribe = null
  }
  activeToken = null
}

/**
 * Suscribe a `/health/telemetria/stream` mediante conexión SSE compartida.
 * Cualquier componente autenticado puede leer el estado sin duplicar streams.
 */
export function useTelemetryStream(enabled = true) {
  const token = useAuthStore((s) => s.token)
  const status = useTelemetryStore((s) => s.status)
  const latest = useTelemetryStore((s) => s.latest)
  const history = useTelemetryStore((s) => s.history)
  const lastError = useTelemetryStore((s) => s.lastError)

  useEffect(() => {
    if (!enabled || !token) {
      if (!token) {
        stopConnection()
        useTelemetryStore.getState().reset()
      }
      return
    }

    activeSubscribers += 1
    if (!activeUnsubscribe || activeToken !== token) {
      startConnection(token)
    }

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1)
      if (activeSubscribers === 0) {
        stopConnection()
      }
    }
  }, [enabled, token])

  const reconnect = useCallback(() => {
    const currentToken = useAuthStore.getState().token
    if (!currentToken) return
    startConnection(currentToken)
  }, [])

  return {
    status,
    latest,
    history,
    lastError,
    reconnect,
  }
}
