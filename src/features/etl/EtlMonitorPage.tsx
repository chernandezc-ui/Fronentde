import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  History,
  Layers,
  ListChecks,
  Play,
  Radio,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/shared/auth/authStore'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import { FactsCatalogGrid } from './components/FactsCatalogGrid'
import { LaunchRunDialog } from './components/LaunchRunDialog'
import { LiveRunPanel } from './components/LiveRunPanel'
import { RunHistoryTable } from './components/RunHistoryTable'
import { TablePreviewSheet } from './components/TablePreviewSheet'
import {
  etlQueryKeys,
  useActiveRuns,
  useEtlSummary,
  useFactsCatalog,
  useRecentFailures,
  useRunHistory,
} from './useEtlQueries'
import type { CorridaActiva, CorridaIniciada, FactDisponible, HistorialCorrida } from './types'

type MonitorTab = 'monitor' | 'history' | 'catalog'

const EMPTY_ACTIVE_RUNS: CorridaActiva[] = []
const EMPTY_HISTORY: HistorialCorrida[] = []
const EMPTY_FACTS: FactDisponible[] = []

export function EtlMonitorPage() {
  const queryClient = useQueryClient()
  const canOperate = useAuthStore((state) => state.hasRole('operador_etl'))

  const [activeTab, setActiveTab] = useState<MonitorTab>('monitor')
  const [historyLimit, setHistoryLimit] = useState<number>(50)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [launchDialogOpen, setLaunchDialogOpen] = useState(false)
  const [preselectedFacts, setPreselectedFacts] = useState<string[] | undefined>(undefined)
  const [previewTable, setPreviewTable] = useState<string | null>(null)

  const summaryQuery = useEtlSummary()
  const failuresQuery = useRecentFailures(24)
  const activeRunsQuery = useActiveRuns(50)
  const historyQuery = useRunHistory(historyLimit)
  const factsQuery = useFactsCatalog()

  const activeRuns = activeRunsQuery.data ?? EMPTY_ACTIVE_RUNS
  const historyRows = historyQuery.data ?? EMPTY_HISTORY
  const facts = factsQuery.data ?? EMPTY_FACTS

  // Derive effective run: manual selection wins, otherwise auto-focus first active run
  const effectiveRunId = selectedRunId ?? activeRuns[0]?.id_corrida ?? null

  // Recent unique run UUIDs from history to allow quick inspection from the Live Monitor dropdown
  const recentInspectableRuns = useMemo(() => {
    const activeIds = new Set(activeRuns.map((r) => r.id_corrida))
    const seen = new Set<string>()
    const result: { id_corrida: string; label: string; estado: string }[] = []

    for (const row of historyRows) {
      if (!row.id_corrida || activeIds.has(row.id_corrida) || seen.has(row.id_corrida)) continue
      seen.add(row.id_corrida)
      result.push({
        id_corrida: row.id_corrida,
        label: `${row.id_corrida.slice(0, 8)} · ${row.nombre_proceso}`,
        estado: row.estado,
      })
      if (result.length >= 12) break
    }
    return result
  }, [activeRuns, historyRows])

  const handleOpenLaunchAll = useCallback(() => {
    setPreselectedFacts(undefined)
    setLaunchDialogOpen(true)
  }, [])

  const handleReprocessFacts = useCallback((factNames: string[]) => {
    setPreselectedFacts(factNames)
    setLaunchDialogOpen(true)
  }, [])

  const handleLaunched = useCallback((corrida: CorridaIniciada) => {
    setSelectedRunId(corrida.id_corrida)
    setActiveTab('monitor')
  }, [])

  const handleInspectRun = useCallback((idCorrida: string) => {
    setSelectedRunId(idCorrida)
    setActiveTab('monitor')
  }, [])

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: etlQueryKeys.all })
  }, [queryClient])

  const isRefreshingAny =
    summaryQuery.isFetching ||
    activeRunsQuery.isFetching ||
    failuresQuery.isFetching

  const activeCount = summaryQuery.data?.corridas_activas ?? activeRuns.length
  const pendingCmds = summaryQuery.data?.comandos_pendientes ?? 0
  const processingCmds = summaryQuery.data?.comandos_procesando ?? 0
  const recentFailuresCount = failuresQuery.data?.fallos ?? 0

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Monitor y Control ETL</h1>
            {!canOperate && <StatusBadge label="Solo lectura" tone="readonly" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Control-plane del pipeline Bronce → Silver → Gold, trazabilidad en vivo vía SSE y reproceso dirigido de facts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshingAny}
          >
            <RefreshCw className={cn('size-3.5', isRefreshingAny && 'animate-spin')} />
            Actualizar
          </Button>

          {canOperate && (
            <Button size="sm" onClick={handleOpenLaunchAll}>
              <Play className="size-3.5" />
              Lanzar corrida ETL
            </Button>
          )}
        </div>
      </div>

      {/* Top-level control-plane error if summary fails */}
      {summaryQuery.isError && (
        <ApiErrorBanner
          error={summaryQuery.error}
          title="No se pudo consultar el resumen del control-plane ETL"
          onRetry={() => void summaryQuery.refetch()}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Corridas activas</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
                  {formatNumber(activeCount)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Polling automático cada 5s
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <Activity
                  className={cn(
                    'size-4',
                    activeCount > 0 ? 'text-sky-500' : 'text-muted-foreground',
                  )}
                />
              </div>
              <StatusBadge
                label={activeCount > 0 ? 'EJECUTANDO' : 'LIBRE'}
                tone={activeCount > 0 ? 'running' : 'ok'}
              />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cola del runner</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-2xl font-semibold tracking-tight">
                    {formatNumber(pendingCmds + processingCmds)}
                  </span>
                  <span className="text-xs text-muted-foreground">comandos</span>
                </div>
              )}
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {formatNumber(pendingCmds)} pendientes · {formatNumber(processingCmds)} procesando
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <ListChecks className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Fallos recientes (24h)</p>
              {failuresQuery.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p
                  className={cn(
                    'font-mono text-2xl font-semibold tracking-tight tabular-nums',
                    recentFailuresCount > 0 && 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {formatNumber(recentFailuresCount)}
                </p>
              )}
              <p
                className="truncate font-mono text-[11px] text-muted-foreground"
                title={
                  failuresQuery.data?.ultimo_fallo_tabla
                    ? `${failuresQuery.data.ultimo_fallo_tabla} (${formatDateTime(failuresQuery.data.ultimo_fallo_fecha)})`
                    : 'Sin fallos en las últimas 24 horas'
                }
              >
                {failuresQuery.data?.ultimo_fallo_tabla
                  ? `${failuresQuery.data.ultimo_fallo_tabla} · ${formatDateTime(failuresQuery.data.ultimo_fallo_fecha)}`
                  : 'Sin fallos en las últimas 24h'}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <AlertTriangle
                className={cn(
                  'size-4',
                  recentFailuresCount > 0
                    ? 'text-rose-500'
                    : 'text-emerald-600 dark:text-emerald-400',
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Catálogo de Facts</p>
              {factsQuery.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
                  {formatNumber(facts.length)}
                </p>
              )}
              <p className="truncate text-[11px] text-muted-foreground">
                {historyRows[0]
                  ? `Último log: ${historyRows[0].nombre_proceso}`
                  : 'Soportados para rerun dirigido'}
              </p>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
              <Layers className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Operational Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'monitor' || value === 'history' || value === 'catalog') {
            setActiveTab(value)
          }
        }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="monitor" className="gap-1.5 px-3">
              <Radio className="size-3.5" />
              Monitor en vivo
              {activeRuns.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 px-1.5 font-mono text-[10px] tabular-nums"
                >
                  {activeRuns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 px-3">
              <History className="size-3.5" />
              Historial
              {historyRows.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 px-1.5 font-mono text-[10px] tabular-nums"
                >
                  {historyRows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-1.5 px-3">
              <Layers className="size-3.5" />
              Catálogo de Facts
              {facts.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-4 px-1.5 font-mono text-[10px] tabular-nums"
                >
                  {facts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Run selector bar when on Monitor tab */}
          {activeTab === 'monitor' && (activeRuns.length > 0 || recentInspectableRuns.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Corrida:</span>
              <Select
                value={effectiveRunId ?? ''}
                onValueChange={(val) => {
                  if (val) setSelectedRunId(val)
                }}
              >
                <SelectTrigger size="sm" className="min-w-[240px] font-mono text-xs">
                  <SelectValue placeholder="Seleccionar corrida..." />
                </SelectTrigger>
                <SelectContent>
                  {activeRuns.map((run) => (
                    <SelectItem key={run.id_corrida} value={run.id_corrida}>
                      <span className="font-mono text-xs">
                        [ACTIVA] {run.id_corrida.slice(0, 8)} · {run.estado} · {run.iniciado_por}
                      </span>
                    </SelectItem>
                  ))}
                  {recentInspectableRuns.map((run) => (
                    <SelectItem key={run.id_corrida} value={run.id_corrida}>
                      <span className="font-mono text-xs">
                        [{run.estado}] {run.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="monitor" className="space-y-4">
          {/* Active runs quick chips if multiple active runs exist */}
          {activeRuns.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/25 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Activas ahora ({activeRuns.length}):
              </span>
              {activeRuns.map((run) => {
                const isSelected = effectiveRunId === run.id_corrida
                return (
                  <button
                    key={run.id_corrida}
                    type="button"
                    onClick={() => setSelectedRunId(run.id_corrida)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
                    <span>{run.id_corrida.slice(0, 8)}</span>
                    <span className="text-[10px] opacity-75">({run.estado})</span>
                  </button>
                )
              })}
            </div>
          )}

          {activeRunsQuery.isError && (
            <ApiErrorBanner
              error={activeRunsQuery.error}
              title="No se pudo consultar la lista de corridas activas"
              onRetry={() => void activeRunsQuery.refetch()}
            />
          )}

          <LiveRunPanel
            idCorrida={effectiveRunId}
            canOperate={canOperate}
            onLaunchNew={canOperate ? handleOpenLaunchAll : undefined}
          />
        </TabsContent>

        <TabsContent value="history">
          <RunHistoryTable
            rows={historyRows}
            isLoading={historyQuery.isLoading}
            isFetching={historyQuery.isFetching}
            isError={historyQuery.isError}
            error={historyQuery.error}
            limite={historyLimit}
            onLimiteChange={setHistoryLimit}
            onRefresh={() => void historyQuery.refetch()}
            onInspectRun={handleInspectRun}
            onPreviewTable={setPreviewTable}
          />
        </TabsContent>

        <TabsContent value="catalog">
          <FactsCatalogGrid
            facts={facts}
            isLoading={factsQuery.isLoading}
            isFetching={factsQuery.isFetching}
            isError={factsQuery.isError}
            error={factsQuery.error}
            canOperate={canOperate}
            onRefresh={() => void factsQuery.refetch()}
            onReprocessFacts={handleReprocessFacts}
            onPreviewTable={setPreviewTable}
          />
        </TabsContent>
      </Tabs>

      {/* Launch Run Dialog */}
      {canOperate && (
        <LaunchRunDialog
          open={launchDialogOpen}
          onOpenChange={setLaunchDialogOpen}
          facts={facts}
          isLoadingFacts={factsQuery.isLoading}
          initialSelectedFacts={preselectedFacts}
          hasActiveRun={activeCount > 0}
          onLaunched={handleLaunched}
        />
      )}

      {/* Table Preview Sheet */}
      <TablePreviewSheet
        tabla={previewTable}
        onOpenChange={(open) => {
          if (!open) setPreviewTable(null)
        }}
      />
    </div>
  )
}
