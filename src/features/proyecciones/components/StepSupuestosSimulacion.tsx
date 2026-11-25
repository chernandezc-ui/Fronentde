import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  FlaskConical,
  Loader2,
  Play,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { SEMANAS_SIXWEEK_KEYS } from '@/features/configuracion/matrizUtils'
import type { BiologiaConstantes } from '@/features/configuracion/types'
import {
  DEFAULT_MARGEN_OPTIMISTA,
  DEFAULT_MARGEN_PESIMISTA,
} from '../proyeccionesUtils'
import { formatMarginPctDelta } from '../proyeccionesWorkflow'
import type { OrigenMatrizProyeccion } from '../types'

interface StepSupuestosSimulacionProps {
  margenPesimistaStr: string
  margenOptimistaStr: string
  margenError: string | null
  onMargenPesimistaChange: (value: string) => void
  onMargenOptimistaChange: (value: string) => void
  onApplyPreset: (pesimista: number, optimista: number) => void
  constantesActivas: BiologiaConstantes
  origenMatriz: OrigenMatrizProyeccion
  isLoadingMatriz: boolean
  canExecute: boolean
  canRunNow: boolean
  isRunning: boolean
  simularEndpointPending: boolean
  onBack: () => void
  onOpenMatrizSheet: () => void
  onSimulate: () => void
  onFallbackPublish: () => void
}

const PRESETS = [
  {
    label: 'Estándar ACP (−0.9% / +1.1%)',
    pes: DEFAULT_MARGEN_PESIMISTA,
    opt: DEFAULT_MARGEN_OPTIMISTA,
  },
  { label: 'Banda ±5%', pes: 0.95, opt: 1.05 },
  { label: 'Banda ±10%', pes: 0.9, opt: 1.1 },
] as const

