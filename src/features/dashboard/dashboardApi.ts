import { ApiError, apiRequest } from '@/shared/api/client'
import { asArray, asFiniteNumber, asOptionalFiniteNumber, asRecord, asString } from '@/shared/api/normalize'

export interface BaseDatosHealth {
  conectado: boolean
  base_datos?: string | null
  latencia_ms?: number | null
  error?: string | null
  version?: string | null
}

export interface HealthResponse {
  servicio: string
  version: string
  entorno: string
  estado: 'activo' | 'degradado' | string
  base_datos: BaseDatosHealth
  timestamp: string
}

export interface LockDetalle {
  id_lock?: number
  id_corrida_activa?: string | null
  adquirido_por?: string | null
  fecha_adquisicion?: string | null
  heartbeat?: string | null
  estado_lock?: 'LIBRE' | 'ACTIVO' | 'VENCIDO' | string
  segundos_desde_heartbeat?: number | null
  error?: string
}

export interface EtlResumen {
  corridas_activas: number
  comandos_pendientes: number
  comandos_procesando: number
}

export interface RunnerReadyResponse {
  servicio?: string
  version?: string
  entorno?: string
  estado: 'libre' | 'ocupado' | 'lock_vencido' | 'control_plane_error' | 'no_listo' | string
  base_datos?: BaseDatosHealth
  control_plane?: {
    estado: string
    resumen?: EtlResumen
    lock?: LockDetalle
    error?: string
  }
  timestamp?: string
  httpStatus: number
}

export interface LockStatusResponse {
  servicio?: string
  version?: string
  entorno?: string
  estado: string
  base_datos?: BaseDatosHealth
  lock: LockDetalle | null
  timestamp?: string
  httpStatus: number
}

export interface TelemetriaSsePayload {
  conectado: boolean
  latencia_ms: number | null
  corridas_activas: number
  comandos_pendientes: number
  comandos_procesando: number
  timestamp: string
  version_sql?: string
}

export interface CuarentenaResumen {
  total: number
  pendientes: number
  resueltos: number
  descartados: number
}

export interface EtlFallosRecientes {
  fallos: number
  ultimo_fallo_fecha: string | null
  ultimo_fallo_tabla: string | null
}

export interface AuditoriaResumenBitacora {
  ventana_dias: number
  total: number
  ok: number
  errores: number
  en_proceso: number
  filas_ok: number
  filas_rechazadas: number
  tasa_exito_pct: number
}

export interface AlertaAck {
  id_alerta: string
  usuario_dni: string
  fecha_ack: string
  comentario: string | null
}

export interface RespuestaAccionAck {
  id_alerta: string
  accion: 'ack' | 'unack' | string
  mensaje: string
}

function normalizeBaseDatos(raw: unknown): BaseDatosHealth {
  const obj = asRecord(raw)
  return {
    conectado: Boolean(obj.conectado),
    base_datos: typeof obj.base_datos === 'string' ? obj.base_datos : null,
    latencia_ms: asOptionalFiniteNumber(obj.latencia_ms),
    error: typeof obj.error === 'string' ? obj.error : null,
    version: typeof obj.version === 'string' ? obj.version : null,
  }
}

export async function fetchHealth(): Promise<HealthResponse> {
  const raw = asRecord(await apiRequest<unknown>('/health'))
  return {
    servicio: asString(raw.servicio, 'ACP Platform API'),
    version: asString(raw.version, '—'),
    entorno: asString(raw.entorno, 'prod'),
    estado: asString(raw.estado, 'degradado'),
    base_datos: normalizeBaseDatos(raw.base_datos),
    timestamp: asString(raw.timestamp, ''),
  }
}

/**
 * GET /health/ready/runner puede devolver HTTP 503 con body JSON estructurado
 * cuando el runner está en estado `no_listo`, `control_plane_error` o `lock_vencido`.
 * Se parsea y devuelve como diagnóstico válido sin romper la UI.
 */
