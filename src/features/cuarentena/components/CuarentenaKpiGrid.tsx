import {
  AlertTriangle,
  ArchiveX,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Inbox,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import type { CuarentenaResumen, EstadoCuarentenaFiltro } from '../types'

interface CuarentenaKpiGridProps {
  resumen: CuarentenaResumen | undefined
  isLoadingResumen: boolean
  isErrorResumen: boolean
  onRetryResumen: () => void
  candidatos: number | undefined
  isLoadingCandidatos: boolean
  isErrorCandidatos: boolean
  onRetryCandidatos: () => void
  canManageMdm: boolean
  activeEstado: EstadoCuarentenaFiltro
  onSelectEstado: (estado: EstadoCuarentenaFiltro) => void
  onOpenReinjection: () => void
}

function ErrorKpiValue({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="size-4 shrink-0" />
        <span className="text-sm font-semibold">Sin datos / Error</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onRetry}
        className="-ml-2 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="size-3" />
        Reintentar
      </Button>
    </div>
  )
}

export function CuarentenaKpiGrid({
  resumen,
  isLoadingResumen,
  isErrorResumen,
  onRetryResumen,
  candidatos,
  isLoadingCandidatos,
  isErrorCandidatos,
  onRetryCandidatos,
  canManageMdm,
  activeEstado,
  onSelectEstado,
  onOpenReinjection,
}: CuarentenaKpiGridProps) {
  const resumenFailed = !isLoadingResumen && (isErrorResumen || !resumen)
  const candidatosFailed = !isLoadingCandidatos && (isErrorCandidatos || candidatos === undefined)

  const otrosEstadosCount = resumen
    ? Math.max(0, resumen.total - (resumen.pendientes + resumen.resueltos + resumen.descartados))
    : 0

  const pendientesPct =
    resumen && resumen.total > 0 ? Math.round((resumen.pendientes / resumen.total) * 100) : null

  return (
    <section
      aria-label="Indicadores de cuarentena MDM"
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2',
        canManageMdm ? 'lg:grid-cols-3 xl:grid-cols-5' : 'xl:grid-cols-4',
      )}
    >
      {/* KPI 1: Total */}
      {resumenFailed ? (
        <Card size="sm" className="border-rose-500/30">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total cuarentena</p>
              <ErrorKpiValue onRetry={onRetryResumen} />
            </div>
            <StatusBadge label="ERROR" tone="error" />
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => onSelectEstado('all')}
          aria-pressed={activeEstado === 'all'}
          className={cn(
            'group text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl transition-shadow',
          )}
        >
          <Card
            size="sm"
            className={cn(
              'h-full transition-colors group-hover:bg-muted/30',
              activeEstado === 'all' && 'ring-2 ring-primary/50 bg-primary/[0.03]',
            )}
          >
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total cuarentena</p>
                {isLoadingResumen ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums">
                    {formatNumber(resumen?.total)}
                  </p>
                )}
                <p className="truncate text-[11px] text-muted-foreground">
                  {otrosEstadosCount > 0
                    ? `Incluye ${formatNumber(otrosEstadosCount)} reinyectados`
                    : 'Histórico en MDM.Cuarentena'}
                </p>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <Inbox className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </button>
      )}

      {/* KPI 2: Pendientes */}
      {resumenFailed ? (
        <Card size="sm" className="border-rose-500/30">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
              <ErrorKpiValue onRetry={onRetryResumen} />
            </div>
            <StatusBadge label="ERROR" tone="error" />
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => onSelectEstado('PENDIENTE')}
          aria-pressed={activeEstado === 'PENDIENTE'}
          className="group rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card
            size="sm"
            className={cn(
              'h-full transition-colors group-hover:bg-muted/30',
              activeEstado === 'PENDIENTE' && 'ring-2 ring-amber-500/50 bg-amber-500/[0.03]',
            )}
          >
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
                {isLoadingResumen ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p
                    className={cn(
                      'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                      (resumen?.pendientes ?? 0) > 0 && 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {formatNumber(resumen?.pendientes)}
                  </p>
                )}
                <p className="truncate text-[11px] text-muted-foreground">
                  {pendientesPct !== null
                    ? `${pendientesPct}% del total · Por revisar`
                    : 'Requieren decisión MDM'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Clock
                    className={cn(
                      'size-4',
                      (resumen?.pendientes ?? 0) > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                {!isLoadingResumen && resumen && (
                  <StatusBadge
                    label={resumen.pendientes > 0 ? 'ATENCIÓN' : 'AL DÍA'}
                    tone={resumen.pendientes > 0 ? 'pending' : 'ok'}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </button>
      )}

      {/* KPI 3: Resueltos */}
      {resumenFailed ? (
        <Card size="sm" className="border-rose-500/30">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Resueltos</p>
              <ErrorKpiValue onRetry={onRetryResumen} />
            </div>
            <StatusBadge label="ERROR" tone="error" />
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => onSelectEstado('RESUELTO')}
          aria-pressed={activeEstado === 'RESUELTO'}
          className="group rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card
            size="sm"
            className={cn(
              'h-full transition-colors group-hover:bg-muted/30',
              activeEstado === 'RESUELTO' && 'ring-2 ring-emerald-500/50 bg-emerald-500/[0.03]',
            )}
          >
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Resueltos</p>
                {isLoadingResumen ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p
                    className={cn(
                      'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                      (resumen?.resueltos ?? 0) > 0 && 'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {formatNumber(resumen?.resueltos)}
                  </p>
                )}
                <p className="truncate text-[11px] text-muted-foreground">
                  Homologados con valor canónico
                </p>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <CheckCircle2
                  className={cn(
                    'size-4',
                    (resumen?.resueltos ?? 0) > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground',
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </button>
      )}

      {/* KPI 4: Descartados */}
      {resumenFailed ? (
        <Card size="sm" className="border-rose-500/30">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Descartados</p>
              <ErrorKpiValue onRetry={onRetryResumen} />
            </div>
            <StatusBadge label="ERROR" tone="error" />
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => onSelectEstado('DESCARTADO')}
          aria-pressed={activeEstado === 'DESCARTADO'}
          className="group rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card
            size="sm"
            className={cn(
              'h-full transition-colors group-hover:bg-muted/30',
              activeEstado === 'DESCARTADO' && 'ring-2 ring-zinc-500/50 bg-zinc-500/[0.04]',
            )}
          >
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Descartados</p>
                {isLoadingResumen ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums">
                    {formatNumber(resumen?.descartados)}
                  </p>
                )}
                <p className="truncate text-[11px] text-muted-foreground">
                  Excluidos del reproceso ETL
                </p>
              </div>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <ArchiveX className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </button>
      )}

      {/* KPI 5: Candidatos a reinyectar (solo analista_mdm+, evita 403 en viewer) */}
      {canManageMdm && (
        candidatosFailed ? (
          <Card size="sm" className="border-rose-500/30">
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Candidatos a reinyectar</p>
                <ErrorKpiValue onRetry={onRetryCandidatos} />
              </div>
              <StatusBadge label="ERROR" tone="error" />
            </CardContent>
          </Card>
        ) : (
          <button
            type="button"
            onClick={onOpenReinjection}
            className="group rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card
              size="sm"
              className={cn(
                'h-full transition-colors group-hover:bg-muted/30',
                (candidatos ?? 0) > 0 && 'ring-1 ring-sky-500/35 bg-sky-500/[0.03]',
              )}
            >
              <CardContent className="flex items-start justify-between gap-3 py-1">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Candidatos a reinyectar
                  </p>
                  {isLoadingCandidatos ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p
                      className={cn(
                        'metric-value font-mono text-2xl font-semibold tracking-tight tabular-nums',
                        (candidatos ?? 0) > 0 && 'text-sky-600 dark:text-sky-400',
                      )}
                    >
                      {formatNumber(candidatos)}
                    </p>
                  )}
                  <p className="inline-flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    <span>Abrir panel de reinyección</span>
                    <ArrowUpRight className="size-3 shrink-0" />
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                    <RotateCcw
                      className={cn(
                        'size-4',
                        (candidatos ?? 0) > 0
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  {!isLoadingCandidatos && candidatos !== undefined && (
                    <StatusBadge
                      label={candidatos > 0 ? 'LISTOS' : 'EN CERO'}
                      tone={candidatos > 0 ? 'ok' : 'neutral'}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        )
      )}
    </section>
  )
}
