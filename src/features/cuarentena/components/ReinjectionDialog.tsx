import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Terminal,
  X,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { formatNumber } from '@/shared/lib/format'
import { BRONZE_TABLE_SUGGESTIONS } from '../cuarentenaUtils'
import {
  useEjecutarReinyeccionMutation,
  useReinyeccionCandidatos,
} from '../useCuarentenaQueries'
import type { RespuestaReinyeccion } from '../types'

const QUICK_TABLE_FILTERS = [
  'Bronce.Peladas',
  'Bronce.Consolidado_Tareos',
  'Bronce.Reporte_Cosecha',
  'Bronce.Conteo_Fruta',
  'Bronce.Evaluacion_Pesos',
] as const

interface ReinjectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTabla?: string
}

export function ReinjectionDialog({
  open,
  onOpenChange,
  initialTabla = '',
}: ReinjectionDialogProps) {
  const [tablaInput, setTablaInput] = useState(initialTabla)
  const [debouncedTabla, setDebouncedTabla] = useState(initialTabla.trim())
  const [lastResult, setLastResult] = useState<RespuestaReinyeccion | null>(null)
  const [execError, setExecError] = useState<unknown>(null)
  const [prevOpenState, setPrevOpenState] = useState<{ open: boolean; initialTabla: string }>({
    open,
    initialTabla,
  })

  const ejecutarMutation = useEjecutarReinyeccionMutation()

  if (prevOpenState.open !== open || (open && prevOpenState.initialTabla !== initialTabla)) {
    setPrevOpenState({ open, initialTabla })
    if (open) {
      const trimmed = initialTabla.trim()
      setTablaInput(trimmed)
      setDebouncedTabla(trimmed)
      setLastResult(null)
      setExecError(null)
    }
  }

  useEffect(() => {
    const trimmed = tablaInput.trim()
    if (trimmed === debouncedTabla) return
    const timer = window.setTimeout(() => {
      setDebouncedTabla(trimmed)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [tablaInput, debouncedTabla])

  const candidatosQuery = useReinyeccionCandidatos(debouncedTabla, open)
  const candidatosCount = candidatosQuery.data?.candidatos
  const isWaitingDebounce = tablaInput.trim() !== debouncedTabla

  const handleExecute = async () => {
    setExecError(null)
    try {
      const res = await ejecutarMutation.mutateAsync(debouncedTabla || undefined)
      setLastResult(res)
      void candidatosQuery.refetch()
    } catch (err) {
      setExecError(err)
    }
  }

  const canExecute =
    !ejecutarMutation.isPending &&
    !isWaitingDebounce &&
    !candidatosQuery.isLoading &&
    !candidatosQuery.isFetching &&
    !candidatosQuery.isError &&
    (candidatosCount ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="size-4 text-primary" />
            Herramienta de Reinyección MDM hacia Bronce
          </DialogTitle>
          <DialogDescription>
            Consulta en vivo los registros <strong className="font-mono">RESUELTO</strong> con{' '}
            <code className="font-mono text-xs">ID_Registro_Origen</code> válido y reabre sus filas
            en las tablas Bronce para la siguiente corrida ETL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtro opcional por tabla Bronce */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="reinyeccion-tabla-input" className="text-xs font-semibold">
                Filtrar por tabla Bronce (opcional)
              </Label>
              {tablaInput.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTablaInput('')
                    setDebouncedTabla('')
                  }}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Incluir todas las tablas
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reinyeccion-tabla-input"
                value={tablaInput}
                onChange={(e) => setTablaInput(e.target.value)}
                list="reinyeccion-bronce-tables"
                placeholder="Vacío = todas las tablas mapeadas (ej. Bronce.Peladas)"
                className="pr-8 pl-8 font-mono text-xs"
                disabled={ejecutarMutation.isPending}
              />
              <datalist id="reinyeccion-bronce-tables">
                {BRONZE_TABLE_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {tablaInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTablaInput('')
                    setDebouncedTabla('')
                  }}
                  aria-label="Limpiar filtro de tabla"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Rápidos:</span>
              {QUICK_TABLE_FILTERS.map((tbl) => {
                const isSelected = debouncedTabla.toLowerCase() === tbl.toLowerCase()
                return (
                  <button
                    key={tbl}
                    type="button"
                    disabled={ejecutarMutation.isPending}
                    onClick={() => {
                      setTablaInput(tbl)
                      setDebouncedTabla(tbl)
                    }}
                    className={cn(
                      'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {tbl.replace(/^Bronce\./, '')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Panel de conteo en vivo */}
          <div className="rounded-xl border bg-muted/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Database className="size-3.5" />
                  <span>Candidatos elegibles ahora</span>
                  {debouncedTabla && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      filtro: {debouncedTabla}
                    </Badge>
                  )}
                </div>

                {candidatosQuery.isLoading || isWaitingDebounce ? (
                  <Skeleton className="h-9 w-24" />
                ) : candidatosQuery.isError || candidatosCount === undefined ? (
                  <div className="flex items-center gap-2 pt-1 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="size-4" />
                    <span className="text-sm font-semibold">Sin datos / Error</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        'metric-value font-mono text-3xl font-semibold tracking-tight tabular-nums',
                        candidatosCount > 0
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatNumber(candidatosCount)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {candidatosCount === 1
                        ? 'registro listo para reinyectar'
                        : 'registros listos para reinyectar'}
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => void candidatosQuery.refetch()}
                disabled={candidatosQuery.isFetching || ejecutarMutation.isPending}
              >
                <RefreshCw className={cn('size-3', candidatosQuery.isFetching && 'animate-spin')} />
                Recontar
              </Button>
            </div>

            {candidatosQuery.isError && (
              <div className="mt-3">
                <ApiErrorBanner
                  error={candidatosQuery.error}
                  title="No se pudo consultar /api/v1/reinyeccion/candidatos"
                  onRetry={() => void candidatosQuery.refetch()}
                />
              </div>
            )}
          </div>

          {/* Nota operativa honesta (Etapa 1 vs Etapa 2) */}
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100">
            <Info className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-semibold">
              Nota operativa — Alcance Etapa 1 del backend
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              En Etapa 1, la reinyección restablece{' '}
              <code className="rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[11px]">
                Estado_Carga = &apos;CARGADO&apos;
              </code>{' '}
              en las tablas Bronce correspondientes para que la siguiente corrida ETL las vuelva a
              procesar, y consume los casos marcándolos como{' '}
              <code className="rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[11px]">
                REINYECTADO
              </code>
              . La aplicación automática directa de{' '}
              <code className="rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[11px]">
                Valor_Corregido
              </code>{' '}
              durante el paso Bronce → Silver se cerrará en la <strong>Etapa 2</strong> del backend.
            </AlertDescription>
          </Alert>

          {execError != null && (
            <ApiErrorBanner
              error={execError}
              title="Error al ejecutar la reinyección MDM"
            />
          )}

          {/* Reporte estructurado tras ejecutar */}
          {lastResult && (
            <div className="animate-in fade-in-0 space-y-3 rounded-xl border bg-card p-4 duration-150">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">
                    Resultado de reinyección ejecutada
                  </h4>
                  <p className="text-xs text-muted-foreground">{lastResult.mensaje}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border bg-emerald-500/8 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Reinyectados</p>
                  <p className="metric-value font-mono text-lg font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
                    {formatNumber(lastResult.reinyectados)}
                  </p>
                </div>
                <div className="rounded-lg border bg-sky-500/8 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Ya en cola</p>
                  <p className="metric-value font-mono text-lg font-semibold text-sky-700 tabular-nums dark:text-sky-300">
                    {formatNumber(lastResult.ya_en_cola)}
                  </p>
                </div>
                <div className="rounded-lg border bg-indigo-500/8 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Marcados</p>
                  <p className="metric-value font-mono text-lg font-semibold text-indigo-700 tabular-nums dark:text-indigo-300">
                    {formatNumber(lastResult.marcados)}
                  </p>
                </div>
                <div className="rounded-lg border bg-amber-500/8 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Omitidos</p>
                  <p className="metric-value font-mono text-lg font-semibold text-amber-700 tabular-nums dark:text-amber-300">
                    {formatNumber(lastResult.omitidos)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Terminal className="size-3.5" />
                  <span>Detalle por tabla ({lastResult.detalle.length})</span>
                </div>
                {lastResult.detalle.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
                    El backend no devolvió líneas de detalle adicionales.
                  </p>
                ) : (
                  <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed">
                    {lastResult.detalle.map((line, idx) => (
                      <li key={idx} className="break-words text-foreground">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ejecutarMutation.isPending}
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={() => void handleExecute()}
            disabled={!canExecute}
          >
            {ejecutarMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Ejecutando reinyección…
              </>
            ) : (
              <>
                <RotateCcw className="size-3.5" />
                {debouncedTabla
                  ? `Reinyectar ${debouncedTabla}`
                  : `Ejecutar reinyección (${formatNumber(candidatosCount ?? 0)})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
