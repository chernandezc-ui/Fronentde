import { AlertTriangle, Calendar, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatIdTiempo } from '../proyeccionesUtils'
import { formatMarginPctDelta } from '../proyeccionesWorkflow'
import type {
  FiltrosProyeccionUrl,
  IntegridadProyeccion,
  ProyeccionLifecycle,
  ProyeccionStepId,
} from '../types'

interface ProyeccionContextStripProps {
  effectiveFecha: number | null
  filters: FiltrosProyeccionUrl
  integridad: IntegridadProyeccion | undefined
  margenPesimista: number | null
  margenOptimista: number | null
  lifecycle: ProyeccionLifecycle
  isStale: boolean
  canExecute: boolean
  isRunning: boolean
  onNavigateStep: (step: ProyeccionStepId) => void
  onRecalculate: () => void
}

export function ProyeccionContextStrip({
  effectiveFecha,
  filters,
  integridad,
  margenPesimista,
  margenOptimista,
  lifecycle,
  isStale,
  canExecute,
  isRunning,
  onNavigateStep,
  onRecalculate,
}: ProyeccionContextStripProps) {
  const alcanceLabel =
    [
      filters.fundo || null,
      filters.modulo ? `Mód ${filters.modulo}` : null,
      filters.variedad || null,
      filters.condicion || null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Todos los fundos'

  const fuentesOk = integridad
    ? [integridad.conteo, integridad.peladas, integridad.pesos].filter(Boolean).length
    : null

  const lifecycleBadge =
    lifecycle === 'publicado'
      ? { label: 'Versión publicada', tone: 'ok' as const }
      : lifecycle === 'simulado'
        ? { label: 'Borrador simulado', tone: 'running' as const }
        : lifecycle === 'desactualizado'
          ? { label: 'Desactualizado', tone: 'warning' as const }
          : { label: 'En preparación', tone: 'neutral' as const }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={() => onNavigateStep('corte')}
          className="inline-flex min-w-0 items-center gap-1.5 text-left text-muted-foreground transition-colors hover:text-foreground"
        >
          <Calendar className="size-3.5 shrink-0" />
          <span className="font-mono font-medium text-foreground">
            {formatIdTiempo(effectiveFecha, true)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateStep('corte')}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-left text-muted-foreground transition-colors hover:text-foreground"
        >
          <Filter className="size-3.5 shrink-0" />
          <span className="truncate">{alcanceLabel}</span>
        </button>

        {fuentesOk !== null && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${
                !integridad?.conteo
                  ? 'bg-rose-500'
                  : fuentesOk === 3
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
              }`}
            />
            <span>Datos de campo: {fuentesOk}/3</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => onNavigateStep('supuestos')}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5 shrink-0" />
          <span className="metric-value font-mono">
            {margenPesimista !== null && margenOptimista !== null
              ? `${formatMarginPctDelta(margenPesimista)} / ${formatMarginPctDelta(margenOptimista)}`
              : 'Bandas inválidas'}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={lifecycleBadge.label} tone={lifecycleBadge.tone} />
        {isStale && canExecute && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onRecalculate}
            disabled={isRunning}
          >
            <RefreshCw className={`size-3 ${isRunning ? 'animate-spin' : ''}`} />
            Recalcular
          </Button>
        )}
      </div>

      {isStale && (
        <div
          role="status"
          className="flex w-full items-center gap-2 border-t border-amber-500/25 pt-2 text-[11px] text-amber-800 dark:text-amber-200"
        >
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Modificaste fecha, filtros o supuestos desde el último cálculo. Recalcula la simulación antes de publicar para que los datos coincidan.
          </span>
        </div>
      )}
    </div>
  )
}
