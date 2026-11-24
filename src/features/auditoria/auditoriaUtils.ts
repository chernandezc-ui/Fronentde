import { API_ENDPOINTS } from '@/shared/api/endpoints'
import type {
  AccesosQueryParams,
  AuditoriaTabId,
  BitacoraFiltrosUrl,
  BitacoraQueryParams,
  EtlFactCatalogItem,
  EstadoBitacora,
  TablaCatalogoOption,
  VentanaResumenDias,
} from './types'

export const ESTADOS_BITACORA: readonly EstadoBitacora[] = [
  'OK',
  'ERROR',
  'EN_PROCESO',
  'SKIPPED',
  'TIMEOUT',
] as const

export const ESTADO_BITACORA_META: Record<
  EstadoBitacora,
  { label: string; shortLabel: string; dotClass: string }
> = {
  OK: { label: 'OK', shortLabel: 'OK', dotClass: 'bg-emerald-500' },
  ERROR: { label: 'ERROR', shortLabel: 'Error', dotClass: 'bg-rose-500' },
  EN_PROCESO: { label: 'EN_PROCESO', shortLabel: 'En proceso', dotClass: 'bg-sky-500' },
  SKIPPED: { label: 'SKIPPED', shortLabel: 'Omitido', dotClass: 'bg-muted-foreground/70' },
  TIMEOUT: { label: 'TIMEOUT', shortLabel: 'Timeout', dotClass: 'bg-orange-500' },
}

export const BITACORA_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const
export type BitacoraPageSize = (typeof BITACORA_PAGE_SIZE_OPTIONS)[number]

export const BITACORA_MAX_PAGE_SIZE = 200
export const BITACORA_DEFAULT_PAGE_SIZE = 50
export const BITACORA_MAX_TABLA_LENGTH = 120
export const BITACORA_MAX_CORRIDA_LENGTH = 36

export const VENTANA_RESUMEN_OPTIONS: readonly {
  value: VentanaResumenDias
  label: string
  shortLabel: string
}[] = [
  { value: 1, label: 'Hoy (24h)', shortLabel: '24h' },
  { value: 7, label: '7 días', shortLabel: '7d' },
  { value: 30, label: '30 días', shortLabel: '30d' },
  { value: 90, label: '90 días', shortLabel: '90d' },
] as const

export const DEFAULT_BITACORA_FILTERS: BitacoraFiltrosUrl = {
  pagina: 1,
  tamano: BITACORA_DEFAULT_PAGE_SIZE,
  estados: [],
  tabla_destino: '',
  desde: '',
  hasta: '',
  id_corrida: '',
  ventana_dias: 7,
}

/** Expresión regular estricta del backend para nombres de tabla exportables */
export const TABLA_NOMBRE_REGEX = /^[a-zA-Z0-9_.]+$/

/** Límite razonable en frontend para el pre-validador CSV en memoria (25 MB) */
export const MAX_CSV_FILE_BYTES = 25 * 1024 * 1024

/** Límite para archivos Excel .xlsx hacia cargador Bronce (50 MB) */
export const MAX_EXCEL_FILE_BYTES = 50 * 1024 * 1024

