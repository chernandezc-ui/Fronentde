import { ApiError, apiRequest } from '@/shared/api/client'

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

export function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health')
}

/**
 * GET /health/ready/runner puede devolver HTTP 503 con body JSON estructurado
 * cuando el runner está en estado `no_listo`, `control_plane_error` o `lock_vencido`.
 * Se parsea y devuelve como diagnóstico válido sin romper la UI.
 */
export async function fetchRunnerReady(): Promise<RunnerReadyResponse> {
  try {
    const data = await apiRequest<Omit<RunnerReadyResponse, 'httpStatus'>>('/health/ready/runner')
    return { ...data, httpStatus: 200 }
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
    const data = await apiRequest<Omit<LockStatusResponse, 'httpStatus'>>('/health/lock')
    return { ...data, httpStatus: 200 }
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

export function fetchCuarentenaResumen(): Promise<CuarentenaResumen> {
  return apiRequest<CuarentenaResumen>('/api/v1/cuarentena/resumen')
}

export function fetchEtlFallosRecientes(horas = 24): Promise<EtlFallosRecientes> {
  return apiRequest<EtlFallosRecientes>('/api/v1/etl/fallos-recientes', {
    query: { horas },
  })
}

export function fetchEtlResumen(): Promise<EtlResumen> {
  return apiRequest<EtlResumen>('/api/v1/etl/resumen')
}

export function fetchAuditoriaResumenBitacora(ventanaDias = 7): Promise<AuditoriaResumenBitacora> {
  return apiRequest<AuditoriaResumenBitacora>('/api/v1/auditoria/bitacora/resumen', {
    query: { ventana_dias: ventanaDias },
  })
}

export function fetchAlertasAcks(): Promise<AlertaAck[]> {
  return apiRequest<AlertaAck[]>('/api/v1/alertas/acks')
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
