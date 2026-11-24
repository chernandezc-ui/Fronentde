import {
  Activity,
  AlertOctagon,
  CalendarRange,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { formatNumber } from '@/shared/lib/format'
import { VENTANA_RESUMEN_OPTIONS } from '../auditoriaUtils'
import type { RespuestaResumenBitacora, VentanaResumenDias } from '../types'

interface BitacoraKpiGridProps {
  ventanaDias: VentanaResumenDias
  onVentanaChange: (ventana: VentanaResumenDias) => void
  resumen: RespuestaResumenBitacora | undefined
  isLoading: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  onQuickFilterError?: () => void
}

function getVentanaLabel(ventana: VentanaResumenDias): string {
  return VENTANA_RESUMEN_OPTIONS.find((opt) => opt.value === ventana)?.label ?? `${ventana} días`
}

export function BitacoraKpiGrid({
  ventanaDias,
  onVentanaChange,
  resumen,
  isLoading,
  isFetching,
  isPlaceholderData,
  isError,
  error,
  onRetry,
  onQuickFilterError,
}: BitacoraKpiGridProps) {
  const ventanaLabel = getVentanaLabel(ventanaDias)
  const hasData = !isError && resumen !== undefined
  const hasExecutions = hasData && resumen.total > 0

  const tasaToneClass = !hasExecutions
    ? 'text-muted-foreground'
    : resumen.tasa_exito_pct >= 95
      ? 'text-emerald-600 dark:text-emerald-400'
      : resumen.tasa_exito_pct >= 80
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'

  return (
    <section aria-label="Resumen KPI de bitácora" className="space-y-3">
      {/* Barra superior de ventana temporal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarRange className="size-3.5" />
            <span>Ventana de resumen</span>
          </div>
          {isFetching && isPlaceholderData && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Actualizando KPIs…
            </span>
          )}
          {hasData && !hasExecutions && !isLoading && (
            <span className="rounded-md border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground">
              Sin ejecuciones en {ventanaLabel}
            </span>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Seleccionar ventana temporal de KPIs"
          className="inline-flex w-fit flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
        >
          {VENTANA_RESUMEN_OPTIONS.map((opt) => {
            const selected = opt.value === ventanaDias
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onVentanaChange(opt.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Error explícito al cargar resumen */}
      {isError && (
        <ApiErrorBanner
          error={error}
          title="No se pudo consultar el resumen agregado de bitácora (/api/v1/auditoria/bitacora/resumen)"
          onRetry={onRetry}
        />
      )}

      {/* 5 KPIs honestos con tabular-nums */}
      <div
        className={cn(
          'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5',
          isPlaceholderData && !isError && 'opacity-75 transition-opacity',
        )}
      >
        {/* 1. Total ejecuciones */}
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-2 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total ejecuciones</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : isError ? (
                <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error</p>
              ) : !hasData ? (
                <p className="text-base font-semibold text-muted-foreground">Sin datos</p>
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums">
                  {formatNumber(resumen.total)}
                </p>
              )}
              <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                {isError
                  ? 'Consulta fallida'
                  : hasExecutions
                    ? `${formatNumber(resumen.ok)} OK · ${formatNumber(resumen.en_proceso)} en curso`
                    : `Ventana: ${ventanaLabel}`}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <Activity className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Tasa de éxito % */}
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-2 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tasa de éxito</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : isError ? (
                <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error</p>
              ) : !hasExecutions ? (
                <p className="text-base font-semibold text-muted-foreground">Sin datos</p>
              ) : (
                <p
                  className={cn(
                    'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                    tasaToneClass,
                  )}
                >
                  {(Number.isFinite(resumen.tasa_exito_pct) ? resumen.tasa_exito_pct : 0).toFixed(1)}%
                </p>
              )}
              <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                {isError
                  ? 'No disponible'
                  : hasExecutions
                    ? `${formatNumber(resumen.ok)} / ${formatNumber(resumen.total)} cargas OK`
                    : 'Sin base de cálculo'}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <CheckCircle2
                className={cn(
                  'size-4',
                  hasExecutions ? tasaToneClass : 'text-muted-foreground',
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Errores */}
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-2 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Errores</p>
              {isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : isError ? (
                <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error</p>
              ) : !hasData ? (
                <p className="text-base font-semibold text-muted-foreground">Sin datos</p>
              ) : (
                <p
                  className={cn(
                    'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                    resumen.errores > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground',
                  )}
                >
                  {formatNumber(resumen.errores)}
                </p>
              )}
              <div className="flex items-center gap-1.5">
                {isError ? (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="h-auto p-0 text-[11px]"
                    onClick={onRetry}
                  >
                    <RefreshCw className="size-3" />
                    Reintentar
                  </Button>
                ) : hasExecutions && resumen.errores > 0 && onQuickFilterError ? (
                  <button
                    type="button"
                    onClick={onQuickFilterError}
                    className="text-[11px] font-medium text-rose-600 underline-offset-4 hover:underline dark:text-rose-400"
                  >
                    Filtrar ERROR →
                  </button>
                ) : (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {hasExecutions ? 'Sin fallos en ventana' : 'Sin ejecuciones'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <AlertOctagon
                className={cn(
                  'size-4',
                  hasData && resumen.errores > 0
                    ? 'text-rose-500'
                    : 'text-muted-foreground',
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Filas insertadas */}
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-2 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Filas insertadas</p>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : isError ? (
                <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error</p>
              ) : !hasExecutions ? (
                <p className="text-base font-semibold text-muted-foreground">Sin datos</p>
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums">
                  {formatNumber(resumen.filas_ok)}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                {isError
                  ? 'No disponible'
                  : hasExecutions
                    ? `Insertadas (${ventanaLabel})`
                    : 'Sin cargas registradas'}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <Database className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* 5. Filas rechazadas */}
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-2 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Filas rechazadas</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : isError ? (
                <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Error</p>
              ) : !hasExecutions ? (
                <p className="text-base font-semibold text-muted-foreground">Sin datos</p>
              ) : (
                <p
                  className={cn(
                    'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                    resumen.filas_rechazadas > 0 && 'text-amber-600 dark:text-amber-400',
                  )}
                >
                  {formatNumber(resumen.filas_rechazadas)}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                {isError
                  ? 'No disponible'
                  : hasExecutions
                    ? resumen.filas_rechazadas > 0
                      ? 'Rechazos registrados'
                      : 'Sin rechazos en cargas'
                    : 'Sin cargas registradas'}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldAlert
                className={cn(
                  'size-4',
                  hasExecutions && resumen.filas_rechazadas > 0
                    ? 'text-amber-500'
                    : 'text-muted-foreground',
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