/** 23 carpetas canónicas reales de `ETL/bronce/rutas.py` */
export const EXCEL_UPLOAD_FOLDERS: readonly { carpeta: string; tabla: string }[] = [
  { carpeta: 'conteo_fruta', tabla: 'Bronce.Conteo_Fruta' },
  { carpeta: 'peladas', tabla: 'Bronce.Peladas' },
  { carpeta: 'ciclos_fenologicos', tabla: 'Bronce.Ciclos_Fenologicos' },
  { carpeta: 'evaluacion_pesos', tabla: 'Bronce.Evaluacion_Pesos' },
  { carpeta: 'induccion_floral', tabla: 'Bronce.Induccion_Floral' },
  { carpeta: 'floracion', tabla: 'Bronce.Floracion' },
  { carpeta: 'evaluacion_vegetativa', tabla: 'Bronce.Evaluacion_Vegetativa' },
  { carpeta: 'tasa_crecimiento_brotes', tabla: 'Bronce.Tasa_Crecimiento_Brotes' },
  { carpeta: 'evaluacion_calidad_poda', tabla: 'Bronce.Evaluacion_Calidad_Poda' },
  { carpeta: 'fisiologia', tabla: 'Bronce.Fisiologia' },
  { carpeta: 'calibres', tabla: 'Bronce.Calibres' },
  { carpeta: 'tareos', tabla: 'Bronce.Consolidado_Tareos' },
  { carpeta: 'fiscalizacion', tabla: 'Bronce.Fiscalizacion' },
  { carpeta: 'seguimiento_errores', tabla: 'Bronce.Seguimiento_Errores' },
  { carpeta: 'pintado_flores', tabla: 'Bronce.Pintado_Flores' },
  { carpeta: 'reporte_cosecha', tabla: 'Bronce.Reporte_Cosecha' },
  { carpeta: 'cierre_mapas_cosecha', tabla: 'Bronce.Cierre_Mapas_Cosecha' },
  { carpeta: 'reporte_clima', tabla: 'Bronce.Reporte_Clima' },
  { carpeta: 'data_sap', tabla: 'Bronce.Data_SAP' },
  { carpeta: 'proyeccion_pesos', tabla: 'Bronce.Proyeccion_Pesos' },
  { carpeta: 'telemetria_clima', tabla: 'Bronce.Telemetria_Clima' },
  { carpeta: 'base_plantas_area', tabla: 'Bronce.Base_Plantas_Area' },
  { carpeta: 'censo_plantas', tabla: 'Bronce.Censo_Plantas' },
] as const

const ESTADOS_SET = new Set<string>(ESTADOS_BITACORA)
const VENTANAS_SET = new Set<number>([1, 7, 30, 90])

export function clampBitacoraPagina(pagina: number | undefined): number {
  if (pagina === undefined || !Number.isFinite(pagina)) return 1
  return Math.max(1, Math.floor(pagina))
}

export function clampBitacoraTamano(tamano: number | undefined): number {
  if (tamano === undefined || !Number.isFinite(tamano)) {
    return BITACORA_DEFAULT_PAGE_SIZE
  }
  const rounded = Math.floor(tamano)
  if (rounded < 1) return 1
  if (rounded > BITACORA_MAX_PAGE_SIZE) return BITACORA_MAX_PAGE_SIZE
  return rounded
}

export function normalizeEstadosBitacora(
  estados: readonly string[] | undefined,
): EstadoBitacora[] {
  if (!estados || estados.length === 0) return []
  const seen = new Set<EstadoBitacora>()
  const result: EstadoBitacora[] = []
  for (const raw of estados) {
    const upper = raw.trim().toUpperCase()
    if (ESTADOS_SET.has(upper)) {
      const typed = upper as EstadoBitacora
      if (!seen.has(typed)) {
        seen.add(typed)
        result.push(typed)
      }
    }
  }
  return result
}

export function normalizeVentanaDias(
  raw: string | number | null | undefined,
): VentanaResumenDias {
  const num = typeof raw === 'number' ? raw : raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(num) && VENTANAS_SET.has(num)) {
    return num as VentanaResumenDias
  }
  return DEFAULT_BITACORA_FILTERS.ventana_dias
}

/**
 * Convierte un valor de `<input type="datetime-local">` (ej. `2026-11-22T08:30`)
 * o una cadena ISO 8601 a una cadena ISO 8601 válida para FastAPI (`datetime`).
 * Retorna `null` si el valor está vacío o es inválido.
 */
