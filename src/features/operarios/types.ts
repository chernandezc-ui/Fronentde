import type { OperationalTone } from '@/shared/components/StatusBadge'

export interface OperarioPersonal {
  dni: string | null
  nombre_completo: string | null
  rol: string | null
  sexo: string | null
  id_planilla: string | null
  pct_asertividad: number | null
  dias_ausentismo: number | null
  es_activo?: boolean | null
}

export interface UpsertOperarioPayload {
  dni: string
  nombre_completo: string
  rol: string | null
  sexo: string | null
  id_planilla: string | null
  es_activo: boolean
}

export interface OperarioMutationResponse {
  ok?: boolean
  mensaje: string
}

export interface PaginatedPersonalResponse {
  total: number
  pagina: number
  tamano: number
  datos: OperarioPersonal[]
}

export interface CuarentenaIncidencia {
  tabla_origen: string
  id_registro: string
  columna_origen: string
  valor_raw: string
  nombre_archivo: string | null
  fecha_ingreso: string | null
  estado: string
  motivo: string | null
  valor_corregido: string | null
  id_registro_origen: number | null
}

export interface PaginatedCuarentenaResponse {
  total: number
  pagina: number
  tamano: number
  datos: CuarentenaIncidencia[]
}

export type AsertividadNivel = 'ok' | 'warning' | 'error' | 'sin_medicion'

export interface AsertividadClasificacion {
  nivel: AsertividadNivel
  tone: OperationalTone
  label: string
  formattedPct: string
  progressValue: number | null
  isAlert: boolean
}

export interface OperariosKpiSummary {
  totalPadron: number
  enPagina: number
  conMedicion: number
  sinMedicion: number
  promedioAsertividad: number | null
  bajo85: number
  diasAusentismoAcumulados: number
  conAusentismoRegistrado: number
}

export type IncidenciaMatchReason = 'dni' | 'planilla' | 'nombre'

export interface OperarioIncidenciaMatch {
  incidencia: CuarentenaIncidencia
  matchReason: IncidenciaMatchReason
  matchLabel: string
  isPersonalColumn: boolean
}
