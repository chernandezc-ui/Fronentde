import { z } from 'zod'
import type {
  CombinacionProyeccion,
  DetalleUnidadProyeccion,
  FilaSemanalProyeccion,
  FiltrosProyeccionUrl,
  KpisProyeccion,
  ProyeccionesTab,
  ResumenAgregadoDimension,
} from './types'

export const DEFAULT_MARGEN_PESIMISTA = 0.9906
export const DEFAULT_MARGEN_OPTIMISTA = 1.0107

export const VALID_PROYECCIONES_TABS: readonly ProyeccionesTab[] = [
  'resumen',
  'detalle',
  'supuestos',
] as const

export function parseProyeccionesTab(raw: string | null | undefined): ProyeccionesTab {
  if (raw === 'resumen' || raw === 'detalle' || raw === 'supuestos') {
    return raw
  }
  return 'resumen'
}

/** Valida que `idTiempo` sea una fecha real en formato YYYYMMDD (ej. rechaza 20260229). */
export function isValidIdTiempo(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return false
  const text = String(value)
  if (!/^\d{8}$/.test(text)) return false
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(4, 6))
  const day = Number(text.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Calcula semana ISO (1..53) y año ISO para un `id_tiempo` YYYYMMDD válido. */
export function getIsoWeekFromIdTiempo(idTiempo: number): { anioIso: number; semanaIso: number } | null {
  if (!isValidIdTiempo(idTiempo)) return null
  const text = String(idTiempo)
  const year = Number(text.slice(0, 4))
  const month = Number(text.slice(4, 6))
  const day = Number(text.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const semanaIso = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { anioIso: date.getUTCFullYear(), semanaIso }
}

/** Formatea `20261123` -> `"23/11/2026"` (con opción de incluir semana ISO). */
export function formatIdTiempo(idTiempo: number | null | undefined, includeWeek = false): string {
  if (idTiempo === null || idTiempo === undefined || !isValidIdTiempo(idTiempo)) return '—'
  const text = String(idTiempo)
  const formatted = `${text.slice(6, 8)}/${text.slice(4, 6)}/${text.slice(0, 4)}`
  if (!includeWeek) return formatted
  const iso = getIsoWeekFromIdTiempo(idTiempo)
  return iso ? `${formatted} · Sem ${String(iso.semanaIso).padStart(2, '0')} (${iso.anioIso})` : formatted
}

export function formatKg(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatTons(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kg / 1000)
}

export const margenesEscenarioSchema = z
  .object({
    margen_pesimista: z
      .number({ message: 'Ingresa un número finito para el margen pesimista.' })
      .finite('El margen pesimista debe ser finito.')
      .min(0, 'El margen pesimista no puede ser negativo.')
      .max(5, 'El margen pesimista no puede superar 5.0.'),
    margen_optimista: z
      .number({ message: 'Ingresa un número finito para el margen optimista.' })
      .finite('El margen optimista debe ser finito.')
      .min(0, 'El margen optimista no puede ser negativo.')
      .max(5, 'El margen optimista no puede superar 5.0.'),
  })
  .refine((data) => data.margen_pesimista <= data.margen_optimista, {
    message: 'El margen pesimista no puede superar al margen optimista.',
    path: ['margen_pesimista'],
  })

export function parseProyeccionesSearchParams(params: URLSearchParams): FiltrosProyeccionUrl {
  const fechaRaw = params.get('fecha')
  const fechaNum = fechaRaw && /^\d{8}$/.test(fechaRaw.trim()) ? Number(fechaRaw.trim()) : null
  const fecha = fechaNum !== null && isValidIdTiempo(fechaNum) ? fechaNum : null

  return {
    fecha,
    fundo: (params.get('fundo') ?? '').trim().slice(0, 120),
    modulo: (params.get('modulo') ?? '').trim().slice(0, 40),
    variedad: (params.get('variedad') ?? '').trim().slice(0, 120),
    condicion: (params.get('condicion') ?? '').trim().slice(0, 120),
    tab: parseProyeccionesTab(params.get('tab')),
  }
}

export function serializeProyeccionesSearchParams(filters: FiltrosProyeccionUrl): URLSearchParams {
  const next = new URLSearchParams()
  if (filters.fecha !== null && isValidIdTiempo(filters.fecha)) {
    next.set('fecha', String(filters.fecha))
  }
  if (filters.fundo.trim()) next.set('fundo', filters.fundo.trim())
  if (filters.modulo.trim()) next.set('modulo', filters.modulo.trim())
  if (filters.variedad.trim()) next.set('variedad', filters.variedad.trim())
  if (filters.condicion.trim()) next.set('condicion', filters.condicion.trim())
  if (filters.tab !== 'resumen') next.set('tab', filters.tab)
  return next
}

/**
 * Extrae opciones jerárquicas disponibles a partir de `/combinaciones/{id_tiempo}`
 * respetando la cascada Fundo → Módulo → Variedad → Condición.
 */
export function buildOpcionesCascada(
  combinaciones: readonly CombinacionProyeccion[],
  seleccion: Pick<FiltrosProyeccionUrl, 'fundo' | 'modulo' | 'variedad' | 'condicion'>,
): {
  fundos: string[]
  modulos: string[]
  variedades: string[]
  condiciones: string[]
} {
  const sortUnique = (items: string[]) =>
    Array.from(new Set(items.filter((v) => v.trim().length > 0))).sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true }),
    )

  const fundos = sortUnique(combinaciones.map((c) => c.fundo))

  const byFundo = seleccion.fundo
    ? combinaciones.filter((c) => c.fundo === seleccion.fundo)
    : combinaciones
  const modulos = sortUnique(byFundo.map((c) => c.modulo))

  const byModulo = seleccion.modulo
    ? byFundo.filter((c) => c.modulo === seleccion.modulo)
    : byFundo
  const variedades = sortUnique(byModulo.map((c) => c.variedad))

  const byVariedad = seleccion.variedad
    ? byModulo.filter((c) => c.variedad === seleccion.variedad)
    : byModulo
  const condiciones = sortUnique(byVariedad.map((c) => c.condicion))

  return { fundos, modulos, variedades, condiciones }
}

