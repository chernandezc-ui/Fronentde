import { describe, expect, it } from 'vitest'
import { createDefaultMatrizCompleta } from '@/features/configuracion/matrizUtils'
import { DEFAULT_BIOLOGIA_CONSTANTES } from '@/features/configuracion/schemas'
import {
  applyWorkflowParams,
  compareSnapshots,
  computeInputFingerprint,
  computeStepStates,
  deriveDisplayLifecycle,
  formatMarginPctDelta,
  isCoberturaDisponible,
  isRunStale,
  parseInspeccionSubTab,
  parseProyeccionStepParam,
} from './proyeccionesWorkflow'
import type { EscenarioSnapshot } from './types'

function makeSnapshot(
  id: string,
  fingerprint: string,
  totalBase: number,
  modo: 'simular' | 'ejecutar' = 'simular',
): EscenarioSnapshot {
  return {
    id,
    label: `Test ${id}`,
    fingerprint,
    meta: {
      id_tiempo: 20261123,
      fundo: '',
      modulo: '',
      variedad: '',
      condicion: '',
      margen_pesimista: 0.9906,
      margen_optimista: 1.0107,
      origen_matriz: 'backend',
      matriz_snapshot: createDefaultMatrizCompleta(),
      ejecutado_en: '2026-11-24T12:00:00Z',
      modo,
    },
    result: {
      df_semanal: [
        {
          semana: 1,
          semana_label: 'W1 (30/11)',
          fecha_semana: '2026-11-30',
          kg_proyectados: totalBase,
          kg_pesimista: totalBase * 0.95,
          kg_optimista: totalBase * 1.05,
          kg_anterior: 0,
          pct_variacion: 0,
          tendencia: 'Estable',
        },
      ],
      kpis: {
        total_base: totalBase,
        total_pes: totalBase * 0.95,
        total_opt: totalBase * 1.05,
        variedad_top: 'Biloxi',
        total_plantas: 5000,
        kg_por_planta: totalBase / 5000,
        unidades_cubiertas: 4,
        unidades_totales: 5,
      },
      df_detalle: [],
    },
  }
}

describe('proyeccionesWorkflow — máquina de 4 etapas, stale y comparador', () => {
  it('calcula huella determinista y detecta obsolescencia al cambiar filtros o márgenes', () => {
    const baseInputs = {
      idTiempo: 20261123,
      fundo: 'ACP NORTE',
      modulo: '1',
      variedad: 'Biloxi',
      condicion: '',
      margenPesimista: 0.9906,
      margenOptimista: 1.0107,
      origenMatriz: 'backend' as const,
      matriz: createDefaultMatrizCompleta(),
      constantes: DEFAULT_BIOLOGIA_CONSTANTES,
    }
    const fp1 = computeInputFingerprint(baseInputs)
    const fp2 = computeInputFingerprint({ ...baseInputs, margenPesimista: 0.95 })
    const fp3 = computeInputFingerprint({ ...baseInputs, fundo: 'SAN CARLOS' })

    expect(fp1).not.toBe(fp2)
    expect(fp1).not.toBe(fp3)

    const snap = makeSnapshot('s1', fp1, 1000)
    expect(isRunStale(snap, fp1)).toBe(false)
    expect(isRunStale(snap, fp2)).toBe(true)
    expect(deriveDisplayLifecycle(null, false)).toBe('borrador')
    expect(deriveDisplayLifecycle(snap, false)).toBe('simulado')
    expect(deriveDisplayLifecycle(snap, true)).toBe('desactualizado')
    expect(deriveDisplayLifecycle(makeSnapshot('p1', fp1, 1000, 'ejecutar'), false)).toBe(
      'publicado',
    )
  })

  it('controla desbloqueo progresivo del stepper según estado y RBAC', () => {
    const initial = computeStepStates({
      activeStep: 'corte',
      hasFecha: true,
      hasMargenError: false,
      canExecute: true,
      activeRun: null,
      isStale: false,
      simularEndpointPending: false,
    })
    expect(initial.map((s) => s.enabled)).toEqual([true, true, false, false])

    const snap = makeSnapshot('s1', 'fp1', 1200)
    const staleStates = computeStepStates({
      activeStep: 'inspeccion',
      hasFecha: true,
      hasMargenError: false,
      canExecute: true,
      activeRun: snap,
      isStale: true,
      simularEndpointPending: false,
    })
    expect(staleStates.find((s) => s.id === 'publicar')?.enabled).toBe(false)

    const viewerStates = computeStepStates({
      activeStep: 'inspeccion',
      hasFecha: true,
      hasMargenError: false,
      canExecute: false,
      activeRun: snap,
      isStale: false,
      simularEndpointPending: false,
    })
    expect(viewerStates.find((s) => s.id === 'publicar')?.enabled).toBe(false)
  })

  it('compara dos escenarios manejando cero sin NaN/Infinity', () => {
    const a = makeSnapshot('a', 'fpA', 1000)
    const b = makeSnapshot('b', 'fpB', 1250)
    const diff = compareSnapshots(a, b)
    expect(diff.deltaBaseKg).toBe(250)
    expect(diff.deltaBasePct).toBe(25)
    expect(diff.semanas[0]).toMatchObject({ semana: 1, delta_kg: 250, delta_pct: 25 })

    const zero = makeSnapshot('z', 'fpZ', 0)
    const diffFromZero = compareSnapshots(zero, b)
    expect(diffFromZero.deltaBasePct).toBeNull()
    expect(diffFromZero.semanas[0].delta_pct).toBeNull()
  })

  it('distingue ausencia de cobertura (null/0) de cobertura real y parsea parámetros URL', () => {
    expect(
      isCoberturaDisponible({
        total_base: 100,
        total_opt: 105,
        total_pes: 95,
        variedad_top: 'Biloxi',
        total_plantas: 1000,
        kg_por_planta: 0.1,
        unidades_cubiertas: null,
        unidades_totales: null,
      }),
    ).toBe(false)

    expect(formatMarginPctDelta(0.9906)).toBe('-0.94%')
    expect(formatMarginPctDelta(1.0107)).toBe('+1.07%')
    expect(parseProyeccionStepParam(new URLSearchParams('paso=supuestos'))).toBe('supuestos')
    expect(parseProyeccionStepParam(new URLSearchParams('paso=__proto__'))).toBe('corte')
    expect(parseInspeccionSubTab(new URLSearchParams('vista=comparar'))).toBe('comparar')
    expect(
      applyWorkflowParams(new URLSearchParams('fecha=20261123'), {
        paso: 'inspeccion',
        vista: 'detalle',
      }).toString(),
    ).toBe('fecha=20261123&paso=inspeccion&vista=detalle')
  })
})
