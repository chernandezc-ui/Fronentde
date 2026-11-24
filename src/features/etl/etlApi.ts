import { apiRequest } from '@/shared/api/client'
import { asArray, asFiniteNumber, asRecord } from '@/shared/api/normalize'
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

export async function fetchFactsCatalog(): Promise<FactDisponible[]> {
  return asArray<FactDisponible>(await apiRequest<unknown>('/api/v1/etl/facts'))
}

export async function fetchEtlSummary(): Promise<EtlResumen> {
  const raw = asRecord(await apiRequest<unknown>('/api/v1/etl/resumen'))
  return {
    corridas_activas: asFiniteNumber(raw.corridas_activas, 0),
    comandos_pendientes: asFiniteNumber(raw.comandos_pendientes, 0),
    comandos_procesando: asFiniteNumber(raw.comandos_procesando, 0),
  }
}

export async function fetchRecentFailures(horas = 24): Promise<FallosRecientes> {
  const raw = asRecord(
    await apiRequest<unknown>('/api/v1/etl/fallos-recientes', {
      query: { horas },
    }),
  )
  return {
    fallos: asFiniteNumber(raw.fallos, 0),
    ultimo_fallo_fecha: typeof raw.ultimo_fallo_fecha === 'string' ? raw.ultimo_fallo_fecha : null,
    ultimo_fallo_tabla: typeof raw.ultimo_fallo_tabla === 'string' ? raw.ultimo_fallo_tabla : null,
  }
}

export async function fetchRunHistory(limite = 50): Promise<HistorialCorrida[]> {
  return asArray<HistorialCorrida>(
    await apiRequest<unknown>('/api/v1/etl/corridas', {
      query: { limite },
    }),
  )
}

export async function fetchActiveRuns(limite = 50): Promise<CorridaActiva[]> {
  return asArray<CorridaActiva>(
    await apiRequest<unknown>('/api/v1/etl/corridas/activas', {
      query: { limite },
    }),
  )
}

export async function fetchRunDetail(idCorrida: string): Promise<DetalleCorrida> {
  const raw = await apiRequest<DetalleCorrida>(`/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}`)
  const obj = asRecord(raw)
  return {
    ...(raw as DetalleCorrida),
    pasos: asArray<PasoCorrida>(obj.pasos),
    facts: asArray<string>(obj.facts),
  }
}

export async function fetchRunSteps(idCorrida: string): Promise<PasoCorrida[]> {
  return asArray<PasoCorrida>(
    await apiRequest<unknown>(`/api/v1/etl/corridas/${encodeURIComponent(idCorrida)}/pasos`),
  )
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
