import { apiRequest } from '@/shared/api/client'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import {
  asArray,
  asFiniteNumber,
  asOptionalFiniteNumber,
  asRecord,
  asString,
} from '@/shared/api/normalize'
import { isValidIdTiempo, parseModuloParam } from './proyeccionesUtils'
import type {
  CombinacionProyeccion,
  DetalleUnidadProyeccion,
  FilaSemanalProyeccion,
  IntegridadProyeccion,
  KpisProyeccion,
  PeticionEjecutarProyeccion,
  RespuestaProyeccion,
} from './types'

export function normalizeFechasDisponibles(raw: unknown): number[] {
  const rec = asRecord(raw)
  const list = Array.isArray(raw) ? raw : asArray<unknown>(rec.fechas)
  const seen = new Set<number>()
  const valid: number[] = []
  for (const item of list) {
    const num = typeof item === 'number' ? item : typeof item === 'string' ? Number(item.trim()) : Number.NaN
    if (isValidIdTiempo(num) && !seen.has(num)) {
      seen.add(num)
      valid.push(num)
    }
  }
  return valid.sort((a, b) => b - a)
}

export function normalizeCombinaciones(raw: unknown): CombinacionProyeccion[] {
  const list = asArray<unknown>(raw)
  return list.map((entry) => {
    const rec = asRecord(entry)
    return {
      fundo: asString(rec.Fundo ?? rec.fundo, 'Sin fundo').trim() || 'Sin fundo',
      modulo: String(rec.Modulo ?? rec.modulo ?? '').trim(),
      variedad: asString(rec.Variedad ?? rec.variedad, 'Sin variedad').trim() || 'Sin variedad',
      condicion: asString(rec.Condicion ?? rec.condicion, 'Sin condición').trim() || 'Sin condición',
    }
  })
}

export function normalizeIntegridad(raw: unknown): IntegridadProyeccion {
  const rec = asRecord(raw)
  return {
    conteo: Boolean(rec.conteo),
    peladas: Boolean(rec.peladas),
    pesos: Boolean(rec.pesos),
  }
}

export function normalizeRespuestaProyeccion(raw: unknown): RespuestaProyeccion {
  const rec = asRecord(raw)

  const df_semanal: FilaSemanalProyeccion[] = asArray<unknown>(rec.df_semanal)
    .map((item) => {
      const r = asRecord(item)
      const semana = Math.trunc(asFiniteNumber(r.semana, 0))
      return {
        semana,
        semana_label: asString(r.semana_label, semana > 0 ? `W${semana}` : '—'),
        fecha_semana: asString(r.fecha_semana, ''),
        kg_proyectados: asFiniteNumber(r.kg_proyectados ?? r.kg_base, 0),
        kg_pesimista: asFiniteNumber(r.kg_pesimista, 0),
        kg_optimista: asFiniteNumber(r.kg_optimista, 0),
        kg_anterior: asFiniteNumber(r.kg_anterior, 0),
        pct_variacion: asFiniteNumber(r.pct_variacion, 0),
        tendencia: asString(r.tendencia, 'Estable'),
      }
    })
    .filter((row) => row.semana >= 1 && row.semana <= 6)
    .sort((a, b) => a.semana - b.semana)

  const rawKpis = asRecord(rec.kpis)
  const kpis: KpisProyeccion = {
    total_base: asOptionalFiniteNumber(rawKpis.total_base),
    total_opt: asOptionalFiniteNumber(rawKpis.total_opt),
    total_pes: asOptionalFiniteNumber(rawKpis.total_pes),
    variedad_top: asString(rawKpis.variedad_top, '—') || '—',
    total_plantas: asOptionalFiniteNumber(rawKpis.total_plantas),
    kg_por_planta: asOptionalFiniteNumber(rawKpis.kg_por_planta),
    unidades_cubiertas: asOptionalFiniteNumber(rawKpis.unidades_cubiertas),
    unidades_totales: asOptionalFiniteNumber(rawKpis.unidades_totales),
  }

  const df_detalle: DetalleUnidadProyeccion[] = asArray<unknown>(rec.df_detalle).map((item) => {
    const r = asRecord(item)
    return {
      id_geografia: Math.trunc(asFiniteNumber(r.id_geografia, 0)),
      id_variedad: Math.trunc(asFiniteNumber(r.id_variedad, 0)),
      id_fundo: Math.trunc(asFiniteNumber(r.id_fundo, 0)),
      fundo: asString(r.fundo, '—') || '—',
      condicion: asString(r.condicion, 'Sin condición') || 'Sin condición',
      certificacion: asString(r.certificacion, 'Sin certificación') || 'Sin certificación',
      modulo: String(r.modulo ?? '—'),
      turno: String(r.turno ?? '—'),
      valvula: String(r.valvula ?? '—'),
      variedad: asString(r.variedad, '—') || '—',
      semana: Math.trunc(asFiniteNumber(r.semana, 0)),
      id_tiempo_proy: Math.trunc(asFiniteNumber(r.id_tiempo_proy, 0)),
      semana_label: asString(r.semana_label, ''),
      fecha_semana: asString(r.fecha_semana, ''),
      kg_base: asFiniteNumber(r.kg_base, 0),
      kg_pesimista: asFiniteNumber(r.kg_pesimista, 0),
      kg_optimista: asFiniteNumber(r.kg_optimista, 0),
    }
  })

  return { df_semanal, kpis, df_detalle }
}

export async function fetchFechasDisponibles(): Promise<number[]> {
  const raw = await apiRequest<unknown>(API_ENDPOINTS.proyecciones.fechas)
  return normalizeFechasDisponibles(raw)
}

export async function fetchCombinacionesDisponibles(
  idTiempo: number,
): Promise<CombinacionProyeccion[]> {
  const raw = await apiRequest<unknown>(API_ENDPOINTS.proyecciones.combinaciones(idTiempo))
  return normalizeCombinaciones(raw)
}

export async function fetchIntegridadDatos(
  idTiempo: number,
  filters: { modulo?: string; variedad?: string; condicion?: string },
): Promise<IntegridadProyeccion> {
  const moduloInt = filters.modulo ? parseModuloParam(filters.modulo) : null
  const raw = await apiRequest<unknown>(API_ENDPOINTS.proyecciones.integridad(idTiempo), {
    query: {
      modulo: moduloInt ?? undefined,
      variedad: filters.variedad?.trim() || undefined,
      condicion: filters.condicion?.trim() || undefined,
    },
  })
  return normalizeIntegridad(raw)
}

export async function ejecutarProyeccionApi(
  payload: PeticionEjecutarProyeccion,
  mode: 'ejecutar' | 'simular' = 'ejecutar',
): Promise<RespuestaProyeccion> {
  const endpoint =
    mode === 'simular' ? API_ENDPOINTS.proyecciones.simular : API_ENDPOINTS.proyecciones.ejecutar
  const raw = await apiRequest<unknown>(endpoint, {
    method: 'POST',
    body: payload,
  })
  return normalizeRespuestaProyeccion(raw)
}
