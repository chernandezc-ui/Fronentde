import { useMemo } from 'react'
import { GitCompareArrows, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatKg, formatTons } from '../proyeccionesUtils'
import { compareSnapshots } from '../proyeccionesWorkflow'
import type { EscenarioSnapshot } from '../types'

interface ScenarioCompareViewProps {
  snapshots: EscenarioSnapshot[]
  activeRun: EscenarioSnapshot
  compareBaselineId: string | null
  onChangeBaselineId: (id: string) => void
  onSimulateVariant: () => void
}

export function ScenarioCompareView({
  snapshots,
  activeRun,
  compareBaselineId,
  onChangeBaselineId,
  onSimulateVariant,
}: ScenarioCompareViewProps) {
  const otherSnapshots = useMemo(
    () => snapshots.filter((s) => s.id !== activeRun.id),
    [activeRun.id, snapshots],
  )

  const baseline = useMemo(() => {
    if (otherSnapshots.length === 0) return null
    return otherSnapshots.find((s) => s.id === compareBaselineId) ?? otherSnapshots[0]
  }, [compareBaselineId, otherSnapshots])

  const comparison = useMemo(
    () => (baseline ? compareSnapshots(baseline, activeRun) : null),
    [activeRun, baseline],
  )

  if (!baseline || !comparison) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <GitCompareArrows className="mb-2.5 size-7 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Compara esta simulación contra una variante
        </h3>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Actualmente tienes 1 simulación en memoria ({activeRun.label}). Vuelve a Supuestos, ajusta las bandas o el alcance y calcula una segunda simulación para compararlas lado a lado semana por semana.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onSimulateVariant}
        >
          <SlidersHorizontal className="size-3.5" />
          Ajustar y simular variante
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
      {/* Selector de escenario base */}
      <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Comparador de escenarios en sesión
          </h3>
          <p className="text-xs text-muted-foreground">
            Compara la simulación activa contra otra simulación guardada en memoria durante esta sesión.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="proy-compare-base" className="text-[11px] text-muted-foreground">
              Escenario de referencia (A)
            </Label>
            <Select
              value={baseline.id}
              onValueChange={(v) => {
                if (v) onChangeBaselineId(v)
              }}
            >
              <SelectTrigger id="proy-compare-base" size="sm" className="min-w-[220px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {otherSnapshots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={onSimulateVariant}>
            <SlidersHorizontal className="size-3.5" />
            Nueva variante
          </Button>
        </div>
      </div>

      {/* Resumen comparativo */}
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="space-y-0.5 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">Referencia (A): {baseline.label}</p>
          <p className="metric-value font-mono text-lg font-semibold text-foreground">
            {formatTons(comparison.totalBaseA)} t
          </p>
          <p className="metric-value font-mono text-[11px] text-muted-foreground">
            {formatKg(comparison.totalBaseA, 0)} kg base
          </p>
        </div>
        <div className="space-y-0.5 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">Actual (B): {activeRun.label}</p>
          <p className="metric-value font-mono text-lg font-semibold text-foreground">
            {formatTons(comparison.totalBaseB)} t
          </p>
          <p className="metric-value font-mono text-[11px] text-muted-foreground">
            {formatKg(comparison.totalBaseB, 0)} kg base
          </p>
        </div>
        <div className="space-y-0.5 px-5 py-3.5">
          <p className="text-[11px] text-muted-foreground">Diferencia neta (B − A)</p>
          <p
            className={cn(
              'metric-value font-mono text-lg font-semibold',
              comparison.deltaBaseKg > 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : comparison.deltaBaseKg < 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-foreground',
            )}
          >
            {comparison.deltaBaseKg > 0 ? '+' : ''}
            {formatKg(comparison.deltaBaseKg, 1)} kg
          </p>
          <p className="metric-value font-mono text-[11px] text-muted-foreground">
            {comparison.deltaBasePct !== null
              ? `${comparison.deltaBasePct > 0 ? '+' : ''}${comparison.deltaBasePct.toFixed(2)}% sobre referencia`
              : 'Sin base porcentual'}
          </p>
        </div>
      </div>

      {/* Tabla comparativa semana a semana */}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Semana</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Ref. A (kg)</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Actual B (kg)</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Δ kg</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Δ %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {comparison.semanas.map((row) => (
              <tr key={row.semana}>
                <td className="px-4 py-2 font-mono font-medium text-foreground">
                  {row.semana_label}
                </td>
                <td className="metric-value px-4 py-2 text-right font-mono text-muted-foreground">
                  {formatKg(row.kg_base_a, 2)}
                </td>
                <td className="metric-value px-4 py-2 text-right font-mono font-semibold text-foreground">
                  {formatKg(row.kg_base_b, 2)}
                </td>
                <td
                  className={cn(
                    'metric-value px-4 py-2 text-right font-mono',
                    row.delta_kg > 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : row.delta_kg < 0
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-muted-foreground',
                  )}
                >
                  {row.delta_kg > 0 ? '+' : ''}
                  {formatKg(row.delta_kg, 2)}
                </td>
                <td className="metric-value px-4 py-2 text-right font-mono text-muted-foreground">
                  {row.delta_pct !== null
                    ? `${row.delta_pct > 0 ? '+' : ''}${row.delta_pct.toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
