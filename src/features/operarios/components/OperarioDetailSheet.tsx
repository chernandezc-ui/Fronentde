import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Info,
  Pencil,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { API_ENDPOINTS, isEndpointNotImplementedError } from '@/shared/api/endpoints'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import {
  countPersonalColumnIncidencias,
  formatSexoLabel,
  matchOperarioIncidencias,
} from '../operariosUtils'
import type { CuarentenaIncidencia, OperarioPersonal } from '../types'
import { useCuarentenaSnapshot, useOperarioIncidencias } from '../useOperariosQueries'
import { AsertividadMeter } from './AsertividadMeter'
import { ConfirmOperarioToggleDialog } from './ConfirmOperarioToggleDialog'
import { OperarioFormDialog } from './OperarioFormDialog'

const EMPTY_CUARENTENA: CuarentenaIncidencia[] = []

interface OperarioDetailSheetProps {
  operario: OperarioPersonal | null
  canManage?: boolean
  onOpenChange: (open: boolean) => void
}

export function OperarioDetailSheet({
  operario,
  canManage = false,
  onOpenChange,
}: OperarioDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [toggleOpen, setToggleOpen] = useState(false)

  const dedicatedQuery = useOperarioIncidencias(operario?.dni, Boolean(operario?.dni))
  const dedicatedNotReady =
    !operario?.dni ||
    (dedicatedQuery.isError && isEndpointNotImplementedError(dedicatedQuery.error))

  const cuarentenaQuery = useCuarentenaSnapshot(Boolean(operario) && dedicatedNotReady, 200)
  const snapshotRows = cuarentenaQuery.data?.datos ?? EMPTY_CUARENTENA
  const totalCuarentena = cuarentenaQuery.data?.total ?? 0

  const dedicatedMatches = useMemo(() => {
    const rows = dedicatedQuery.data?.datos ?? EMPTY_CUARENTENA
    return rows.map((inc) => ({
      incidencia: inc,
      matchReason: 'dni' as const,
      matchLabel: 'Coincidencia server-side por DNI',
      isPersonalColumn: true,
    }))
  }, [dedicatedQuery.data?.datos])

  const fallbackMatches = useMemo(() => {
    if (!operario || !dedicatedNotReady) return []
    return matchOperarioIncidencias(operario, snapshotRows)
  }, [operario, dedicatedNotReady, snapshotRows])

  const incidenciasMatches = dedicatedNotReady ? fallbackMatches : dedicatedMatches

  const personalColumnsCount = useMemo(
    () => countPersonalColumnIncidencias(snapshotRows),
    [snapshotRows],
  )

  const activeQueryLoading = dedicatedNotReady
    ? dedicatedQuery.isLoading || cuarentenaQuery.isLoading
    : dedicatedQuery.isLoading
  const activeQueryFetching = dedicatedQuery.isFetching || cuarentenaQuery.isFetching
  const activeQueryError = dedicatedNotReady ? cuarentenaQuery.isError : dedicatedQuery.isError
  const activeErrorObj = dedicatedNotReady ? cuarentenaQuery.error : dedicatedQuery.error

  const handleCopyDni = () => {
    if (!operario?.dni) return
    void navigator.clipboard.writeText(operario.dni)
    toast.success('DNI copiado al portapapeles')
  }

  const isOperarioActivo = operario?.es_activo ?? true

  return (
    <Sheet open={Boolean(operario)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="border-b bg-muted/25 px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <UserRound className="size-4 text-primary" />
            <SheetTitle className="text-sm font-semibold">
              {operario?.nombre_completo || 'Operario sin nombre registrado'}
            </SheetTitle>
            <StatusBadge
              label={isOperarioActivo ? 'ACTIVO' : 'INACTIVO'}
              tone={isOperarioActivo ? 'ok' : 'cancelled'}
            />
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="font-mono text-foreground">
              DNI: {operario?.dni || 'No registrado'}
            </span>
            {operario?.dni && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyDni}
                aria-label="Copiar DNI"
              >
                <Copy className="size-3" />
              </Button>
            )}
            <span className="text-muted-foreground">·</span>
            <span>Silver.Dim_Personal</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Ficha completa del operario */}
          {operario && (
            <section aria-label="Ficha del operario" className="space-y-3">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Ficha del operario
              </h2>
              <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    DNI
                  </p>
                  <p className="font-mono text-sm font-semibold text-foreground tabular-nums">
                    {operario.dni || '—'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    ID Planilla
                  </p>
                  <p className="font-mono text-sm text-foreground tabular-nums">
                    {operario.id_planilla || '—'}
                  </p>
                </div>

                <div className="space-y-0.5 sm:col-span-2">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Nombre completo
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {operario.nombre_completo || 'Sin nombre registrado'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Rol operativo
                  </p>
                  <p className="text-sm text-foreground">
                    {operario.rol || 'Sin rol asignado'}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Sexo
                  </p>
                  <p className="text-sm text-foreground">
                    {formatSexoLabel(operario.sexo)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Asertividad %
                  </p>
                  <AsertividadMeter value={operario.pct_asertividad} />
                </div>

                <div className="space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Días de ausentismo
                  </p>
                  <p className="metric-value font-mono text-sm font-semibold text-foreground">
                    {operario.dias_ausentismo !== null &&
                    operario.dias_ausentismo !== undefined
                      ? `${formatNumber(operario.dias_ausentismo)} días`
                      : 'Sin registro'}
                  </p>
                </div>
              </div>
            </section>
          )}

          <Separator />

          {/* Cruce de incidencias en Cuarentena (Etapa 1) */}
          <section
            aria-label="Incidencias detectadas en Cuarentena"
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldAlert className="size-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {dedicatedNotReady
                    ? 'Incidencias detectadas en Cuarentena (fallback 200 reg.)'
                    : 'Incidencias por DNI (server-side)'}
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  if (operario?.dni) void dedicatedQuery.refetch()
                  if (dedicatedNotReady) void cuarentenaQuery.refetch()
                }}
                disabled={activeQueryFetching}
              >
                <RefreshCw
                  className={cn(
                    'size-3',
                    activeQueryFetching && 'animate-spin',
                  )}
                />
                Revalidar
              </Button>
            </div>

            {activeQueryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : activeQueryError ? (
              <ApiErrorBanner
                error={activeErrorObj}
                title="No se pudo consultar incidencias de cuarentena"
                onRetry={() => {
                  if (operario?.dni) void dedicatedQuery.refetch()
                  if (dedicatedNotReady) void cuarentenaQuery.refetch()
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Coincidencias encontradas:{' '}
                    <strong className="text-foreground">
                      {formatNumber(incidenciasMatches.length)}
                    </strong>
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {dedicatedNotReady
                      ? `Muestra local: ${formatNumber(snapshotRows.length)} de ${formatNumber(totalCuarentena)} (${personalColumnsCount} personal)`
                      : `Total server-side: ${formatNumber(dedicatedQuery.data?.total ?? incidenciasMatches.length)}`}
                  </span>
                </div>

                {incidenciasMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
                    <CheckCircle2 className="mb-2 size-6 text-emerald-500" />
                    <p className="text-xs font-medium text-foreground">
                      Sin coincidencias directas en la muestra de cuarentena
                    </p>
                    <p className="mt-1 max-w-md text-[11px] text-muted-foreground">
                      No se detectaron rechazos asociados al DNI, ID planilla o nombre de este operario dentro de los primeros{' '}
                      {formatNumber(snapshotRows.length)} registros de{' '}
                      <span className="font-mono">MDM.Cuarentena</span>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {incidenciasMatches.map((match) => {
                      const item = match.incidencia
                      const key = `${item.tabla_origen}-${item.id_registro}-${item.columna_origen}-${item.valor_raw}`
                      return (
                        <div
                          key={key}
                          className="space-y-2 rounded-xl border bg-card p-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <AlertCircle className="size-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="font-mono font-semibold text-foreground">
                                {item.tabla_origen}
                              </span>
                              <Badge
                                variant="secondary"
                                className="font-mono text-[10px]"
                              >
                                {item.columna_origen}
                              </Badge>
                            </div>
                            <StatusBadge label={item.estado} />
                          </div>

                          <div className="grid grid-cols-1 gap-1.5 rounded-md bg-muted/35 p-2 font-mono text-[11px] sm:grid-cols-2">
                            <div>
                              <span className="text-muted-foreground">
                                Valor raw:{' '}
                              </span>
                              <span className="font-medium text-foreground">
                                {item.valor_raw}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Registro:{' '}
                              </span>
                              <span className="text-foreground">
                                {item.id_registro}
                              </span>
                            </div>
                            {item.valor_corregido && (
                              <div className="sm:col-span-2">
                                <span className="text-muted-foreground">
                                  Valor corregido:{' '}
                                </span>
                                <span className="text-emerald-700 dark:text-emerald-300">
                                  {item.valor_corregido}
                                </span>
                              </div>
                            )}
                          </div>

                          {item.motivo && (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Motivo:{' '}
                              </span>
                              {item.motivo}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">
                              {match.matchLabel}
                            </Badge>
                            <span className="font-mono tabular-nums">
                              {item.fecha_ingreso || 'Sin fecha'}
                              {item.nombre_archivo
                                ? ` · ${item.nombre_archivo}`
                                : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {dedicatedNotReady && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/8 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>
                  <span className="font-semibold text-foreground">Fallback local (200 reg.):</span>{' '}
                  Esperando el endpoint dedicado{' '}
                  <span className="font-mono text-foreground">
                    GET {operario?.dni ? API_ENDPOINTS.operarios.personalIncidencias(operario.dni) : '/api/v1/catalogos/personal/{dni}/incidencias'}
                  </span>
                  . En cuanto se publique en el backend, este panel mostrará el historial completo desde SQL Server.
                </p>
              </div>
            )}
          </section>
        </div>

        <SheetFooter className="border-t bg-muted/25 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            {canManage ? 'Gestión habilitada sobre Silver.Dim_Personal' : 'Solo lectura para rol actual'}
          </span>
          {canManage && operario && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
                Editar operario
              </Button>
              <Button
                variant={isOperarioActivo ? 'destructive' : 'secondary'}
                size="sm"
                disabled={!operario.dni}
                onClick={() => setToggleOpen(true)}
              >
                {isOperarioActivo ? (
                  <>
                    <UserX className="size-3.5" />
                    Desactivar operario
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5" />
                    Reactivar operario
                  </>
                )}
              </Button>
            </div>
          )}
        </SheetFooter>

        <OperarioFormDialog
          open={editOpen}
          operario={operario}
          onOpenChange={setEditOpen}
        />

        <ConfirmOperarioToggleDialog
          operario={operario}
          open={toggleOpen}
          onOpenChange={setToggleOpen}
        />
      </SheetContent>
    </Sheet>
  )
}
