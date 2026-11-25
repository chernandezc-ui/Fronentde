import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatKg, formatTons, isComparativoAnteriorFijo } from '../proyeccionesUtils'
import type { FilaSemanalProyeccion } from '../types'

interface ProyeccionWeeklyChartProps {
  semanas: FilaSemanalProyeccion[]
}

export function ProyeccionWeeklyChart({ semanas }: ProyeccionWeeklyChartProps) {
  const comparativoFijo = isComparativoAnteriorFijo(semanas)
  const totalBase = useMemo(
    () => semanas.reduce((acc, s) => acc + s.kg_proyectados, 0),
    [semanas],
  )
  const totalPes = useMemo(
    () => semanas.reduce((acc, s) => acc + s.kg_pesimista, 0),
    [semanas],
  )
  const totalOpt = useMemo(
    () => semanas.reduce((acc, s) => acc + s.kg_optimista, 0),
    [semanas],
  )
  const avgWeekly = semanas.length > 0 ? totalBase / semanas.length : 0

  const peakWeek = useMemo(() => {
    if (semanas.length === 0) return null
    return semanas.reduce(
      (best, cur) => (cur.kg_proyectados > best.kg_proyectados ? cur : best),
      semanas[0],
    )
  }, [semanas])

  const maxVal = Math.max(
    1,
    ...semanas.map((s) => Math.max(s.kg_proyectados, s.kg_optimista, s.kg_pesimista)),
  )

  const [unit, setUnit] = useState<'kg' | 't'>(() => (maxVal >= 10_000 ? 't' : 'kg'))
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)

  const activeWeekNum = hoveredWeek ?? selectedWeek ?? peakWeek?.semana ?? semanas[0]?.semana ?? null
  const activeWeek = semanas.find((s) => s.semana === activeWeekNum) ?? semanas[0] ?? null

  const formatUnitVal = (kg: number) =>
    unit === 't' ? `${formatTons(kg)} t` : `${formatKg(kg, 0)} kg`

  const chartWidth = 720
  const chartHeight = 232
  const padLeft = 58
  const padRight = 24
  const padTop = 24
  const padBottom = 42
  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  const ticks = [0, 0.33, 0.67, 1].map((ratio) => ({
    ratio,
    value: maxVal * ratio,
    y: padTop + plotH - ratio * plotH,
  }))

  const slotW = semanas.length > 0 ? plotW / semanas.length : plotW
  const barW = Math.min(54, slotW * 0.48)
  const avgY = padTop + plotH - (avgWeekly / maxVal) * plotH

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Curva semanal de cosecha proyectada (W1–W6)
          </h3>
          <p className="text-xs text-muted-foreground">
            {peakWeek
              ? `Pico en W${peakWeek.semana} (${formatUnitVal(peakWeek.kg_proyectados)} · ${
                  totalBase > 0
                    ? `${((peakWeek.kg_proyectados / totalBase) * 100).toFixed(1)}%`
                    : '0%'
                }) · Promedio ${formatUnitVal(avgWeekly)}/sem.`
              : 'Distribución semanal proyectada con banda de sensibilidad.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] bg-[var(--chart-1)]" />
              Base
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-0.5 bg-[var(--chart-2)]" />
              Banda Pes–Opt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-muted-foreground/70" />
              Prom.
            </span>
          </div>

          <div
            role="group"
            aria-label="Unidad de volumen del gráfico"
            className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-[11px]"
          >
            {(['kg', 't'] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => setUnit(u)}
                className={cn(
                  'rounded-sm px-2 py-0.5 font-mono font-medium transition-colors',
                  unit === u
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Franja inspectora interactiva (hover / click / teclado) */}
      {activeWeek && (
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 bg-muted/20 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-foreground">
              W{activeWeek.semana}
            </span>
            <span className="font-mono text-muted-foreground">
              {activeWeek.fecha_semana || activeWeek.semana_label}
            </span>
            {peakWeek?.semana === activeWeek.semana && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                Pico
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] metric-value">
            <span className="text-foreground">
              Base: <strong>{formatKg(activeWeek.kg_proyectados, 1)} kg</strong> (
              {totalBase > 0
                ? `${((activeWeek.kg_proyectados / totalBase) * 100).toFixed(1)}%`
                : '0%'}
              )
            </span>
            <span className="text-muted-foreground">
              Pes: {formatKg(activeWeek.kg_pesimista, 1)} kg
            </span>
            <span className="text-muted-foreground">
              Opt: {formatKg(activeWeek.kg_optimista, 1)} kg
            </span>
            {!comparativoFijo && (
              <span
                className={cn(
                  activeWeek.pct_variacion > 0.5
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : activeWeek.pct_variacion < -0.5
                      ? 'text-rose-700 dark:text-rose-300'
                      : 'text-muted-foreground',
                )}
              >
                Vs. ant: {activeWeek.pct_variacion > 0 ? '+' : ''}
                {activeWeek.pct_variacion.toFixed(1)}% ({activeWeek.tendencia})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Gráfico SVG limpio sin recuadro interior */}
      <div
        className="min-w-0 overflow-x-auto px-5 pt-4 pb-3"
        tabIndex={0}
        aria-label="Gráfico interactivo de proyección semanal W1 a W6"
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-56 w-full min-w-[460px]"
          role="img"
          aria-label="Proyección semanal de kilogramos para W1 a W6"
        >
          <title>Curva semanal de cosecha proyectada de W1 a W6</title>

          {ticks.map((tick) => (
            <g key={tick.ratio}>
              <line
                x1={padLeft}
                x2={chartWidth - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                strokeOpacity={tick.ratio === 0 ? 0.22 : 0.1}
                strokeDasharray={tick.ratio === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {unit === 't'
                  ? `${(tick.value / 1000).toFixed(1)}t`
                  : `${Math.round(tick.value)}`}
              </text>
            </g>
          ))}

          {/* Línea de promedio semanal */}
          {avgWeekly > 0 && (
            <g>
              <line
                x1={padLeft}
                x2={chartWidth - padRight}
                y1={avgY}
                y2={avgY}
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
            </g>
          )}

          {/* Barras interactivas + banda Pes–Opt */}
          {semanas.map((s, idx) => {
            const cx = padLeft + idx * slotW + slotW / 2
            const barH = (s.kg_proyectados / maxVal) * plotH
            const barY = padTop + plotH - barH
            const rawYOpt = padTop + plotH - (s.kg_optimista / maxVal) * plotH
            const rawYPes = padTop + plotH - (s.kg_pesimista / maxVal) * plotH
            const hasSpread = s.kg_optimista > s.kg_pesimista
            const minVisualSpread = hasSpread && rawYPes - rawYOpt < 6
            const yOpt = minVisualSpread ? barY - 3 : rawYOpt
            const yPes = minVisualSpread ? barY + 3 : rawYPes

            const isActive = activeWeek?.semana === s.semana
            const hasHover = hoveredWeek !== null || selectedWeek !== null

            return (
              <g
                key={s.semana}
                role="button"
                tabIndex={0}
                aria-label={`Semana ${s.semana}: base ${formatKg(s.kg_proyectados, 0)} kg`}
                onMouseEnter={() => setHoveredWeek(s.semana)}
                onMouseLeave={() => setHoveredWeek(null)}
                onFocus={() => setHoveredWeek(s.semana)}
                onBlur={() => setHoveredWeek(null)}
                onClick={() =>
                  setSelectedWeek((prev) => (prev === s.semana ? null : s.semana))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedWeek((prev) => (prev === s.semana ? null : s.semana))
                  }
                }}
                className="cursor-pointer outline-none"
              >
                {/* Hit target completo + guía vertical */}
                <rect
                  x={padLeft + idx * slotW + 4}
                  y={padTop - 4}
                  width={Math.max(20, slotW - 8)}
                  height={plotH + 8}
                  rx={6}
                  className={isActive ? 'fill-muted/55' : 'fill-transparent'}
                />

                {/* Barra Base usando token --chart-1 */}
                <rect
                  x={cx - barW / 2}
                  y={barY}
                  width={barW}
                  height={Math.max(2, barH)}
                  rx={4}
                  style={{ fill: 'var(--chart-1)' }}
                  className={cn(
                    'transition-opacity duration-150',
                    hasHover && !isActive ? 'opacity-45' : 'opacity-90',
                  )}
                />

                {/* Banda pesimista - optimista usando token --chart-2 */}
                {hasSpread && (
                  <g style={{ stroke: 'var(--chart-2)' }} strokeWidth="1.75">
                    <line x1={cx} x2={cx} y1={yOpt} y2={yPes} />
                    <line x1={cx - 7} x2={cx + 7} y1={yOpt} y2={yOpt} />
                    <line x1={cx - 7} x2={cx + 7} y1={yPes} y2={yPes} />
                  </g>
                )}

                {/* Cifra sobre barra */}
                <text
                  x={cx}
                  y={Math.max(12, Math.min(barY, yOpt) - 8)}
                  textAnchor="middle"
                  className={cn(
                    'font-mono text-[10.5px] font-medium',
                    isActive ? 'fill-foreground font-semibold' : 'fill-muted-foreground',
                  )}
                >
                  {unit === 't'
                    ? `${(s.kg_proyectados / 1000).toFixed(1)}t`
                    : formatKg(s.kg_proyectados, 0)}
                </text>

                {/* Eje X */}
                <text
                  x={cx}
                  y={chartHeight - 20}
                  textAnchor="middle"
                  className={cn(
                    'font-mono text-[11px]',
                    isActive ? 'fill-foreground font-semibold' : 'fill-muted-foreground',
                  )}
                >
                  W{s.semana}
                </text>
                <text
                  x={cx}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[9.5px]"
                >
                  {s.fecha_semana ? s.fecha_semana.slice(5) : ''}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Tabla semanal sincronizada integrada */}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Semana objetivo</th>
              <th className="px-4 py-2 text-left font-medium">Participación</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Pesimista (kg)</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Base (kg)</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Optimista (kg)</th>
              <th className="px-4 py-2 text-right font-mono font-medium">Vs. Anterior</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {semanas.map((s) => {
              const pct = totalBase > 0 ? (s.kg_proyectados / totalBase) * 100 : 0
              const isActive = activeWeek?.semana === s.semana
              return (
                <tr
                  key={s.semana}
                  onMouseEnter={() => setHoveredWeek(s.semana)}
                  onMouseLeave={() => setHoveredWeek(null)}
                  onClick={() =>
                    setSelectedWeek((prev) => (prev === s.semana ? null : s.semana))
                  }
                  className={cn(
                    'cursor-pointer transition-colors',
                    isActive ? 'bg-muted/45' : 'hover:bg-muted/25',
                  )}
                >
                  <td className="px-4 py-2 font-mono">
                    <span className="font-semibold text-foreground">W{s.semana}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {s.fecha_semana || s.semana_label}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            backgroundColor: 'var(--chart-1)',
                          }}
                        />
                      </div>
                      <span className="metric-value w-11 text-right font-mono text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="metric-value px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatKg(s.kg_pesimista, 2)}
                  </td>
                  <td className="metric-value px-4 py-2 text-right font-mono font-semibold text-foreground">
                    {formatKg(s.kg_proyectados, 2)}
                  </td>
                  <td className="metric-value px-4 py-2 text-right font-mono text-muted-foreground">
                    {formatKg(s.kg_optimista, 2)}
                  </td>
                  <td className="metric-value px-4 py-2 text-right font-mono">
                    {comparativoFijo ? (
                      <span className="text-muted-foreground/60">No disponible</span>
                    ) : (
                      <span
                        className={cn(
                          s.pct_variacion > 0.5
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : s.pct_variacion < -0.5
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-muted-foreground',
                        )}
                      >
                        {s.pct_variacion > 0 ? '+' : ''}
                        {s.pct_variacion.toFixed(1)}% ({s.tendencia})
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/25 font-semibold">
              <td className="px-4 py-2.5 text-foreground">Total 6 semanas</td>
              <td className="metric-value px-4 py-2.5 font-mono text-muted-foreground">100.0%</td>
              <td className="metric-value px-4 py-2.5 text-right font-mono text-muted-foreground">
                {formatKg(totalPes, 2)}
              </td>
              <td className="metric-value px-4 py-2.5 text-right font-mono text-foreground">
                {formatKg(totalBase, 2)}
              </td>
              <td className="metric-value px-4 py-2.5 text-right font-mono text-muted-foreground">
                {formatKg(totalOpt, 2)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-muted-foreground/60">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {comparativoFijo && (
        <div className="bg-muted/15 px-5 py-2 text-[11px] text-muted-foreground">
          No se encontró proyección publicada previa para estas semanas objetivo; el comparativo histórico se muestra como <strong>No disponible</strong>.
        </div>
      )}
    </div>
  )
}
