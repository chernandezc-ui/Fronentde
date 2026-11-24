export type ModoEjecucionEtl = 'completo' | 'facts'

export interface FactDisponible {
  nombre_fact: string
  orden: number
  tabla_destino: string
  fuentes_bronce: string[]
  dependencias: string[]
  marts: string[]
  releer_bronce_por_estado: boolean
  estrategia_rerun: string
}

export interface EtlResumen {
  corridas_activas: number
  comandos_pendientes: number
  comandos_procesando: number
}

export interface FallosRecientes {
  fallos: number
  ultimo_fallo_fecha: string | null
  ultimo_fallo_tabla: string | null
}

export interface HistorialCorrida {
  id_log: number
  nombre_proceso: string
  tabla_destino: string
  nombre_archivo: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: string
  filas_insertadas: number
  filas_rechazadas: number
  duracion_segundos: number | null
  mensaje_error: string | null
  id_corrida: string | null
}

export interface CorridaActiva {
  id_corrida: string
  iniciado_por: string
  estado: string
  intento_numero: number
  max_reintentos: number
  fecha_solicitud: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  heartbeat_ultimo: string | null
  mensaje_final: string | null
  modo_ejecucion: ModoEjecucionEtl | string | null
  facts: string[]
  incluir_dependencias: boolean
  refrescar_gold: boolean
  forzar_relectura_bronce: boolean
}

export interface PasoCorrida {
  id_paso: number
  id_corrida: string
  nombre_paso: string
  orden: number
  estado: string
  fecha_inicio: string | null
  fecha_fin: string | null
  mensaje_error: string | null
}

export interface DetalleCorrida {
  id_corrida: string
  iniciado_por: string
  comentario: string | null
  estado: string
  intento_numero: number
  max_reintentos: number
  fecha_solicitud: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  pid_runner: number | null
  heartbeat_ultimo: string | null
  timeout_segundos: number
  mensaje_final: string | null
  id_log_auditoria: number | null
  modo_ejecucion: ModoEjecucionEtl | string
  facts: string[]
  incluir_dependencias: boolean
  refrescar_gold: boolean
  forzar_relectura_bronce: boolean
  pasos: PasoCorrida[]
}

export interface PeticionIniciarCorrida {
  comentario: string | null
  modo_ejecucion: ModoEjecucionEtl
  facts: string[] | null
  incluir_dependencias: boolean
  refrescar_gold: boolean
  forzar_relectura_bronce: boolean
}

export interface CorridaIniciada {
  id_corrida: string
  id_log: number | null
  iniciado_por: string
  fecha_inicio: string
  url_stream: string
  estado: string
}

export interface RespuestaCancelarCorrida {
  mensaje: string
  cancelado: boolean
}

export interface TablePreviewRaw {
  columns?: string[]
  columnas?: string[]
  rows?: Record<string, unknown>[]
  filas?: Record<string, unknown>[]
  datos?: Record<string, unknown>[]
  total?: number
}

export interface TablePreviewNormalized {
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
}

export interface EtlStreamEvent {
  key: string
  eventId: string | null
  tipo: string
  mensaje: string
  receivedAt: string
}

const ACTIVE_RUN_STATES = new Set(['PENDIENTE', 'EJECUTANDO', 'EN_PROCESO', 'PROCESANDO', 'EN_COLA'])
const TERMINAL_RUN_STATES = new Set(['OK', 'ERROR', 'CANCELADO', 'TIMEOUT', 'FALLIDO', 'COMPLETADO'])

export function isRunActiveEstado(estado: string | null | undefined): boolean {
  if (!estado) return false
  return ACTIVE_RUN_STATES.has(estado.toUpperCase().trim())
}

export function isRunTerminalEstado(estado: string | null | undefined): boolean {
  if (!estado) return false
  return TERMINAL_RUN_STATES.has(estado.toUpperCase().trim())
}

export function computeElapsedSeconds(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): number | null {
  if (!startIso) return null
  const startMs = new Date(startIso).getTime()
  if (Number.isNaN(startMs)) return null
  const endMs = endIso ? new Date(endIso).getTime() : Date.now()
  if (Number.isNaN(endMs)) return null
  return Math.max(0, Math.round((endMs - startMs) / 1000))
}
