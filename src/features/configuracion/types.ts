import type { RolUsuario } from '@/shared/auth/authStore'

export type ConfiguracionTab = 'parametros' | 'biologia' | 'reglas' | 'usuarios'

export type GrupoParametro = 'campana' | 'biologia' | 'calidad_etl' | 'general'

// ── 1. Parámetros del Pipeline ────────────────────────────────────────────────

export interface ParametroPipeline {
  nombre_parametro: string
  valor: string | null
  descripcion: string | null
  fecha_modificacion: string | null
}

export interface RespuestaPaginadaParametros {
  total: number
  pagina: number
  tamano: number
  datos: ParametroPipeline[]
}

export interface UpdateParametroResponse {
  mensaje: string
}

export interface BatchParametroItem {
  nombre_parametro: string
  valor: string
}

export interface UpdateParametrosBatchResponse {
  mensaje: string
  fallos: string[]
}

// ── 2. Reglas de Validación ───────────────────────────────────────────────────

export interface ReglaValidacion {
  id_regla?: number | string | null
  tabla_destino: string | null
  columna: string | null
  tipo_validacion: string | null
  valor_min: number | null
  valor_max: number | null
  accion: string | null
  activo: boolean
}

export interface UpsertReglaPayload {
  tabla_destino: string
  columna: string
  tipo_validacion: string
  valor_min: number | null
  valor_max: number | null
  accion: string
  activo: boolean
}

export interface KpisReglas {
  total: number
  activas: number
  inactivas: number
}

export interface RespuestaPaginadaReglas {
  total: number
  pagina: number
  tamano: number
  kpis: KpisReglas
  datos: ReglaValidacion[]
}

// ── 3. Matriz Biológica Six-Week ──────────────────────────────────────────────

export type EstadoBiologico =
  | 'cosechable'
  | 'maduras'
  | 'cremas'
  | 'fase_2'
  | 'fase_1'
  | 'verdes'
  | 'pequena'

export type SemanaSixWeek = 1 | 2 | 3 | 4 | 5 | 6
export type SemanaSixWeekKey = '1' | '2' | '3' | '4' | '5' | '6'

export type MatrizBiologicaRaw = Record<
  string,
  Record<string | number, number | null | undefined>
>

export type MatrizBiologicaCompleta = Record<
  EstadoBiologico,
  Record<SemanaSixWeekKey, number | null>
>

export type MatrizCerradaRow = [number, number, number, number, number, number]

export interface ValidacionEstadoMatriz {
  suma: number
  sumaCierre: number
  tieneNones: boolean
  errores: string[]
  advertencias: string[]
}

export type ReporteValidacionMatriz = Record<string, ValidacionEstadoMatriz>

export interface SaveMatrizResponse {
  ok: boolean
}

export interface BiologiaConstantes {
  plantas_por_punto: number
  decay_factor: Record<SemanaSixWeekKey, number>
  delta_productivas: Record<SemanaSixWeekKey, number>
  fecha_modificacion?: string | null
}

// ── 4. Administración de Usuarios (solo admin) ────────────────────────────────

export interface UsuarioAdmin {
  id_usuario: number
  nombre_usuario: string
  nombre_display: string
  email: string | null
  rol: RolUsuario | string
  es_activo: boolean
  fecha_creacion: string | null
  ultimo_acceso: string | null
}

export interface CreateUsuarioPayload {
  nombre_usuario: string
  nombre_display: string
  email: string | null
  clave: string
  rol: RolUsuario
}

export interface UpdateUsuarioPayload {
  nombre_display: string
  email: string | null
  rol: RolUsuario
}

export interface ResetClavePayload {
  nueva_clave: string
}

export interface ResetClaveResponse {
  mensaje: string
  clave_temporal?: string
  ok?: boolean
}

export interface UsuarioMensajeResponse {
  mensaje: string
  ok?: boolean
}
