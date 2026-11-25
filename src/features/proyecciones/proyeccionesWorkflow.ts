import { serializeMatrizPayload } from '@/features/configuracion/matrizUtils'
import type {
  BiologiaConstantes,
  MatrizBiologicaCompleta,
} from '@/features/configuracion/types'
import type {
  ComparacionEscenarios,
  EscenarioSnapshot,
  FilaComparacionSemanal,
  InspeccionSubTab,
  KpisProyeccion,
  OrigenMatrizProyeccion,
  ProyeccionLifecycle,
  ProyeccionStepId,
  StepVisualState,
} from './types'

export interface ProyeccionStepDefinition {
  id: ProyeccionStepId
  numero: number
  titulo: string
  descripcionCorta: string
}

export const PROYECCION_STEPS: readonly ProyeccionStepDefinition[] = [
  {
    id: 'corte',
    numero: 1,
    titulo: 'Corte y cobertura',
    descripcionCorta: 'Fecha, alcance y datos de campo',
  },
  {
    id: 'supuestos',
    numero: 2,
    titulo: 'Supuestos y simulación',
    descripcionCorta: 'Bandas, matriz y cálculo previo',
  },
  {
    id: 'inspeccion',
    numero: 3,
    titulo: 'Inspección y comparación',
    descripcionCorta: 'Curva W1–W6, detalle y variantes',
  },
  {
    id: 'publicar',
    numero: 4,
    titulo: 'Publicar versión',
    descripcionCorta: 'Revisión final y guardado oficial',
  },
] as const

export function parseProyeccionStepParam(params: URLSearchParams): ProyeccionStepId {
  const paso = params.get('paso')?.trim()
  if (
    paso === 'corte' ||
    paso === 'supuestos' ||
    paso === 'inspeccion' ||
    paso === 'publicar'
  ) {
    return paso
  }
  const legacyTab = params.get('tab')?.trim()
  if (legacyTab === 'supuestos') return 'supuestos'
  return 'corte'
}

export function parseInspeccionSubTab(params: URLSearchParams): InspeccionSubTab {
  const vista = params.get('vista')?.trim()
  if (vista === 'curva' || vista === 'detalle' || vista === 'comparar') {
    return vista
  }
  if (params.get('tab')?.trim() === 'detalle') return 'detalle'
  return 'curva'
}

export function applyWorkflowParams(
  current: URLSearchParams,
  patch: { paso?: ProyeccionStepId; vista?: InspeccionSubTab },
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (patch.paso !== undefined) {
    if (patch.paso === 'corte') next.delete('paso')
    else next.set('paso', patch.paso)
  }
  if (patch.vista !== undefined) {
    if (patch.vista === 'curva') next.delete('vista')
    else next.set('vista', patch.vista)
  }
  return next
}

export function isCoberturaDisponible(kpis: KpisProyeccion): boolean {
  return (
    kpis.unidades_cubiertas !== null &&
    kpis.unidades_totales !== null &&
    Number.isFinite(kpis.unidades_cubiertas) &&
    Number.isFinite(kpis.unidades_totales) &&
    kpis.unidades_totales > 0
  )
}

