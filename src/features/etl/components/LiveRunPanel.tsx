import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Info,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Search,
  Square,
  Terminal,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { SseStatus } from '@/shared/api/sse'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge, type OperationalTone } from '@/shared/components/StatusBadge'
import { formatDateTime, formatDuration, formatNumber } from '@/shared/lib/format'
import { useCancelRunMutation, useRunDetail } from '../useEtlQueries'
import { useRunEventStream } from '../useRunEventStream'
import {
  computeElapsedSeconds,
  isRunActiveEstado,
  type EtlStreamEvent,
} from '../types'

type LogLevelFilter = 'todos' | 'error' | 'paso'

interface LiveRunPanelProps {
  idCorrida: string | null
  canOperate: boolean
  onLaunchNew?: () => void
}

function getSseBadgeInfo(
  status: SseStatus,
  finished: boolean,
): { label: string; tone: OperationalTone } {
  if (finished) return { label: 'Finalizado', tone: 'ok' }
  switch (status) {
    case 'open':
      return { label: 'Conectado', tone: 'running' }
    case 'connecting':
      return { label: 'Conectando', tone: 'pending' }
    case 'reconnecting':
      return { label: 'Reconectando', tone: 'warning' }
    case 'error':
      return { label: 'Error SSE', tone: 'error' }
    case 'closed':
      return { label: 'Finalizado', tone: 'neutral' }
    case 'idle':
    default:
      return { label: 'Inactivo', tone: 'neutral' }
  }
}

function isErrorEvent(ev: EtlStreamEvent): boolean {
  const t = ev.tipo.toLowerCase()
  return (
    t === 'error' ||
    t === 'err' ||
    t === 'fatal' ||
    ev.mensaje.includes('[ERROR]') ||
    ev.mensaje.includes('[TIMEOUT_STREAM]')
  )
}

function isPasoEvent(ev: EtlStreamEvent): boolean {
  const t = ev.tipo.toLowerCase()
  return t === 'paso' || t === 'step' || t === 'fin'
}

function getEventPillStyle(ev: EtlStreamEvent): string {
  const t = ev.tipo.toLowerCase()
  if (isErrorEvent(ev)) return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  if (t === 'paso' || t === 'step') return 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  if (t === 'fin') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (t === 'warn' || t === 'warning') return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  return 'bg-zinc-800 text-zinc-300 border-zinc-700'
}

