import { cn } from '@/lib/utils'
import { formatNumber } from '@/shared/lib/format'
import { computeCoberturaCenso, formatKg, formatTons } from '../proyeccionesUtils'
import { formatMarginPctDelta, isCoberturaDisponible } from '../proyeccionesWorkflow'
import type { FilaSemanalProyeccion, KpisProyeccion } from '../types'

interface ProyeccionKpiGridProps {
  kpis: KpisProyeccion
  semanas?: FilaSemanalProyeccion[]
  margenPesimista?: number
  margenOptimista?: number
}

export function ProyeccionKpiGrid({
  kpis,
  semanas = [],
  margenPesimista,
  margenOptimista,
}: ProyeccionKpiGridProps) {
  const coberturaDisponible = isCoberturaDisponible(kpis)
  const cobertura = computeCoberturaCenso(kpis)

  const w1w2Kg = semanas
    .filter((s) => s.semana === 1 || s.semana === 2)
    .reduce((acc, s) => acc + s.kg_proyectados, 0)
  const totalBase = kpis.total_base ?? 0
  const w1w2Pct = totalBase > 0 ? Math.round((w1w2Kg / totalBase) * 100) : null

  const useTonsPrimary = totalBase >= 1000

  return (
    <section
      aria-label="Indicadores de proyección Six-Week"
      className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 xl:divide-x"
    >
      {/* KPI 1: Proyección Base (6 semanas) */}
      <div className="space-y-1 px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground">
          Proyección Base (6 semanas)
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="metric-value font-mono text-2xl font-semibold tracking-tight text-foreground">
            {kpis.total_base === null
              ? 'No disponible'
              : useTonsPrimary
                ? formatTons(kpis.total_base)
                : formatKg(kpis.total_base, 1)}
          </span>
          {kpis.total_base !== null && (
            <span className="text-xs text-muted-foreground">
              {useTonsPrimary ? 't' : 'kg'}
            </span>
          )}
        </div>
        <p className="metric-value font-mono text-[11px] text-muted-foreground">
          {kpis.total_base === null
            ? 'Sin total calculado'
            : `${formatKg(kpis.total_base, 0)} kg${
                w1w2Pct !== null ? ` · W1–W2: ${w1w2Pct}%` : ''
              }`}
        </p>
      </div>

      {/* KPI 2: Banda Pesimista – Optimista */}
      <div className="space-y-1 px-5 py-4 sm:border-l sm:border-border xl:border-l-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Banda Pesimista – Optimista
          </p>
          {margenPesimista !== undefined && margenOptimista !== undefined && (
            <span className="metric-value font-mono text-[10px] text-muted-foreground">
              {formatMarginPctDelta(margenPesimista)} / {formatMarginPctDelta(margenOptimista)}
            </span>
          )}
        </div>
        <p className="metric-value font-mono text-xl font-semibold tracking-tight text-foreground">
          {kpis.total_pes === null || kpis.total_opt === null
            ? 'No disponible'
            : useTonsPrimary
              ? `${formatTons(kpis.total_pes)} – ${formatTons(kpis.total_opt)} t`
              : `${formatKg(kpis.total_pes, 0)} – ${formatKg(kpis.total_opt, 0)} kg`}
        </p>
        <p className="metric-value font-mono text-[11px] text-muted-foreground">
          {kpis.total_pes === null || kpis.total_opt === null
            ? 'Sin rango de sensibilidad'
            : `${formatKg(kpis.total_pes, 0)} – ${formatKg(kpis.total_opt, 0)} kg`}
        </p>
      </div>

      {/* KPI 3: Variedad líder y rendimiento */}
      <div className="space-y-1 border-t border-border px-5 py-4 xl:border-t-0">
        <p className="text-xs font-medium text-muted-foreground">
          Variedad líder · Rendimiento
        </p>
        <p
          className="truncate text-xl font-semibold tracking-tight text-foreground"
          title={kpis.variedad_top}
        >
          {kpis.variedad_top && kpis.variedad_top !== '—'
            ? kpis.variedad_top
            : 'No disponible'}
        </p>
        <p className="metric-value font-mono text-[11px] text-muted-foreground">
          {kpis.kg_por_planta !== null ? `${kpis.kg_por_planta.toFixed(3)} kg/pl` : 'No disponible'}{' '}
          ·{' '}
          {kpis.total_plantas !== null
            ? `${formatNumber(Math.round(kpis.total_plantas))} plantas`
            : 'Sin censo'}
        </p>
      </div>

      {/* KPI 4: Cobertura de censo (honesto: nunca verde cuando falta dato) */}
      <div className="space-y-1 border-t border-border px-5 py-4 sm:border-l xl:border-t-0 xl:border-l-0">
        <p className="text-xs font-medium text-muted-foreground">
          Cobertura de censo
        </p>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'metric-value font-mono text-2xl font-semibold tracking-tight',
              !coberturaDisponible
                ? 'text-muted-foreground'
                : cobertura.tieneFallback
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-foreground',
            )}
          >
            {coberturaDisponible && cobertura.porcentaje !== null
              ? `${cobertura.porcentaje}%`
              : 'No disponible'}
          </span>
          {coberturaDisponible && (
            <span className="font-mono text-xs text-muted-foreground">
              {cobertura.cubiertas}/{cobertura.totales} u.
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              !coberturaDisponible
                ? 'bg-muted-foreground/50'
                : cobertura.tieneFallback
                  ? 'bg-amber-500'
                  : 'bg-emerald-500',
            )}
          />
          <span className="truncate">
            {!coberturaDisponible
              ? 'El cálculo no reportó detalle de cobertura'
              : cobertura.tieneFallback
                ? `${cobertura.estimadasFallback} unidad(es) con respaldo (1,500 pl.)`
                : 'Censo real en todas las unidades'}
          </span>
        </p>
      </div>
    </section>
  )
}