export function StepSupuestosSimulacion({
  margenPesimistaStr,
  margenOptimistaStr,
  margenError,
  onMargenPesimistaChange,
  onMargenOptimistaChange,
  onApplyPreset,
  constantesActivas,
  origenMatriz,
  isLoadingMatriz,
  canExecute,
  canRunNow,
  isRunning,
  simularEndpointPending,
  onBack,
  onOpenMatrizSheet,
  onSimulate,
  onFallbackPublish,
}: StepSupuestosSimulacionProps) {
  const pesNum = Number(margenPesimistaStr.trim().replace(',', '.'))
  const optNum = Number(margenOptimistaStr.trim().replace(',', '.'))

  return (
    <section
      aria-label="Paso 2: Ajustar supuestos y calcular simulación"
      className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border"
    >
      {/* Cabecera */}
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Ajusta las bandas del escenario y verifica los supuestos biológicos
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          La simulación calcula las 6 semanas en memoria sin modificar la proyección oficial ni los reportes.
        </p>
      </div>

      {/* Cuerpo en 2 columnas equilibradas sin tarjetas anidadas */}
      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-12 lg:divide-x lg:divide-y-0">
        {/* Columna izquierda: Bandas pesimista / optimista */}
        <div className="space-y-4 px-5 py-4 lg:col-span-6">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-foreground">
              Bandas de sensibilidad sobre la cosecha base
            </h3>
            <p className="text-xs text-muted-foreground">
              Elige un rango sugerido o ingresa factores exactos (1.00 = 100% del cálculo base).
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const isSelected =
                Number.isFinite(pesNum) &&
                Number.isFinite(optNum) &&
                Math.abs(pesNum - preset.pes) < 1e-6 &&
                Math.abs(optNum - preset.opt) < 1e-6
              return (
                <Button
                  key={preset.label}
                  type="button"
                  variant={isSelected ? 'secondary' : 'outline'}
                  size="xs"
                  disabled={!canExecute || isRunning}
                  aria-pressed={isSelected}
                  onClick={() => onApplyPreset(preset.pes, preset.opt)}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="proy-margen-pes" className="text-xs">
                  Factor pesimista
                </Label>
                <span className="metric-value font-mono text-[11px] text-muted-foreground">
                  {formatMarginPctDelta(pesNum)}
                </span>
              </div>
              <Input
                id="proy-margen-pes"
                type="number"
                step="0.0001"
                min={0}
                max={5}
                aria-invalid={Boolean(margenError)}
                aria-describedby={margenError ? 'proy-margen-error' : undefined}
                value={margenPesimistaStr}
                onChange={(e) => onMargenPesimistaChange(e.target.value)}
                disabled={!canExecute || isRunning}
                className="font-mono text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="proy-margen-opt" className="text-xs">
                  Factor optimista
                </Label>
                <span className="metric-value font-mono text-[11px] text-muted-foreground">
                  {formatMarginPctDelta(optNum)}
                </span>
              </div>
              <Input
                id="proy-margen-opt"
                type="number"
                step="0.0001"
                min={0}
                max={5}
                aria-invalid={Boolean(margenError)}
                aria-describedby={margenError ? 'proy-margen-error' : undefined}
                value={margenOptimistaStr}
                onChange={(e) => onMargenOptimistaChange(e.target.value)}
                disabled={!canExecute || isRunning}
                className="font-mono text-xs tabular-nums"
              />
            </div>
          </div>

          {margenError && (
            <p
              id="proy-margen-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs font-medium text-destructive"
            >
              <AlertTriangle className="size-3.5 shrink-0" />
              {margenError}
            </p>
          )}
        </div>

        {/* Columna derecha: Resumen compacto de supuestos biológicos (tabla 7x6 va en Sheet) */}
        <div className="space-y-3.5 px-5 py-4 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground">
                Supuestos biológicos vigentes
              </h3>
            </div>
            <StatusBadge
              label={
                isLoadingMatriz
                  ? 'Cargando'
                  : origenMatriz === 'backend'
                    ? 'Matriz oficial'
                    : 'Matriz estándar'
              }
              tone={origenMatriz === 'backend' ? 'ok' : 'pending'}
              showDot={false}
            />
          </div>

          <dl className="grid gap-2 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
              <dt className="text-muted-foreground">Distribución de maduración</dt>
              <dd className="font-medium text-foreground">7 estados fenológicos × W1–W6</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
              <dt className="text-muted-foreground">Plantas por punto de muestreo</dt>
              <dd className="metric-value font-mono font-medium text-foreground">
                {constantesActivas.plantas_por_punto} plantas
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Retención semanal (W1–W6)</dt>
              <dd className="metric-value font-mono text-foreground">
                {SEMANAS_SIXWEEK_KEYS.map((wk) => constantesActivas.decay_factor[wk]).join(' · ')}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onOpenMatrizSheet}
            >
              Ver matriz 7×6 y constantes
            </Button>
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<Link to="/configuracion?tab=biologia" />}
            >
              Editar en Configuración
              <ArrowUpRight className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contingencia transparente si /simular devolvió 404/501 */}
      {simularEndpointPending && canExecute && (
        <div
          role="status"
          className="flex flex-col gap-2 bg-amber-500/[0.06] px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-amber-800 dark:text-amber-200">
            El servidor actual aún no habilitó el cálculo en memoria sin guardado. Puedes ir directamente a publicar con confirmación explícita.
          </p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onFallbackPublish}
            disabled={!canRunNow || isRunning}
          >
            <Play className="size-3" />
            Ir a publicar
          </Button>
        </div>
      )}

      {/* Pie de paso: única acción primaria */}
      <div className="flex flex-col-reverse gap-2 bg-muted/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={isRunning}>
          <ArrowLeft className="size-3.5" />
          Cambiar corte
        </Button>

        {canExecute ? (
          <Button
            type="button"
            size="sm"
            onClick={onSimulate}
            disabled={!canRunNow || isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Calculando simulación…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Calcular simulación
              </>
            )}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Modo solo lectura: requiere rol Analista MDM o superior para simular.
          </span>
        )}
      </div>
    </section>
  )
}
