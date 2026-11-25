import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ejecutarProyeccionApi,
  normalizeCombinaciones,
  normalizeFechasDisponibles,
  normalizeIntegridad,
  normalizeRespuestaProyeccion,
} from './proyeccionesApi'
import {
  DEFAULT_MARGEN_OPTIMISTA,
  DEFAULT_MARGEN_PESIMISTA,
  aggregateDetalleBy,
  buildDetalleProyeccionCsv,
  buildOpcionesCascada,
  computeCoberturaCenso,
  formatIdTiempo,
  getIsoWeekFromIdTiempo,
  isComparativoAnteriorFijo,
  isValidIdTiempo,
  margenesEscenarioSchema,
  parseModuloParam,
  parseProyeccionesSearchParams,
  serializeProyeccionesSearchParams,
} from './proyeccionesUtils'
import type { CombinacionProyeccion, DetalleUnidadProyeccion } from './types'

describe('proyecciones — utilidades, validaciones y normalización Six-Week', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('valida fechas reales YYYYMMDD y rechaza fechas imposibles o tipos inválidos', () => {
    expect(isValidIdTiempo(20261123)).toBe(true)
    expect(isValidIdTiempo(20240229)).toBe(true) // año bisiesto
    expect(isValidIdTiempo(20260229)).toBe(false) // no bisiesto
    expect(isValidIdTiempo(20261301)).toBe(false)
    expect(isValidIdTiempo(202611)).toBe(false)
    expect(isValidIdTiempo('20261123')).toBe(false)
    expect(isValidIdTiempo(Number.NaN)).toBe(false)

    expect(formatIdTiempo(20261123)).toBe('23/11/2026')
    expect(getIsoWeekFromIdTiempo(20261123)).toEqual({ anioIso: 2026, semanaIso: 48 })
    expect(formatIdTiempo(20261123, true)).toBe('23/11/2026 · Sem 48 (2026)')
    expect(formatIdTiempo(20260229)).toBe('—')
  })

  it('valida márgenes pesimista y optimista con Zod', () => {
    expect(
      margenesEscenarioSchema.safeParse({
        margen_pesimista: DEFAULT_MARGEN_PESIMISTA,
        margen_optimista: DEFAULT_MARGEN_OPTIMISTA,
      }).success,
    ).toBe(true)

    expect(
      margenesEscenarioSchema.safeParse({
        margen_pesimista: 1.2,
        margen_optimista: 1.1,
      }).success,
    ).toBe(false)

    expect(
      margenesEscenarioSchema.safeParse({
        margen_pesimista: -0.1,
        margen_optimista: 1.0,
      }).success,
    ).toBe(false)

    expect(
      margenesEscenarioSchema.safeParse({
        margen_pesimista: Number.NaN,
        margen_optimista: 1.0,
      }).success,
    ).toBe(false)
  })

  it('sincroniza filtros URL de forma segura y rechaza fechas corruptas', () => {
    const parsed = parseProyeccionesSearchParams(
      new URLSearchParams(
        'fecha=20261123&fundo=ACP%20NORTE&modulo=3&variedad=Biloxi&tab=detalle',
      ),
    )
    expect(parsed).toEqual({
      fecha: 20261123,
      fundo: 'ACP NORTE',
      modulo: '3',
      variedad: 'Biloxi',
      condicion: '',
      tab: 'detalle',
    })

    const bad = parseProyeccionesSearchParams(
      new URLSearchParams('fecha=20260229&tab=invalido'),
    )
    expect(bad.fecha).toBeNull()
    expect(bad.tab).toBe('resumen')

    const qs = serializeProyeccionesSearchParams(parsed).toString()
    expect(qs).toContain('fecha=20261123')
    expect(qs).toContain('tab=detalle')
    expect(parseModuloParam('12')).toBe(12)
    expect(parseModuloParam('M12')).toBeNull()
  })

  it('filtra combinaciones jerárquicas en cascada Fundo -> Módulo -> Variedad -> Condición', () => {
    const combs: CombinacionProyeccion[] = [
      { fundo: 'ACP NORTE', modulo: '1', variedad: 'Biloxi', condicion: 'Suelo - Convencional' },
      { fundo: 'ACP NORTE', modulo: '2', variedad: 'Sekoya', condicion: 'Maceta - Orgánico' },
      { fundo: 'SAN CARLOS', modulo: '1', variedad: 'Ventura', condicion: 'Suelo - Convencional' },
    ]

    const all = buildOpcionesCascada(combs, { fundo: '', modulo: '', variedad: '', condicion: '' })
    expect(all.fundos).toEqual(['ACP NORTE', 'SAN CARLOS'])
    expect(all.modulos).toEqual(['1', '2'])

    const byFundo = buildOpcionesCascada(combs, {
      fundo: 'ACP NORTE',
      modulo: '2',
      variedad: '',
      condicion: '',
    })
    expect(byFundo.variedades).toEqual(['Sekoya'])
    expect(byFundo.condiciones).toEqual(['Maceta - Orgánico'])
  })

  it('detecta comparativo anterior fijo (R10) y cobertura con fallback (R07)', () => {
    expect(
      isComparativoAnteriorFijo([
        {
          semana: 1,
          semana_label: 'W1 (30/11)',
          fecha_semana: '2026-11-30',
          kg_proyectados: 1200,
          kg_pesimista: 1188.72,
          kg_optimista: 1212.84,
          kg_anterior: 0,
          pct_variacion: 0,
          tendencia: 'Estable',
        },
      ]),
    ).toBe(true)

    expect(
      isComparativoAnteriorFijo([
        {
          semana: 1,
          semana_label: 'W1 (30/11)',
          fecha_semana: '2026-11-30',
          kg_proyectados: 1200,
          kg_pesimista: 1188.72,
          kg_optimista: 1212.84,
          kg_anterior: 1000,
          pct_variacion: 20,
          tendencia: 'Alza',
        },
      ]),
    ).toBe(false)

    const cob = computeCoberturaCenso({
      total_base: 5000,
      total_opt: 5053.5,
      total_pes: 4953,
      variedad_top: 'Biloxi',
      total_plantas: 15000,
      kg_por_planta: 0.333,
      unidades_cubiertas: 8,
      unidades_totales: 10,
    })
    expect(cob).toEqual({
      cubiertas: 8,
      totales: 10,
      estimadasFallback: 2,
      porcentaje: 80,
      tieneFallback: true,
    })
  })

  it('agrega detalle por variedad/fundo y genera CSV UTF-8 con escape seguro', () => {
    const detalle: DetalleUnidadProyeccion[] = [
      {
        id_geografia: 101,
        id_variedad: 5,
        id_fundo: 1,
        fundo: 'ACP NORTE',
        condicion: 'Suelo - Orgánico',
        certificacion: 'Orgánico',
        modulo: '1',
        turno: '2',
        valvula: '3',
        variedad: 'Biloxi',
        semana: 1,
        id_tiempo_proy: 20261130,
        semana_label: 'W1 (30/11)',
        fecha_semana: '2026-11-30',
        kg_base: 300,
        kg_pesimista: 297.18,
        kg_optimista: 303.21,
      },
      {
        id_geografia: 202,
        id_variedad: 6,
        id_fundo: 2,
        fundo: 'SAN CARLOS, SUR',
        condicion: 'Maceta - Convencional',
        certificacion: 'Convencional',
        modulo: '1',
        turno: '1',
        valvula: '1',
        variedad: 'Sekoya',
        semana: 1,
        id_tiempo_proy: 20261130,
        semana_label: 'W1 (30/11)',
        fecha_semana: '2026-11-30',
        kg_base: 100,
        kg_pesimista: 99.06,
        kg_optimista: 101.07,
      },
    ]

    const byVar = aggregateDetalleBy(detalle, 'variedad')
    expect(byVar[0]).toMatchObject({ clave: 'Biloxi', participacion_pct: 75, unidades: 1 })
    expect(byVar[1]).toMatchObject({ clave: 'Sekoya', participacion_pct: 25, unidades: 1 })

    const csv = buildDetalleProyeccionCsv(detalle)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"SAN CARLOS, SUR"')
    expect(csv).toContain('300.00,297.18,303.21')
  })

  it('normaliza defensivamente contratos HTTP corruptos y envía matriz explícita al ejecutar', async () => {
    expect(normalizeFechasDisponibles({ fechas: [20261116, '20261123', 20260229, null] })).toEqual([
      20261123,
      20261116,
    ])
    expect(normalizeCombinaciones(null)).toEqual([])
    expect(normalizeIntegridad({ conteo: 1, peladas: 0, pesos: true })).toEqual({
      conteo: true,
      peladas: false,
      pesos: true,
    })

    const emptyResp = normalizeRespuestaProyeccion({ df_semanal: null, kpis: null, df_detalle: 'bad' })
    expect(emptyResp.df_semanal).toEqual([])
    expect(emptyResp.df_detalle).toEqual([])
    expect(emptyResp.kpis.total_base).toBeNull()

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          df_semanal: [
            {
              semana: 1,
              semana_label: 'W1 (30/11)',
              fecha_semana: '2026-11-30',
              kg_proyectados: 1500,
              kg_pesimista: 1485.9,
              kg_optimista: 1516.05,
              kg_anterior: 0,
              pct_variacion: 0,
              tendencia: 'Estable',
            },
          ],
          kpis: {
            total_base: 1500,
            total_opt: 1516.05,
            total_pes: 1485.9,
            variedad_top: 'Biloxi',
            total_plantas: 5000,
            kg_por_planta: 0.3,
            unidades_cubiertas: 2,
            unidades_totales: 2,
          },
          df_detalle: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const res = await ejecutarProyeccionApi({
      id_tiempo: 20261123,
      matriz_inputs: { cosechable: { '1': 1, '2': null } },
      margen_pesimista: 0.9906,
      margen_optimista: 1.0107,
      modulo: 1,
      fundo: 'ACP NORTE',
    })

    expect(res.df_semanal).toHaveLength(1)
    expect(res.kpis.total_base).toBe(1500)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/api/v1/proyecciones/ejecutar')
    const sentBody = JSON.parse(String(init?.body))
    expect(sentBody.matriz_inputs).toEqual({ cosechable: { '1': 1, '2': null } })
  })
})
