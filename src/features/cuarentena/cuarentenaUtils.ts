import { z } from 'zod'
import { mapEstadoToTone, type OperationalTone } from '@/shared/components/StatusBadge'
import type {
  CuarentenaFiltrosUrl,
  EstadoCuarentenaFiltro,
  PeticionRechazarCuarentena,
  PeticionResolverCuarentena,
} from './types'

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
export type CuarentenaPageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export const ESTADO_FILTRO_OPTIONS: readonly {
  value: EstadoCuarentenaFiltro
  label: string
}[] = [
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'RESUELTO', label: 'Resueltos' },
  { value: 'DESCARTADO', label: 'Descartados' },
  { value: 'all', label: 'Todos' },
] as const

export const DEFAULT_CUARENTENA_FILTERS: CuarentenaFiltrosUrl = {
  pagina: 1,
  tamano: 20,
  estado: 'PENDIENTE',
  tabla: '',
}

export const BRONZE_TABLE_SUGGESTIONS: readonly string[] = [
  'Bronce.Peladas',
  'Bronce.Consolidado_Tareos',
  'Bronce.Reporte_Cosecha',
  'Bronce.Data_SAP',
  'Bronce.Conteo_Fruta',
  'Bronce.Evaluacion_Pesos',
  'Bronce.Evaluacion_Vegetativa',
  'Bronce.Tasa_Crecimiento_Brotes',
  'Bronce.Induccion_Floral',
  'Bronce.Fisiologia',
  'Bronce.Reporte_Clima',
  'Bronce.Telemetria_Clima',
  'Bronce.Floracion',
  'Bronce.Censo_Plantas',
  'Bronce.Base_Plantas_Area',
  'Bronce.Evaluacion_Calidad_Poda',
  'Bronce.Ciclos_Fenologicos',
  'Bronce.Seguimiento_Errores',
] as const

export const DISCARD_REASON_PRESETS: readonly string[] = [
  'Registro duplicado en origen',
  'Dato de prueba o carga inválida',
  'Fuera de vigencia / campaña cerrada',
  'Error de formato irrecuperable en archivo fuente',
] as const

export const resolverCuarentenaSchema = z.object({
  valor_canonico: z
    .string()
    .trim()
    .min(1, 'Ingresa un valor canónico válido (mínimo 1 carácter).')
    .max(200, 'El valor canónico no puede superar los 200 caracteres.'),
  comentario: z
    .string()
    .trim()
    .max(500, 'El comentario no puede superar los 500 caracteres.'),
})

export type ResolverCuarentenaFormValues = z.infer<typeof resolverCuarentenaSchema>

export const rechazarCuarentenaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, 'Debes indicar el motivo del descarte.')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})

export type RechazarCuarentenaFormValues = z.infer<typeof rechazarCuarentenaSchema>

export function toResolverPayload(
  values: ResolverCuarentenaFormValues,
): PeticionResolverCuarentena {
  const valorCanonico = values.valor_canonico.trim()
  const comentario = values.comentario.trim()
  return {
    valor_canonico: valorCanonico,
    comentario: comentario.length > 0 ? comentario : null,
  }
}

export function toRechazarPayload(
  values: RechazarCuarentenaFormValues,
): PeticionRechazarCuarentena {
  return {
    motivo: values.motivo.trim(),
  }
}

/**
 * Construye la ruta segura para resolver un registro en cuarentena,
 * codificando ambos segmentos de path con encodeURIComponent.
 */
export function buildResolverPath(tablaOrigen: string, idRegistro: string): string {
  return `/api/v1/cuarentena/${encodeURIComponent(tablaOrigen)}/${encodeURIComponent(idRegistro)}/resolver`
}

/**
 * Construye la ruta segura para rechazar/descartar un registro en cuarentena,
 * codificando ambos segmentos de path con encodeURIComponent.
 */
export function buildRechazarPath(tablaOrigen: string, idRegistro: string): string {
  return `/api/v1/cuarentena/${encodeURIComponent(tablaOrigen)}/${encodeURIComponent(idRegistro)}/rechazar`
}

export function normalizeEstadoFiltro(raw: string | null | undefined): EstadoCuarentenaFiltro {
  if (!raw) return DEFAULT_CUARENTENA_FILTERS.estado
  const trimmed = raw.trim()
  if (trimmed.toLowerCase() === 'all') return 'all'
  const upper = trimmed.toUpperCase()
  if (upper === 'PENDIENTE' || upper === 'RESUELTO' || upper === 'DESCARTADO') {
    return upper
  }
  return DEFAULT_CUARENTENA_FILTERS.estado
}

export function parseCuarentenaSearchParams(searchParams: URLSearchParams): CuarentenaFiltrosUrl {
  const rawPagina = searchParams.get('pagina')
  const parsedPagina = rawPagina ? Number.parseInt(rawPagina, 10) : NaN
  const pagina =
    Number.isFinite(parsedPagina) && parsedPagina >= 1
      ? parsedPagina
      : DEFAULT_CUARENTENA_FILTERS.pagina

  const rawTamano = searchParams.get('tamano')
  const parsedTamano = rawTamano ? Number.parseInt(rawTamano, 10) : NaN
  const tamano =
    Number.isFinite(parsedTamano) &&
    (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsedTamano)
      ? parsedTamano
      : DEFAULT_CUARENTENA_FILTERS.tamano

  const estado = normalizeEstadoFiltro(searchParams.get('estado'))
  const tabla = (searchParams.get('tabla') ?? '').trim()

  return { pagina, tamano, estado, tabla }
}

export function serializeCuarentenaSearchParams(filters: CuarentenaFiltrosUrl): URLSearchParams {
  const params = new URLSearchParams()
  const safePagina = Number.isFinite(filters.pagina) && filters.pagina >= 1 ? Math.floor(filters.pagina) : 1
  const safeTamano = (PAGE_SIZE_OPTIONS as readonly number[]).includes(filters.tamano)
    ? filters.tamano
    : DEFAULT_CUARENTENA_FILTERS.tamano
  const safeEstado = normalizeEstadoFiltro(filters.estado)
  const safeTabla = filters.tabla.trim()

  params.set('estado', safeEstado)
  if (safePagina > 1) {
    params.set('pagina', String(safePagina))
  }
  if (safeTamano !== DEFAULT_CUARENTENA_FILTERS.tamano) {
    params.set('tamano', String(safeTamano))
  }
  if (safeTabla.length > 0) {
    params.set('tabla', safeTabla)
  }

  return params
}

export function mapCuarentenaEstadoTone(estado: string | null | undefined): OperationalTone {
  const norm = (estado ?? '').toUpperCase().trim()
  if (norm === 'REINYECTADO') return 'readonly'
  return mapEstadoToTone(estado)
}

export function isRecordPending(estado: string | null | undefined): boolean {
  return (estado ?? '').toUpperCase().trim() === 'PENDIENTE'
}