export async function fetchRunnerReady(): Promise<RunnerReadyResponse> {
  try {
    const raw = asRecord(await apiRequest<unknown>('/health/ready/runner'))
    const cp = raw.control_plane && typeof raw.control_plane === 'object'
      ? (raw.control_plane as RunnerReadyResponse['control_plane'])
      : undefined
    return {
      servicio: asString(raw.servicio) || undefined,
      version: asString(raw.version) || undefined,
      entorno: asString(raw.entorno) || undefined,
      estado: asString(raw.estado, 'desconocido'),
      base_datos: raw.base_datos ? normalizeBaseDatos(raw.base_datos) : undefined,
      control_plane: cp,
      timestamp: asString(raw.timestamp) || undefined,
      httpStatus: 200,
    }
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 503 &&
      err.payload &&
      typeof err.payload === 'object' &&
      'estado' in err.payload
    ) {
      const payload = err.payload as Omit<RunnerReadyResponse, 'httpStatus'>
      return { ...payload, httpStatus: 503 }
    }
    throw err
  }
}

/**
 * GET /health/lock también puede devolver HTTP 503 con JSON estructurado
 * si la BD o Control.Bloqueo_Ejecucion no está accesible.
 */
export async function fetchLockStatus(): Promise<LockStatusResponse> {
  try {
    const raw = asRecord(await apiRequest<unknown>('/health/lock'))
    return {
      servicio: asString(raw.servicio) || undefined,
      version: asString(raw.version) || undefined,
      entorno: asString(raw.entorno) || undefined,
      estado: asString(raw.estado, 'desconocido'),
      base_datos: raw.base_datos ? normalizeBaseDatos(raw.base_datos) : undefined,
      lock: raw.lock && typeof raw.lock === 'object' ? (raw.lock as LockDetalle) : null,
      timestamp: asString(raw.timestamp) || undefined,
      httpStatus: 200,
    }
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 503 &&
      err.payload &&
      typeof err.payload === 'object' &&
      'estado' in err.payload
    ) {
      const payload = err.payload as Omit<LockStatusResponse, 'httpStatus'>
      return { ...payload, httpStatus: 503 }
    }
    throw err
  }
}

export async function fetchCuarentenaResumen(): Promise<CuarentenaResumen> {
  const raw = asRecord(await apiRequest<unknown>('/api/v1/cuarentena/resumen'))
  return {
    total: asFiniteNumber(raw.total, 0),
    pendientes: asFiniteNumber(raw.pendientes, 0),
    resueltos: asFiniteNumber(raw.resueltos, 0),
    descartados: asFiniteNumber(raw.descartados, 0),
  }
}

export async function fetchEtlFallosRecientes(horas = 24): Promise<EtlFallosRecientes> {
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

export async function fetchEtlResumen(): Promise<EtlResumen> {
  const raw = asRecord(await apiRequest<unknown>('/api/v1/etl/resumen'))
  return {
    corridas_activas: asFiniteNumber(raw.corridas_activas, 0),
    comandos_pendientes: asFiniteNumber(raw.comandos_pendientes, 0),
    comandos_procesando: asFiniteNumber(raw.comandos_procesando, 0),
  }
}

export async function fetchAuditoriaResumenBitacora(ventanaDias = 7): Promise<AuditoriaResumenBitacora> {
  const raw = asRecord(
    await apiRequest<unknown>('/api/v1/auditoria/bitacora/resumen', {
      query: { ventana_dias: ventanaDias },
    }),
  )
  return {
    ventana_dias: asFiniteNumber(raw.ventana_dias, ventanaDias),
    total: asFiniteNumber(raw.total, 0),
    ok: asFiniteNumber(raw.ok, 0),
    errores: asFiniteNumber(raw.errores, 0),
    en_proceso: asFiniteNumber(raw.en_proceso, 0),
    filas_ok: asFiniteNumber(raw.filas_ok, 0),
    filas_rechazadas: asFiniteNumber(raw.filas_rechazadas, 0),
    tasa_exito_pct: asFiniteNumber(raw.tasa_exito_pct, 0),
  }
}

export async function fetchAlertasAcks(): Promise<AlertaAck[]> {
  return asArray<AlertaAck>(await apiRequest<unknown>('/api/v1/alertas/acks'))
}

export function ackAlerta(idAlerta: string, comentario?: string | null): Promise<RespuestaAccionAck> {
  return apiRequest<RespuestaAccionAck>(`/api/v1/alertas/${encodeURIComponent(idAlerta)}/ack`, {
    method: 'POST',
    body: { comentario: comentario?.trim() ? comentario.trim() : null },
  })
}

export function unackAlerta(idAlerta: string): Promise<RespuestaAccionAck> {
  return apiRequest<RespuestaAccionAck>(`/api/v1/alertas/${encodeURIComponent(idAlerta)}/ack`, {
    method: 'DELETE',
  })
}
