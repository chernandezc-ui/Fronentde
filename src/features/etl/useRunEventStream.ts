import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeSSE, type SseStatus } from '@/shared/api/sse'
import { etlQueryKeys } from './useEtlQueries'
import type { EtlStreamEvent } from './types'

const MAX_EVENT_BUFFER = 2000

export interface UseRunEventStreamResult {
  events: EtlStreamEvent[]
  droppedCount: number
  status: SseStatus
  finished: boolean
  error: string | null
  reconnect: () => void
  clearEvents: () => void
}

interface StreamState {
  sessionKey: string | null
  events: EtlStreamEvent[]
  droppedCount: number
  status: SseStatus
  finished: boolean
  error: string | null
}

const EMPTY_STREAM_STATE: StreamState = {
  sessionKey: null,
  events: [],
  droppedCount: 0,
  status: 'idle',
  finished: false,
  error: null,
}

function formatLocalTime(): string {
  const now = new Date()
  return now.toLocaleTimeString('es-PE', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function useRunEventStream(idCorrida: string | null): UseRunEventStreamResult {
  const queryClient = useQueryClient()
  const [reconnectSeq, setReconnectSeq] = useState(0)
  const sessionKey = idCorrida ? `${idCorrida}:${reconnectSeq}` : null

  const [streamState, setStreamState] = useState<StreamState>(EMPTY_STREAM_STATE)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const seqRef = useRef(0)

  const clearEvents = useCallback(() => {
    setStreamState((prev) => ({
      ...prev,
      events: [],
      droppedCount: 0,
    }))
  }, [])

  const reconnect = useCallback(() => {
    setReconnectSeq((prev) => prev + 1)
  }, [])

  useEffect(() => {
    seenIdsRef.current.clear()
    seqRef.current = 0

    if (!idCorrida || !sessionKey) {
      return
    }

    let unsubscribeRef: (() => void) | null = null
    let disposed = false

    const ensureSession = (prev: StreamState): StreamState => {
      if (prev.sessionKey === sessionKey) return prev
      return {
        sessionKey,
        events: [],
        droppedCount: 0,
        status: 'connecting',
        finished: false,
        error: null,
      }
    }

    const invalidateAfterFinish = () => {
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.summary() })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'active-runs'] })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'history'] })
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.detail(idCorrida) })
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.steps(idCorrida) })
    }

    unsubscribeRef = subscribeSSE(`/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}/eventos`, {
      onStatusChange: (nextStatus) => {
        if (disposed) return
        setStreamState((prev) => ({
          ...ensureSession(prev),
          status: nextStatus,
        }))
      },
      onError: (err) => {
        if (disposed) return
        setStreamState((prev) => ({
          ...ensureSession(prev),
          error: err.message || 'Error en la conexión SSE',
        }))
      },
      onMessage: (ev) => {
        if (disposed) return

        const tipoRaw = (ev.event || 'log').trim().toLowerCase()
        const mensaje = ev.data ?? ''
        const eventId = ev.id ? String(ev.id).trim() : null

        const isTerminalSignal = tipoRaw === 'fin' || mensaje.trim() === '[FIN_CORRIDA]'

        if (eventId && !isTerminalSignal) {
          if (seenIdsRef.current.has(eventId)) {
            return
          }
          seenIdsRef.current.add(eventId)
        }

        if (mensaje !== '' || isTerminalSignal) {
          seqRef.current += 1
          const item: EtlStreamEvent = {
            key: eventId ? `id-${eventId}` : `seq-${seqRef.current}`,
            eventId,
            tipo: isTerminalSignal ? 'fin' : tipoRaw || 'log',
            mensaje: isTerminalSignal && !mensaje ? '[FIN_CORRIDA]' : mensaje,
            receivedAt: formatLocalTime(),
          }

          setStreamState((prev) => {
            const base = ensureSession(prev)
            const nextEvents =
              base.events.length >= MAX_EVENT_BUFFER
                ? [...base.events.slice(base.events.length - MAX_EVENT_BUFFER + 1), item]
                : [...base.events, item]
            const addedDrops =
              base.events.length >= MAX_EVENT_BUFFER
                ? base.events.length - MAX_EVENT_BUFFER + 1
                : 0
            return {
              ...base,
              events: nextEvents,
              droppedCount: base.droppedCount + addedDrops,
              finished: base.finished || isTerminalSignal,
            }
          })
        }

        if (tipoRaw === 'paso') {
          void queryClient.invalidateQueries({ queryKey: etlQueryKeys.detail(idCorrida) })
          void queryClient.invalidateQueries({ queryKey: etlQueryKeys.steps(idCorrida) })
        }

        if (isTerminalSignal) {
          invalidateAfterFinish()
          if (unsubscribeRef) {
            unsubscribeRef()
          }
        }
      },
    })

    return () => {
      disposed = true
      if (unsubscribeRef) {
        unsubscribeRef()
      }
    }
  }, [idCorrida, sessionKey, queryClient])

  const current =
    sessionKey && streamState.sessionKey === sessionKey
      ? streamState
      : sessionKey
        ? { ...EMPTY_STREAM_STATE, sessionKey, status: 'connecting' as SseStatus }
        : EMPTY_STREAM_STATE

  return {
    events: current.events,
    droppedCount: current.droppedCount,
    status: current.status,
    finished: current.finished,
    error: current.error,
    reconnect,
    clearEvents,
  }
}