export function toIsoDateTimeParam(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

/**
 * Convierte una cadena ISO 8601 (o `YYYY-MM-DDTHH:mm`) al formato esperado por
 * `<input type="datetime-local">` en hora local (`YYYY-MM-DDTHH:mm`).
 */
export function toDateTimeLocalInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  // Si ya viene como datetime-local sin zona horaria, se respeta tal cual
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.slice(0, 16)
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  const year = parsed.getFullYear()
  const month = pad(parsed.getMonth() + 1)
  const day = pad(parsed.getDate())
  const hours = pad(parsed.getHours())
  const minutes = pad(parsed.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Construye la querystring server-side para `GET /api/v1/auditoria/bitacora`
 * usando `URLSearchParams.append('estado', e)` para soportar multi-estado,
 * clamping de `tamano` en [1..200] y fechas ISO 8601 limpias.
 */
export function buildBitacoraQueryString(params: BitacoraQueryParams): string {
  const qs = new URLSearchParams()

  const pagina = clampBitacoraPagina(params.pagina)
  const tamano = clampBitacoraTamano(params.tamano)
  qs.set('pagina', String(pagina))
  qs.set('tamano', String(tamano))

  const estados = normalizeEstadosBitacora(params.estados)
  for (const estado of estados) {
    qs.append('estado', estado)
  }

  const tabla = params.tabla_destino?.trim().slice(0, BITACORA_MAX_TABLA_LENGTH)
  if (tabla) {
    qs.set('tabla_destino', tabla)
  }

  const desdeIso = toIsoDateTimeParam(params.desde)
  if (desdeIso) {
    qs.set('desde', desdeIso)
  }

  const hastaIso = toIsoDateTimeParam(params.hasta)
  if (hastaIso) {
    qs.set('hasta', hastaIso)
  }

  const idCorrida = params.id_corrida?.trim().slice(0, BITACORA_MAX_CORRIDA_LENGTH)
  if (idCorrida) {
    qs.set('id_corrida', idCorrida)
  }

  return qs.toString()
}

export function buildBitacoraPath(params: BitacoraQueryParams): string {
  const qs = buildBitacoraQueryString(params)
  return `/api/v1/auditoria/bitacora?${qs}`
}

export function parseAuditoriaTab(searchParams: URLSearchParams): AuditoriaTabId {
  const raw = searchParams.get('tab')
  if (raw === 'ingesta') return 'ingesta'
  if (raw === 'accesos') return 'accesos'
  return 'bitacora'
}

export function parseBitacoraSearchParams(searchParams: URLSearchParams): BitacoraFiltrosUrl {
  const rawPagina = searchParams.get('pagina')
  const parsedPagina = rawPagina ? Number.parseInt(rawPagina, 10) : NaN
  const pagina =
    Number.isFinite(parsedPagina) && parsedPagina >= 1
      ? parsedPagina
      : DEFAULT_BITACORA_FILTERS.pagina

  const rawTamano = searchParams.get('tamano')
  const parsedTamano = rawTamano ? Number.parseInt(rawTamano, 10) : NaN
  const tamano =
    Number.isFinite(parsedTamano) &&
    (BITACORA_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsedTamano)
      ? parsedTamano
      : DEFAULT_BITACORA_FILTERS.tamano

  const estados = normalizeEstadosBitacora(searchParams.getAll('estado'))
  const tabla_destino = (searchParams.get('tabla_destino') ?? '')
    .trim()
    .slice(0, BITACORA_MAX_TABLA_LENGTH)
  const id_corrida = (searchParams.get('id_corrida') ?? '')
    .trim()
    .slice(0, BITACORA_MAX_CORRIDA_LENGTH)

  const desdeRaw = searchParams.get('desde')
  const hastaRaw = searchParams.get('hasta')
  const desde = toIsoDateTimeParam(desdeRaw) ? (desdeRaw ?? '').trim() : ''
  const hasta = toIsoDateTimeParam(hastaRaw) ? (hastaRaw ?? '').trim() : ''

  const ventana_dias = normalizeVentanaDias(searchParams.get('ventana'))

  return {
    pagina,
    tamano,
    estados,
    tabla_destino,
    desde,
    hasta,
    id_corrida,
    ventana_dias,
  }
}

export function serializeAuditoriaSearchParams(
  tab: AuditoriaTabId,
  filters: BitacoraFiltrosUrl,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('tab', tab)

  if (filters.ventana_dias !== DEFAULT_BITACORA_FILTERS.ventana_dias) {
    params.set('ventana', String(filters.ventana_dias))
  }

  const safePagina = clampBitacoraPagina(filters.pagina)
  if (safePagina > 1) {
    params.set('pagina', String(safePagina))
  }

  const safeTamano = (BITACORA_PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.tamano)
    ? filters.tamano
    : DEFAULT_BITACORA_FILTERS.tamano
  if (safeTamano !== DEFAULT_BITACORA_FILTERS.tamano) {
    params.set('tamano', String(safeTamano))
  }

  for (const estado of normalizeEstadosBitacora(filters.estados)) {
    params.append('estado', estado)
  }

  const safeTabla = filters.tabla_destino.trim().slice(0, BITACORA_MAX_TABLA_LENGTH)
  if (safeTabla) {
    params.set('tabla_destino', safeTabla)
  }

  const safeDesde = toIsoDateTimeParam(filters.desde)
  if (safeDesde) {
    params.set('desde', safeDesde)
  }

  const safeHasta = toIsoDateTimeParam(filters.hasta)
  if (safeHasta) {
    params.set('hasta', safeHasta)
  }

  const safeCorrida = filters.id_corrida.trim().slice(0, BITACORA_MAX_CORRIDA_LENGTH)
  if (safeCorrida) {
    params.set('id_corrida', safeCorrida)
  }

  return params
}

export function isDateRangeInverted(desde: string, hasta: string): boolean {
  const desdeIso = toIsoDateTimeParam(desde)
  const hastaIso = toIsoDateTimeParam(hasta)
  if (!desdeIso || !hastaIso) return false
  return new Date(desdeIso).getTime() > new Date(hastaIso).getTime()
}

export function hasActiveBitacoraFilters(filters: BitacoraFiltrosUrl): boolean {
  return (
    filters.estados.length > 0 ||
    filters.tabla_destino.trim().length > 0 ||
    filters.desde.trim().length > 0 ||
    filters.hasta.trim().length > 0 ||
    filters.id_corrida.trim().length > 0
  )
}

/**
 * Valida que el nombre de tabla cumpla con el patrón estricto del backend
 * (`^[a-zA-Z0-9_.]+$`) y no contenga secuencias de escape o espacios.
 */
export function isValidTableName(tabla: string): boolean {
  const trimmed = tabla.trim()
  if (trimmed.length === 0 || trimmed.length > BITACORA_MAX_TABLA_LENGTH) {
    return false
  }
  return TABLA_NOMBRE_REGEX.test(trimmed)
}

export interface CsvFileValidationResult {
  valid: boolean
  error: string | null
}

/**
 * Valida en cliente extensión `.csv` y tamaño razonable antes de enviar al backend.
 */
export function validateCsvFile(
  file: Pick<File, 'name' | 'size'> | null | undefined,
  maxBytes: number = MAX_CSV_FILE_BYTES,
): CsvFileValidationResult {
  if (!file) {
    return { valid: false, error: 'Selecciona un archivo .csv para validar.' }
  }
  const name = file.name.trim()
  if (!name.toLowerCase().endsWith('.csv')) {
    return {
      valid: false,
      error: 'Solo se permiten archivos con extensión .csv (no .xlsx ni .xls).',
    }
  }
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'El archivo .csv está vacío (0 bytes).',
    }
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10
    return {
      valid: false,
      error: `El archivo excede el límite permitido de ${maxMb} MB para validación en memoria.`,
    }
  }
  return { valid: true, error: null }
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Extrae el nombre de archivo de una cabecera HTTP `Content-Disposition`,
 * soportando `filename=`, `filename="..."` y `filename*=UTF-8''...`.
 */
export function parseContentDispositionFilename(
  header: string | null | undefined,
  fallback: string,
): string {
  if (!header) return fallback

  const utf8Match = header.match(/filename\*\s*=\s*UTF-8''([^;\n]+)/i)
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim()).replace(/["\\/]/g, '')
      if (decoded) return decoded
    } catch {
      // Fallback al match estándar
    }
  }

  const standardMatch = header.match(/filename\s*=\s*(?:"([^"]+)"|([^;\n]+))/i)
  const rawName = (standardMatch?.[1] ?? standardMatch?.[2] ?? '').trim().replace(/["\\/]/g, '')
  return rawName || fallback
}

/**
 * Extrae todas las tablas autorizadas del catálogo ETL (`GET /api/v1/etl/facts`),
 * replicando la whitelist real del backend (`tabla_destino`, `fuentes_bronce`, `marts`).
 */
export function extractCatalogTables(facts: readonly EtlFactCatalogItem[]): TablaCatalogoOption[] {
  const seen = new Set<string>()
  const result: TablaCatalogoOption[] = []

  const add = (rawName: string, capa: TablaCatalogoOption['capa'], factName: string) => {
    const clean = rawName.trim()
    if (!clean) return
    const key = clean.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push({ nombre: clean, capa, factRelacionada: factName })
  }

  for (const fact of facts) {
    add(fact.tabla_destino, 'Silver', fact.nombre_fact)
  }
  for (const fact of facts) {
    for (const bronce of fact.fuentes_bronce) {
      add(bronce, 'Bronce', fact.nombre_fact)
    }
  }
  for (const fact of facts) {
    for (const mart of fact.marts) {
      add(mart, 'Gold', fact.nombre_fact)
    }
  }

  return result
}

export function buildExportCsvPath(tabla: string): string {
  return `/api/v1/ingesta/descargar/${encodeURIComponent(tabla.trim())}`
}

/**
 * Valida archivos `.xlsx` antes de enviarlos a `ETL/data/entrada/{carpeta}`.
 * Bloquea archivos temporales `~$*`, extensiones distintas de `.xlsx` y archivos > 50 MB.
 */
export function validateExcelFile(
  file: Pick<File, 'name' | 'size'> | null | undefined,
  maxBytes: number = MAX_EXCEL_FILE_BYTES,
): CsvFileValidationResult {
  if (!file) {
    return { valid: false, error: 'Selecciona un archivo .xlsx para subir.' }
  }
  const name = file.name.trim()
  const lower = name.toLowerCase()
  if (!name) {
    return { valid: false, error: 'El archivo no tiene un nombre válido.' }
  }
  if (name.startsWith('~$')) {
    return {
      valid: false,
      error: 'No se permiten archivos temporales de Excel (~$*). Cierra el libro en Excel y vuelve a intentar.',
    }
  }
  if (!lower.endsWith('.xlsx')) {
    return {
      valid: false,
      error: 'Solo se permiten libros Excel con extensión .xlsx (ej. cosecha_sap.xlsx).',
    }
  }
  const baseName = lower.slice(0, -5)
  if (baseName.endsWith('.exe') || baseName.endsWith('.bat') || baseName.endsWith('.cmd')) {
    return {
      valid: false,
      error: 'Nombre de archivo no permitido por seguridad.',
    }
  }
  if (file.size <= 0) {
    return { valid: false, error: 'El archivo Excel está vacío (0 bytes).' }
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10
    return {
      valid: false,
      error: `El archivo excede el límite máximo de ${maxMb} MB.`,
    }
  }
  return { valid: true, error: null }
}

export const ACCESOS_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

export const ACCESOS_ACCIONES_PRESETS = [
  'LOGIN_OK',
  'LOGIN_FALLIDO',
  'LOGOUT',
  'CAMBIO_CONFIG',
  'CORRIDA_ETL',
  'CUARENTENA',
] as const

export function buildAccesosQueryString(params: AccesosQueryParams): string {
  const qs = new URLSearchParams()
  const pagina = clampBitacoraPagina(params.pagina)
  const tamano = clampBitacoraTamano(params.tamano)
  qs.set('pagina', String(pagina))
  qs.set('tamano', String(tamano))

  const usuario = params.usuario?.trim().slice(0, 100)
  if (usuario) {
    qs.set('usuario', usuario)
  }

  const accion = params.accion?.trim().slice(0, 80)
  if (accion) {
    qs.set('accion', accion)
  }

  const desdeIso = toIsoDateTimeParam(params.desde)
  if (desdeIso) {
    qs.set('desde', desdeIso)
  }

  const hastaIso = toIsoDateTimeParam(params.hasta)
  if (hastaIso) {
    qs.set('hasta', hastaIso)
  }

  return qs.toString()
}

export function buildAccesosPath(params: AccesosQueryParams): string {
  const qs = buildAccesosQueryString(params)
  return `${API_ENDPOINTS.auditoria.accesos}?${qs}`
}
