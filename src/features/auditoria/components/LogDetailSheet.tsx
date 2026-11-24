import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ScrollText,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatDuration, formatNumber } from '@/shared/lib/format'
import type { LogCargaItem } from '../types'
import { useLogDetailQuery } from '../useAuditoriaQueries'

interface LogDetailSheetProps {
  logPreview: LogCargaItem | null
  onOpenChange: (open: boolean) => void
  onFilterByCorrida?: (idCorrida: string) => void
}

export function LogDetailSheet({
  logPreview,
  onOpenChange,
  onFilterByCorrida,
}: LogDetailSheetProps) {
  const [copiedError, setCopiedError] = useState(false)
  const [copiedCorrida, setCopiedCorrida] = useState(false)

  const idLog = logPreview?.id_log ?? null
  const detailQuery = useLogDetailQuery(idLog)
  const item = detailQuery.data ?? logPreview

  const handleCopyText = async (
    text: string,
    kind: 'error' | 'corrida',
    successMessage: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
      if (kind === 'error') {
        setCopiedError(true)
        window.setTimeout(() => setCopiedError(false), 1_800)
      } else {
        setCopiedCorrida(true)
        window.setTimeout(() => setCopiedCorrida(false), 1_800)
      }
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <Sheet open={Boolean(logPreview)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="border-b bg-muted/25 px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <ScrollText className="size-4 text-primary" />
            <SheetTitle className="font-mono text-sm font-semibold">
              Log #{item?.id_log ?? '—'}
            </SheetTitle>
            {item && <StatusBadge label={item.estado} />}
            {detailQuery.isFetching && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Sincronizando…
              </span>
            )}
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="font-mono font-medium text-foreground">
              {item?.tabla_destino ?? '—'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate">{item?.nombre_proceso ?? 'Proceso ETL'}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {detailQuery.isError && (
            <ApiErrorBanner
              error={detailQuery.error}
              title="No se pudo obtener el detalle completo del log"
              onRetry={() => void detailQuery.refetch()}
            />
          )}

          {item && (
            <>
              {/* Metadatos de ejecución */}
              <section aria-label="Metadatos de carga" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Resumen de ejecución
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => void detailQuery.refetch()}
                    disabled={detailQuery.isFetching}
                  >
                    <RefreshCw
                      className={cn('size-3', detailQuery.isFetching && 'animate-spin')}
                    />
                    Recargar detalle
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
                  <div className="space-y-0.5 sm:col-span-2">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Nombre del proceso
                    </p>
                    <p className="font-mono text-xs font-medium text-foreground break-all">
                      {item.nombre_proceso || '—'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Tabla destino</p>
                    <p className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground break-all">
                      <Database className="size-3.5 shrink-0 text-muted-foreground" />
                      {item.tabla_destino || '—'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Archivo fuente</p>
                    <p className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground break-all">
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                      {item.nombre_archivo || 'Sin archivo asociado'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Fecha inicio</p>
                    <p className="metric-value font-mono text-xs text-foreground tabular-nums">
                      {formatDateTime(item.fecha_inicio)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Fecha fin</p>
                    <p className="metric-value font-mono text-xs text-foreground tabular-nums">
                      {formatDateTime(item.fecha_fin)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Duración</p>
                    <p className="metric-value inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground tabular-nums">
                      <Clock className="size-3.5 text-muted-foreground" />
                      {formatDuration(item.duracion_segundos)}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Volumen procesado
                    </p>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                      <Badge
                        variant="secondary"
                        className="metric-value font-mono text-[11px] text-emerald-700 dark:text-emerald-300"
                      >
                        +{formatNumber(item.filas_insertadas)} insertadas
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'metric-value font-mono text-[11px]',
                          item.filas_rechazadas > 0
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatNumber(item.filas_rechazadas)} rechazadas
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-3 sm:col-span-2">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      ID de Corrida (Control.Corrida)
                    </p>
                    {item.id_corrida ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs text-foreground break-all">
                          {item.id_corrida}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() =>
                              void handleCopyText(
                                item.id_corrida!,
                                'corrida',
                                'ID de corrida copiado',
                              )
                            }
                          >
                            {copiedCorrida ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            Copiar UUID
                          </Button>
                          {onFilterByCorrida && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                onFilterByCorrida(item.id_corrida!)
                                onOpenChange(false)
                              }}
                            >
                              Filtrar corrida
                            </Button>
                          )}
                          <Link
                            to="/etl"
                            className={cn(buttonVariants({ variant: 'secondary', size: 'xs' }))}
                          >
                            Monitor ETL
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Ejecución sin corrida de control-plane asociada (carga directa o legacy).
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Mensaje de error completo */}
              <section aria-label="Mensaje de error completo" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.mensaje_error ? (
                      <AlertTriangle className="size-4 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    )}
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Detalle de error (sin truncar)
                    </h2>
                  </div>

                  {item.mensaje_error && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        void handleCopyText(
                          item.mensaje_error!,
                          'error',
                          'Mensaje de error copiado al portapapeles',
                        )
                      }
                    >
                      {copiedError ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          Copiar error
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {detailQuery.isLoading ? (
                  <div className="space-y-2 rounded-xl border p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : item.mensaje_error ? (
                  <div className="space-y-2">
                    <pre className="max-h-[42vh] overflow-auto rounded-xl border border-rose-500/30 bg-rose-500/6 p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-foreground">
                      {item.mensaje_error}
                    </pre>
                    <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      Longitud del mensaje: {formatNumber(item.mensaje_error.length)} caracteres
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
                    <CheckCircle2 className="mb-2 size-6 text-emerald-500" />
                    <p className="text-xs font-medium text-foreground">
                      Sin mensaje de error registrado
                    </p>
                    <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">
                      La entrada <span className="font-mono">ID_Log_Carga={item.id_log}</span> no
                      presenta excepciones ni trazas de fallo almacenadas en{' '}
                      <span className="font-mono">Auditoria.Log_Carga</span>.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <SheetFooter className="border-t bg-muted/25 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">
            GET /api/v1/auditoria/bitacora/{idLog ?? '{id_log}'}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