/** Convierte el string de módulo a entero seguro para el backend FastAPI (`Optional[int]`). */
export function parseModuloParam(modulo: string): number | null {
  const trimmed = modulo.trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return null
  const num = Number(trimmed)
  return Number.isSafeInteger(num) ? num : null
}

/**
 * Detecta el comportamiento documentado en R10 (`rutas_proyecciones.py:66-68`):
 * todas las filas semanales devuelven `kg_anterior = 0`, `pct_variacion = 0` y `tendencia = "Estable"`.
 * Permite avisar al usuario honestamente en vez de mostrar "0.0% variación" como dato histórico real.
 */
export function isComparativoAnteriorFijo(semanas: readonly FilaSemanalProyeccion[]): boolean {
  if (semanas.length === 0) return false
  return semanas.every(
    (s) =>
      s.kg_anterior === 0 &&
      s.pct_variacion === 0 &&
      s.tendencia.trim().toLowerCase() === 'estable',
  )
}

export interface ResumenCoberturaCenso {
  cubiertas: number
  totales: number
  estimadasFallback: number
  porcentaje: number | null
  tieneFallback: boolean
}

export function computeCoberturaCenso(kpis: KpisProyeccion): ResumenCoberturaCenso {
  const cubiertas = Math.max(0, Math.trunc(kpis.unidades_cubiertas ?? 0))
  const totales = Math.max(0, Math.trunc(kpis.unidades_totales ?? 0))
  const estimadasFallback = Math.max(0, totales - cubiertas)
  const porcentaje = totales > 0 ? Number(((cubiertas / totales) * 100).toFixed(1)) : null
  return {
    cubiertas,
    totales,
    estimadasFallback,
    porcentaje,
    tieneFallback: estimadasFallback > 0,
  }
}

/** Agrega `df_detalle` por `variedad`, `fundo` o `certificacion` para vistas comparativas. */
export function aggregateDetalleBy(
  detalle: readonly DetalleUnidadProyeccion[],
  dimension: 'variedad' | 'fundo' | 'certificacion',
): ResumenAgregadoDimension[] {
  const map = new Map<
    string,
    { unidades: Set<string>; kg_base: number; kg_pesimista: number; kg_optimista: number }
  >()

  let grandTotal = 0
  for (const row of detalle) {
    const key = (row[dimension] || 'Sin especificar').trim() || 'Sin especificar'
    const unitKey = `${row.id_geografia}:${row.id_variedad}`
    let entry = map.get(key)
    if (!entry) {
      entry = { unidades: new Set(), kg_base: 0, kg_pesimista: 0, kg_optimista: 0 }
      map.set(key, entry)
    }
    entry.unidades.add(unitKey)
    entry.kg_base += row.kg_base
    entry.kg_pesimista += row.kg_pesimista
    entry.kg_optimista += row.kg_optimista
    grandTotal += row.kg_base
  }

  return Array.from(map.entries())
    .map(([clave, acc]) => ({
      clave,
      unidades: acc.unidades.size,
      kg_base: Number(acc.kg_base.toFixed(2)),
      kg_pesimista: Number(acc.kg_pesimista.toFixed(2)),
      kg_optimista: Number(acc.kg_optimista.toFixed(2)),
      participacion_pct:
        grandTotal > 0 ? Number(((acc.kg_base / grandTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.kg_base - a.kg_base)
}

function escapeCsvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/** Genera CSV con BOM UTF-8 listo para Excel a partir del detalle de proyección Six-Week. */
export function buildDetalleProyeccionCsv(detalle: readonly DetalleUnidadProyeccion[]): string {
  const headers = [
    'ID_Geografia',
    'ID_Variedad',
    'ID_Fundo',
    'Fundo',
    'Modulo',
    'Turno',
    'Valvula',
    'Variedad',
    'Condicion',
    'Certificacion',
    'Semana',
    'Semana_Label',
    'Fecha_Semana',
    'ID_Tiempo_Proy',
    'Kg_Base',
    'Kg_Pesimista',
    'Kg_Optimista',
  ]

  const lines = [headers.join(',')]
  for (const row of detalle) {
    lines.push(
      [
        row.id_geografia,
        row.id_variedad,
        row.id_fundo,
        row.fundo,
        row.modulo,
        row.turno,
        row.valvula,
        row.variedad,
        row.condicion,
        row.certificacion,
        row.semana,
        row.semana_label,
        row.fecha_semana,
        row.id_tiempo_proy,
        row.kg_base.toFixed(2),
        row.kg_pesimista.toFixed(2),
        row.kg_optimista.toFixed(2),
      ]
        .map(escapeCsvField)
        .join(','),
    )
  }

  return `\uFEFF${lines.join('\r\n')}`
}
