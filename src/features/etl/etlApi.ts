import { apiRequest } from '@/shared/api/client'
import type {
  CorridaActiva,
  CorridaIniciada,
  DetalleCorrida,
  EtlResumen,
  FactDisponible,
  FallosRecientes,
  HistorialCorrida,
  PasoCorrida,
  PeticionIniciarCorrida,
  RespuestaCancelarCorrida,
  TablePreviewNormalized,
  TablePreviewRaw,
} from './types'

export function fetchFactsCatalog(): Promise<FactDisponible[]> {
  return apiRequest<FactDisponible[]>('/api/v1/etl/facts')
}

export function fetchEtlSummary(): Promise<EtlResumen> {
  return apiRequest<EtlResumen>('/api/v1/etl/resumen')
}

export function fetchRecentFailures(horas = 24): Promise<FallosRecientes> {
  return apiRequest<FallosRecientes>('/api/v1/etl/fallos-recientes', {
    query: { horas },
  })
}

export function fetchRunHistory(limite = 50): Promise<HistorialCorrida[]> {
  return apiRequest<HistorialCorrida[]>('/api/v1/etl/corridas', {
    query: { limite },
  })
}

export function fetchActiveRuns(limite = 50): Promise<CorridaActiva[]> {
  return apiRequest<CorridaActiva[]>('/api/v1/etl/corridas/activas', {
    query: { limite },
  })
}

export function fetchRunDetail(idCorrida: string): Promise<DetalleCorrida> {
  return apiRequest<DetalleCorrida>(`/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}`)
}

export function fetchRunSteps(idCorrida: string): Promise<PasoCorrida[]> {
  return apiRequest<PasoCorrida[]>(`/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}/pasos`)
}

export function startEtlRun(payload: PeticionIniciarCorrida): Promise<CorridaIniciada> {
  return apiRequest<CorridaIniciada>('/api/v1/etl/corridas', {
    method: 'POST',
    body: payload,
  })
}

export function cancelEtlRun(idCorrida: string): Promise<RespuestaCancelarCorrida> {
  return apiRequest<RespuestaCancelarCorrida>(
    `/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}`,
    { method: 'DELETE' },
  )
}

function normalizePreviewPayload(raw: unknown): TablePreviewNormalized {
  if (Array.isArray(raw)) {
    const rows = raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    return { columns, rows, total: rows.length }
  }

  if (!raw || typeof raw !== 'object') {
    return { columns: [], rows: [], total: 0 }
  }

  const obj = raw as TablePreviewRaw
  const rawRows = obj.rows ?? obj.filas ?? obj.datos ?? []
  const rows = Array.isArray(rawRows)
    ? rawRows.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : []

  const rawColumns = obj.columns ?? obj.columnas
  const columns =
    Array.isArray(rawColumns) && rawColumns.length > 0
      ? rawColumns.map(String)
      : rows.length > 0
        ? Object.keys(rows[0])
        : []

  const total = typeof obj.total === 'number' ? obj.total : rows.length

  return { columns, rows, total }
}

export async function fetchTablePreview(tabla: string): Promise<TablePreviewNormalized> {
  const raw = await apiRequest<TablePreviewRaw | Record<string, unknown>[]>(
    `/api/v1/etl/preview/${encodeURIComponent(tabla)}`,
  )
  return normalizePreviewPayload(raw)
}
