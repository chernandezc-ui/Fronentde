export type AuditoriaTabId = 'bitacora' | 'ingesta'

export type EstadoBitacora = 'OK' | 'ERROR' | 'EN_PROCESO' | 'SKIPPED' | 'TIMEOUT'

export type VentanaResumenDias = 1 | 7 | 30 | 90

export interface LogCargaItem {
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

export interface RespuestaBitacoraPagina {
  items: LogCargaItem[]
  total: number
  pagina: number
  tamano: number
}

export interface RespuestaResumenBitacora {
  ventana_dias: number
  total: number
  ok: number
  errores: number
  en_proceso: number
  filas_ok: number
  filas_rechazadas: number
  tasa_exito_pct: number
}

export interface BitacoraFiltrosUrl {
  pagina: number
  tamano: number
  estados: EstadoBitacora[]
  tabla_destino: string
  desde: string
  hasta: string
  id_corrida: string
  ventana_dias: VentanaResumenDias
}

export interface BitacoraQueryParams {
  pagina?: number
  tamano?: number
  estados?: readonly string[]
  tabla_destino?: string
  desde?: string
  hasta?: string
  id_corrida?: string
}

export interface FilaValidacionValida {
  fila_id: number
  datos: Record<string, unknown>
}

export interface FilaValidacionConErrores {
  fila_id: number
  datos: Record<string, unknown>
  errores: string[]
}

export interface RespuestaValidacionCsv {
  valido: boolean
  total_filas: number
  columnas: string[]
  filas_validas: FilaValidacionValida[]
  filas_con_errores: FilaValidacionConErrores[]
}

export interface EtlFactCatalogItem {
  nombre_fact: string
  orden: number
  tabla_destino: string
  fuentes_bronce: string[]
  dependencias: string[]
  marts: string[]
  releer_bronce_por_estado: boolean
  estrategia_rerun: string
}

export type CapaTablaCatalogo = 'Silver' | 'Bronce' | 'Gold'

export interface TablaCatalogoOption {
  nombre: string
  capa: CapaTablaCatalogo
  factRelacionada: string
}

export interface CsvDownloadResult {
  filename: string
  sizeBytes: number
  tabla: string
}