/** Traduce un multiplicador (ej. `0.9906` -> `"-0.94%"`, `1.0107` -> `"+1.07%"`). */
export function formatMarginPctDelta(factor: number): string {
  if (!Number.isFinite(factor)) return '—'
  const pct = Number(((factor - 1) * 100).toFixed(2))
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct}%`
}

export interface FingerprintInputs {
  idTiempo: number | null
  fundo: string
  modulo: string
  variedad: string
  condicion: string
  margenPesimista: number
  margenOptimista: number
  origenMatriz: OrigenMatrizProyeccion
  matriz: MatrizBiologicaCompleta
  constantes: Pick<
    BiologiaConstantes,
    'plantas_por_punto' | 'decay_factor' | 'delta_productivas'
  >
}

export function computeInputFingerprint(input: FingerprintInputs): string {
  return JSON.stringify({
    t: input.idTiempo,
    f: input.fundo.trim(),
    m: input.modulo.trim(),
    v: input.variedad.trim(),
    c: input.condicion.trim(),
    mp: Number.isFinite(input.margenPesimista) ? Number(input.margenPesimista.toFixed(6)) : null,
    mo: Number.isFinite(input.margenOptimista) ? Number(input.margenOptimista.toFixed(6)) : null,
    om: input.origenMatriz,
    mz: serializeMatrizPayload(input.matriz),
    ct: {
      p: input.constantes.plantas_por_punto,
      d: input.constantes.decay_factor,
      dp: input.constantes.delta_productivas,
    },
  })
}

export function isRunStale(
  activeRun: EscenarioSnapshot | null,
  currentFingerprint: string,
): boolean {
  if (!activeRun) return false
  return activeRun.fingerprint !== currentFingerprint
}

export function deriveDisplayLifecycle(
  activeRun: EscenarioSnapshot | null,
  isStale: boolean,
): ProyeccionLifecycle {
  if (!activeRun) return 'borrador'
  if (isStale) return 'desactualizado'
  return activeRun.meta.modo === 'ejecutar' ? 'publicado' : 'simulado'
}

export interface StepStateContext {
  activeStep: ProyeccionStepId
  hasFecha: boolean
  hasMargenError: boolean
  canExecute: boolean
  activeRun: EscenarioSnapshot | null
  isStale: boolean
  simularEndpointPending: boolean
}

export function computeStepStates(ctx: StepStateContext): StepVisualState[] {
  const hasRows = Boolean(ctx.activeRun && ctx.activeRun.result.df_semanal.length > 0)
  const isPublished = Boolean(
    ctx.activeRun && ctx.activeRun.meta.modo === 'ejecutar' && !ctx.isStale,
  )

  return PROYECCION_STEPS.map((step) => {
    let enabled = true
    let completed = false
    let disabledReason: string | undefined

    if (step.id === 'corte') {
      enabled = true
      completed = ctx.hasFecha && ctx.activeStep !== 'corte'
    } else if (step.id === 'supuestos') {
      enabled = ctx.hasFecha
      completed = Boolean(ctx.activeRun) && !ctx.hasMargenError && ctx.activeStep !== 'supuestos'
      if (!enabled) disabledReason = 'Selecciona primero una fecha de evaluación.'
    } else if (step.id === 'inspeccion') {
      enabled = Boolean(ctx.activeRun)
      completed = Boolean(ctx.activeRun) && ctx.activeStep === 'publicar'
      if (!enabled) disabledReason = 'Calcula primero una simulación en el Paso 2.'
    } else if (step.id === 'publicar') {
      enabled =
        ctx.canExecute &&
        ((hasRows && !ctx.isStale) || ctx.simularEndpointPending || isPublished)
      completed = isPublished
      if (!ctx.canExecute) {
        disabledReason = 'Requiere rol Analista MDM o superior para publicar.'
      } else if (ctx.isStale) {
        disabledReason = 'Recalcula la simulación con los cambios actuales antes de publicar.'
      } else if (!hasRows && !ctx.simularEndpointPending) {
        disabledReason = 'Simula un escenario con filas proyectables antes de publicar.'
      }
    }

    return {
      ...step,
      enabled,
      completed,
      active: ctx.activeStep === step.id,
      disabledReason,
    }
  })
}

export function compareSnapshots(
  baseline: EscenarioSnapshot,
  candidate: EscenarioSnapshot,
): ComparacionEscenarios {
  const totalBaseA = baseline.result.kpis.total_base ?? 0
  const totalBaseB = candidate.result.kpis.total_base ?? 0
  const deltaBaseKg = Number((totalBaseB - totalBaseA).toFixed(2))
  const deltaBasePct =
    totalBaseA > 0 ? Number(((deltaBaseKg / totalBaseA) * 100).toFixed(2)) : null

  const totalPesA = baseline.result.kpis.total_pes ?? 0
  const totalPesB = candidate.result.kpis.total_pes ?? 0
  const totalOptA = baseline.result.kpis.total_opt ?? 0
  const totalOptB = candidate.result.kpis.total_opt ?? 0

  const mapA = new Map(baseline.result.df_semanal.map((s) => [s.semana, s]))
  const mapB = new Map(candidate.result.df_semanal.map((s) => [s.semana, s]))

  const semanas: FilaComparacionSemanal[] = []
  for (let w = 1; w <= 6; w += 1) {
    const rowA = mapA.get(w)
    const rowB = mapB.get(w)
    if (!rowA && !rowB) continue
    const kgA = rowA?.kg_proyectados ?? 0
    const kgB = rowB?.kg_proyectados ?? 0
    const deltaKg = Number((kgB - kgA).toFixed(2))
    const deltaPct = kgA > 0 ? Number(((deltaKg / kgA) * 100).toFixed(2)) : null
    semanas.push({
      semana: w,
      semana_label: rowB?.semana_label || rowA?.semana_label || `W${w}`,
      kg_base_a: kgA,
      kg_base_b: kgB,
      delta_kg: deltaKg,
      delta_pct: deltaPct,
    })
  }

  return {
    totalBaseA,
    totalBaseB,
    deltaBaseKg,
    deltaBasePct,
    totalPesA,
    totalPesB,
    totalOptA,
    totalOptB,
    semanas,
  }
}

export function buildSnapshotLabel(
  index: number,
  margenPesimista: number,
  margenOptimista: number,
  modo: 'simular' | 'ejecutar',
): string {
  const prefix = modo === 'ejecutar' ? 'Publicado' : `Escenario #${index}`
  return `${prefix} (${formatMarginPctDelta(margenPesimista)} / ${formatMarginPctDelta(margenOptimista)})`
}