export function LiveRunPanel({ idCorrida, canOperate, onLaunchNew }: LiveRunPanelProps) {
  if (!idCorrida) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full border bg-muted/50">
            <Radio className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Ninguna corrida seleccionada</h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            No hay corridas activas en este momento. Selecciona una ejecución desde el historial para inspeccionar su traza y logs persistidos, o lanza una nueva corrida.
          </p>
          {canOperate && onLaunchNew && (
            <Button size="sm" className="mt-4" onClick={onLaunchNew}>
              <Play className="size-3.5" />
              Lanzar corrida ETL
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return <LiveRunPanelContent key={idCorrida} idCorrida={idCorrida} canOperate={canOperate} />
}

function LiveRunPanelContent({
  idCorrida,
  canOperate,
}: {
  idCorrida: string
  canOperate: boolean
}) {
  const [logSearch, setLogSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('todos')
  const [autoScroll, setAutoScroll] = useState(true)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  const logViewportRef = useRef<HTMLDivElement | null>(null)

  const detailQuery = useRunDetail(idCorrida)
  const stream = useRunEventStream(idCorrida)
  const cancelMutation = useCancelRunMutation()

  const detail = detailQuery.data
  const runIsActive = isRunActiveEstado(detail?.estado)

  const counts = useMemo(() => {
    let errors = 0
    let pasos = 0
    for (const ev of stream.events) {
      if (isErrorEvent(ev)) errors += 1
      if (isPasoEvent(ev)) pasos += 1
    }
    return { total: stream.events.length, errors, pasos }
  }, [stream.events])

  const filteredEvents = useMemo(() => {
    const q = logSearch.trim().toLowerCase()
    return stream.events.filter((ev) => {
      if (levelFilter === 'error' && !isErrorEvent(ev)) return false
      if (levelFilter === 'paso' && !isPasoEvent(ev)) return false
      if (q && !ev.mensaje.toLowerCase().includes(q) && !ev.tipo.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [stream.events, logSearch, levelFilter])

  useEffect(() => {
    if (!autoScroll) return
    const el = logViewportRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [filteredEvents.length, autoScroll])

  const sseBadge = getSseBadgeInfo(stream.status, stream.finished)
  const orderedPasos = [...(detail?.pasos ?? [])].sort((a, b) => a.orden - b.orden)
  const completedPasos = orderedPasos.filter((p) =>
    ['OK', 'COMPLETADO', 'EXITOSO'].includes(p.estado.toUpperCase()),
  ).length
  const progressPct =
    orderedPasos.length > 0 ? Math.round((completedPasos / orderedPasos.length) * 100) : 0
  const runDurationSec = computeElapsedSeconds(detail?.fecha_inicio, detail?.fecha_fin)

  const handleCopyUuid = () => {
    void navigator.clipboard.writeText(idCorrida)
    toast.success('ID de corrida copiado')
  }

  const handleCopyLogs = () => {
    const lines = filteredEvents.map(
      (ev) => `[${ev.receivedAt}] [${ev.tipo.toUpperCase()}] ${ev.mensaje}`,
    )
    if (lines.length === 0) {
      toast.info('No hay eventos visibles para copiar')
      return
    }
    void navigator.clipboard.writeText(lines.join('\n'))
    toast.success(`${formatNumber(lines.length)} líneas de log copiadas`)
  }

  const handleConfirmCancel = async () => {
    try {
      await cancelMutation.mutateAsync(idCorrida)
      setCancelConfirmOpen(false)
    } catch {
      // Handled by mutation onError
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {detailQuery.isError && (
          <ApiErrorBanner
            error={detailQuery.error}
            title="No se pudo cargar el detalle de la corrida"
            onRetry={() => void detailQuery.refetch()}
          />
        )}

        {/* Run header + metadata */}
        <Card>
          <CardHeader className="border-b pb-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="size-4 text-primary" />
                    Corrida
                  </CardTitle>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={handleCopyUuid}
                          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-muted"
                        />
                      }
                    >
                      <span>{idCorrida}</span>
                      <Copy className="size-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>Copiar UUID completo</TooltipContent>
                  </Tooltip>

                  {detail ? (
                    <>
                      <StatusBadge label={detail.estado} />
                      <Badge variant="outline" className="font-mono text-[11px] uppercase">
                        {detail.modo_ejecucion}
                      </Badge>
                    </>
                  ) : (
                    <Skeleton className="h-5 w-24" />
                  )}
                </div>

                {detail && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" />
                      Iniciado por <strong className="font-medium text-foreground">{detail.iniciado_por}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      Intento {detail.intento_numero}/{detail.max_reintentos + 1}
                    </span>
                    {detail.id_log_auditoria !== null && (
                      <span className="font-mono tabular-nums">
                        Log #{detail.id_log_auditoria}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void detailQuery.refetch()}
                  disabled={detailQuery.isFetching}
                >
                  <RefreshCw className={cn('size-3.5', detailQuery.isFetching && 'animate-spin')} />
                  Refrescar
                </Button>

                {canOperate && runIsActive && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelConfirmOpen(true)}
                    disabled={cancelMutation.isPending}
                  >
                    <Square className="size-3.5" />
                    Cancelar corrida
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {detailQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-12 w-full" />
                ))}
              </div>
            ) : detail ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  <MetaTile label="Solicitud" value={formatDateTime(detail.fecha_solicitud)} mono />
                  <MetaTile label="Inicio ejecución" value={formatDateTime(detail.fecha_inicio)} mono />
                  <MetaTile
                    label={detail.fecha_fin ? 'Finalizó' : 'Transcurrido'}
                    value={
                      detail.fecha_fin
                        ? `${formatDateTime(detail.fecha_fin)} (${formatDuration(runDurationSec)})`
                        : formatDuration(runDurationSec)
                    }
                    mono
                  />
                  <MetaTile
                    label="PID Runner"
                    value={detail.pid_runner !== null ? String(detail.pid_runner) : '—'}
                    icon={<Cpu className="size-3 text-muted-foreground" />}
                    mono
                  />
                  <MetaTile
                    label="Último heartbeat"
                    value={formatDateTime(detail.heartbeat_ultimo)}
                    icon={<Clock className="size-3 text-muted-foreground" />}
                    mono
                  />
                  <MetaTile
                    label="Timeout"
                    value={formatDuration(detail.timeout_segundos)}
                    mono
                  />
                </div>

                {/* Flags & selected facts */}
                <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                  <span className="font-medium text-muted-foreground">Parámetros:</span>
                  <FlagPill label="Dependencias" active={detail.incluir_dependencias} />
                  <FlagPill label="Refrescar Gold" active={detail.refrescar_gold} />
                  <FlagPill label="Relectura Bronce" active={detail.forzar_relectura_bronce} />

                  {detail.facts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pl-1">
                      <span className="text-muted-foreground">Facts:</span>
                      {detail.facts.map((fact) => (
                        <Badge key={fact} variant="secondary" className="font-mono text-[11px]">
                          {fact}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {detail.comentario && (
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <span className="font-semibold text-muted-foreground">Comentario: </span>
                    <span className="text-foreground">{detail.comentario}</span>
                  </div>
                )}

                {detail.mensaje_final && (
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
                      ['ERROR', 'TIMEOUT', 'FALLIDO'].includes(detail.estado.toUpperCase())
                        ? 'border-rose-500/35 bg-rose-500/8 text-rose-700 dark:text-rose-300'
                        : ['CANCELADO'].includes(detail.estado.toUpperCase())
                          ? 'border-zinc-500/35 bg-zinc-500/8 text-zinc-700 dark:text-zinc-300'
                          : 'border-emerald-500/35 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {['ERROR', 'TIMEOUT', 'FALLIDO'].includes(detail.estado.toUpperCase()) ? (
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold">Mensaje final: </span>
                      <span className="font-mono break-words">{detail.mensaje_final}</span>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Steps + Live SSE Console */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Steps trace */}
          <Card className="xl:col-span-5">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold">Traza de pasos</CardTitle>
                <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                  {completedPasos}/{orderedPasos.length} OK
                </Badge>
              </div>
              {orderedPasos.length > 0 && (
                <div className="pt-1.5">
                  <Progress value={progressPct} />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-3">
              {detailQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : orderedPasos.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
                  {runIsActive
                    ? 'Esperando que el runner registre el primer paso de ejecución...'
                    : 'No se registraron pasos individuales para esta corrida.'}
                </div>
              ) : (
                <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">
                  {orderedPasos.map((paso) => {
                    const dur = computeElapsedSeconds(paso.fecha_inicio, paso.fecha_fin)
                    return (
                      <div
                        key={paso.id_paso}
                        className={cn(
                          'rounded-lg border p-2.5 text-xs transition-colors',
                          paso.mensaje_error
                            ? 'border-rose-500/35 bg-rose-500/5'
                            : 'bg-background',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                                #{String(paso.orden).padStart(2, '0')}
                              </span>
                              <span className="truncate font-mono font-medium text-foreground">
                                {paso.nombre_paso}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                              <span>Inicio: {formatDateTime(paso.fecha_inicio)}</span>
                              <span>Duración: {formatDuration(dur)}</span>
                            </div>
                          </div>
                          <StatusBadge label={paso.estado} className="shrink-0" />
                        </div>

                        {paso.mensaje_error && (
                          <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-[11px] break-words text-rose-700 dark:text-rose-300">
                            {paso.mensaje_error}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live SSE Console */}
          <Card className="flex flex-col xl:col-span-7">
            <CardHeader className="space-y-2.5 border-b pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Consola de eventos SSE</CardTitle>
                  <StatusBadge label={sseBadge.label} tone={sseBadge.tone} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatNumber(filteredEvents.length)}/{formatNumber(counts.total)} líneas
                  </span>
                  {(stream.status === 'error' || (stream.status === 'closed' && !stream.finished)) && (
                    <Button variant="outline" size="xs" onClick={stream.reconnect}>
                      <RefreshCw className="size-3" />
                      Reconectar
                    </Button>
                  )}
                  <Button variant="outline" size="xs" onClick={handleCopyLogs}>
                    <Copy className="size-3" />
                    Copiar logs
                  </Button>
                </div>
              </div>

              {/* Console controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Buscar en el stream de eventos..."
                    aria-label="Buscar en los logs"
                    className="h-7 pl-8 text-xs"
                  />
                </div>

                <div className="inline-flex items-center rounded-md border bg-muted/40 p-0.5" role="group" aria-label="Filtrar por nivel">
                  {(
                    [
                      { key: 'todos', label: 'Todos', count: counts.total },
                      { key: 'error', label: 'Error', count: counts.errors },
                      { key: 'paso', label: 'Paso', count: counts.pasos },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setLevelFilter(opt.key)}
                      className={cn(
                        'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                        levelFilter === opt.key
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {opt.label}{' '}
                      <span className="font-mono text-[10px] opacity-75 tabular-nums">
                        ({opt.count})
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pl-1">
                  <Switch
                    id="sse-autoscroll"
                    size="sm"
                    checked={autoScroll}
                    onCheckedChange={(checked) => setAutoScroll(Boolean(checked))}
                  />
                  <Label htmlFor="sse-autoscroll" className="cursor-pointer text-xs text-muted-foreground">
                    Auto-scroll
                  </Label>
                </div>
              </div>

              {/* Discrete operational parallel interleaving note */}
              <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
                <span>
                  Durante la ejecución paralela del pipeline, los mensajes de facts concurrentes pueden intercalarse en el stream en vivo.
                </span>
              </div>
            </CardHeader>

            <CardContent className="flex-1 pt-3">
              {stream.error && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
                  <span>{stream.error}</span>
                  <Button variant="outline" size="xs" onClick={stream.reconnect}>
                    Reintentar stream
                  </Button>
                </div>
              )}

              {stream.droppedCount > 0 && (
                <div className="mb-2 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                  Buffer limitado a 2,000 líneas ({formatNumber(stream.droppedCount)} líneas antiguas descartadas).
                </div>
              )}

              <div
                ref={logViewportRef}
                role="log"
                aria-live="polite"
                aria-label="Consola de eventos ETL"
                className="h-[430px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100"
              >
                {filteredEvents.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-500">
                    {stream.status === 'connecting' ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-sky-400" />
                        <span>Conectando al stream SSE de la corrida...</span>
                      </>
                    ) : stream.events.length > 0 ? (
                      <span>Ninguna línea coincide con los filtros actuales.</span>
                    ) : (
                      <span>Esperando eventos del runner...</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredEvents.map((ev) => (
                      <div
                        key={ev.key}
                        className={cn(
                          'flex items-start gap-2 rounded px-1.5 py-0.5 hover:bg-zinc-900/90',
                          isErrorEvent(ev) && 'bg-rose-950/40 text-rose-200',
                        )}
                      >
                        <span className="shrink-0 text-[11px] text-zinc-500 tabular-nums select-none">
                          {ev.receivedAt}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 shrink-0 rounded border px-1 py-0 text-[10px] leading-4 uppercase select-none',
                            getEventPillStyle(ev),
                          )}
                        >
                          {ev.tipo}
                        </span>
                        <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">
                          {ev.mensaje}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cancel confirmation dialog */}
        <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>¿Cancelar corrida ETL?</DialogTitle>
              <DialogDescription>
                La corrida <span className="font-mono font-semibold text-foreground">{idCorrida.slice(0, 8)}</span> se marcará como <span className="font-mono">CANCELADO</span>. El runner detectará la señal en su próximo ciclo de heartbeat (≤30s).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={cancelMutation.isPending}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmCancel()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Confirmar cancelación'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

function MetaTile({
  label,
  value,
  mono = false,
  icon,
}: {
  label: string
  value: string
  mono?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        title={value}
        className={cn(
          'mt-0.5 truncate text-xs font-medium text-foreground',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function FlagPill({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono text-[11px]',
        active
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-border bg-muted/40 text-muted-foreground',
      )}
    >
      {label}: {active ? 'Sí' : 'No'}
    </Badge>
  )
}
