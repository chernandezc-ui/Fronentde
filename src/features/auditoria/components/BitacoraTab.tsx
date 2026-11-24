import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createColumnHelper,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  FilterX,
  Fingerprint,
  Loader2,
  RefreshCw,
  Search,
  ScrollText,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatDuration, formatNumber } from '@/shared/lib/format'
import {
  BITACORA_MAX_CORRIDA_LENGTH,
  BITACORA_MAX_TABLA_LENGTH,
  BITACORA_PAGE_SIZE_OPTIONS,
  ESTADO_BITACORA_META,
  ESTADOS_BITACORA,
  hasActiveBitacoraFilters,
  isDateRangeInverted,
  toDateTimeLocalInputValue,
  toIsoDateTimeParam,
} from '../auditoriaUtils'
import type {
  BitacoraFiltrosUrl,
  EstadoBitacora,
  LogCargaItem,
  TablaCatalogoOption,
  VentanaResumenDias,
} from '../types'
import { useBitacoraQuery, useBitacoraResumenQuery } from '../useAuditoriaQueries'
import { BitacoraKpiGrid } from './BitacoraKpiGrid'
import { LogDetailSheet } from './LogDetailSheet'

const EMPTY_LOGS: LogCargaItem[] = []

const bitacoraTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof bitacoraTableFeatures, LogCargaItem>()

function compareNullableStrings(a: string | null | undefined, b: string | null | undefined): number {
  const sa = a ?? ''
  const sb = b ?? ''
  return sa.localeCompare(sb, 'es', { sensitivity: 'base' })
}

function compareNullableNumbers(a: number | null | undefined, b: number | null | undefined): number {
  const aMissing = a === null || a === undefined || Number.isNaN(a)
  const bMissing = b === null || b === undefined || Number.isNaN(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return -1
  if (bMissing) return 1
  return a - b
}

function compareIsoTimestamps(a: string | null | undefined, b: string | null | undefined): number {
  const ta = a ? new Date(a).getTime() : NaN
  const tb = b ? new Date(b).getTime() : NaN
  return compareNullableNumbers(Number.isNaN(ta) ? null : ta, Number.isNaN(tb) ? null : tb)
}

interface BitacoraTabProps {
  filters: BitacoraFiltrosUrl
  catalogTables: readonly TablaCatalogoOption[]
  onUpdateFilters: (patch: Partial<BitacoraFiltrosUrl>, options?: { replace?: boolean }) => void
  onResetFilters: () => void
}

export function BitacoraTab({
  filters,
  catalogTables,
  onUpdateFilters,
  onResetFilters,
}: BitacoraTabProps) {
  const [selectedLog, setSelectedLog] = useState<LogCargaItem | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  // Inputs con debounce sin setState síncrono en useEffect
  const [draftTabla, setDraftTabla] = useState<string | null>(null)
  const tablaInput = draftTabla ?? filters.tabla_destino

  const [draftCorrida, setDraftCorrida] = useState<string | null>(null)
  const corridaInput = draftCorrida ?? filters.id_corrida

  useEffect(() => {
    if (draftTabla === null) return
    const trimmed = draftTabla.trim().slice(0, BITACORA_MAX_TABLA_LENGTH)
    const timer = window.setTimeout(() => {
      if (trimmed !== filters.tabla_destino) {
        onUpdateFilters({ tabla_destino: trimmed, pagina: 1 }, { replace: true })
      }
      setDraftTabla(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftTabla, filters.tabla_destino, onUpdateFilters])

  useEffect(() => {
    if (draftCorrida === null) return
    const trimmed = draftCorrida.trim().slice(0, BITACORA_MAX_CORRIDA_LENGTH)
    const timer = window.setTimeout(() => {
      if (trimmed !== filters.id_corrida) {
        onUpdateFilters({ id_corrida: trimmed, pagina: 1 }, { replace: true })
      }
      setDraftCorrida(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftCorrida, filters.id_corrida, onUpdateFilters])

  const resumenQuery = useBitacoraResumenQuery(filters.ventana_dias)
  const bitacoraQuery = useBitacoraQuery({
    pagina: filters.pagina,
    tamano: filters.tamano,
    estados: filters.estados,
    tabla_destino: filters.tabla_destino,
    desde: filters.desde,
    hasta: filters.hasta,
    id_corrida: filters.id_corrida,
  })

  const rows = bitacoraQuery.data?.items ?? EMPTY_LOGS
  const total = bitacoraQuery.data?.total ?? 0
  const dateRangeWarning = isDateRangeInverted(filters.desde, filters.hasta)

  const handleToggleEstado = useCallback(
    (estado: EstadoBitacora) => {
      const exists = filters.estados.includes(estado)
      const nextEstados = exists
        ? filters.estados.filter((e) => e !== estado)
        : [...filters.estados, estado]
      onUpdateFilters({ estados: nextEstados, pagina: 1 })
    },
    [filters.estados, onUpdateFilters],
  )

  const handleQuickFilterError = useCallback(() => {
    onUpdateFilters({ estados: ['ERROR'], pagina: 1 })
  }, [onUpdateFilters])

  const handleVentanaChange = useCallback(
    (ventana: VentanaResumenDias) => {
      onUpdateFilters({ ventana_dias: ventana })
    },
    [onUpdateFilters],
  )

  const handleFilterByCorrida = useCallback(
    (idCorrida: string) => {
      setDraftCorrida(null)
      onUpdateFilters({ id_corrida: idCorrida, pagina: 1 })
    },
    [onUpdateFilters],
  )

  const handleResetAll = useCallback(() => {
    setDraftTabla(null)
    setDraftCorrida(null)
    setSorting([])
    onResetFilters()
  }, [onResetFilters])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('fecha_inicio', {
          header: 'Inicio / Log',
          sortFn: (rowA, rowB) =>
            compareIsoTimestamps(rowA.original.fecha_inicio, rowB.original.fecha_inicio),
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="space-y-0.5">
                <span className="metric-value block font-mono text-xs text-foreground tabular-nums">
                  {formatDateTime(row.fecha_inicio)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  #{row.id_log}
                </span>
              </div>
            )
          },
        }),
        columnHelper.accessor('tabla_destino', {
          header: 'Tabla destino / Proceso',
          sortFn: (rowA, rowB) =>
            compareNullableStrings(rowA.original.tabla_destino, rowB.original.tabla_destino),
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="max-w-[270px] space-y-0.5">
                <div
                  className="truncate font-mono text-xs font-medium text-foreground"
                  title={row.tabla_destino}
                >
                  {row.tabla_destino || '—'}
                </div>
                <div
                  className="truncate text-[11px] text-muted-foreground"
                  title={
                    row.nombre_archivo
                      ? `${row.nombre_proceso} · ${row.nombre_archivo}`
                      : row.nombre_proceso
                  }
                >
                  <span>{row.nombre_proceso}</span>
                  {row.nombre_archivo && (
                    <span className="font-mono opacity-80"> · {row.nombre_archivo}</span>
                  )}
                </div>
              </div>
            )
          },
        }),
        columnHelper.accessor('estado', {
          header: 'Estado',
          sortFn: (rowA, rowB) =>
            compareNullableStrings(rowA.original.estado, rowB.original.estado),
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="flex items-center gap-1.5">
                <StatusBadge label={row.estado} />
                {row.mensaje_error && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          onClick={() => setSelectedLog(row)}
                          aria-label={`Ver error del log ${row.id_log}`}
                          className="rounded p-0.5 text-rose-500 transition-colors hover:bg-rose-500/10"
                        />
                      }
                    >
                      <AlertCircle className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs font-mono text-[11px] break-words">
                      {row.mensaje_error.length > 160
                        ? `${row.mensaje_error.slice(0, 160)}…`
                        : row.mensaje_error}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )
          },
        }),
        columnHelper.accessor('filas_insertadas', {
          header: 'Insertadas',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.filas_insertadas,
              rowB.original.filas_insertadas,
            ),
          cell: (info) => (
            <span className="metric-value block text-right font-mono text-xs text-foreground tabular-nums">
              {formatNumber(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('filas_rechazadas', {
          header: 'Rechazadas',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.filas_rechazadas,
              rowB.original.filas_rechazadas,
            ),
          cell: (info) => {
            const val = info.getValue()
            return (
              <span
                className={cn(
                  'metric-value block text-right font-mono text-xs tabular-nums',
                  val > 0
                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {formatNumber(val)}
              </span>
            )
          },
        }),
        columnHelper.accessor('duracion_segundos', {
          header: 'Duración',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.duracion_segundos,
              rowB.original.duracion_segundos,
            ),
          cell: (info) => (
            <span className="metric-value block text-right font-mono text-xs text-muted-foreground tabular-nums">
              {formatDuration(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('id_corrida', {
          header: 'Corrida ETL',
          enableSorting: false,
          cell: (info) => {
            const idCorrida = info.getValue()
            if (!idCorrida) {
              return <span className="font-mono text-xs text-muted-foreground/60">—</span>
            }
            return (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Link
                        to="/etl"
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'xs' }),
                          'h-6 px-1.5 font-mono text-[11px] text-primary',
                        )}
                      />
                    }
                  >
                    <span>{idCorrida.slice(0, 8)}</span>
                    <ExternalLink className="size-3 opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-[11px]">
                    Ir a Monitor ETL · Corrida {idCorrida}
                  </TooltipContent>
                </Tooltip>
              </div>
            )
          },
        }),
        columnHelper.display({
          id: 'acciones',
          header: 'Acción',
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant={row.mensaje_error ? 'secondary' : 'outline'}
                  size="xs"
                  onClick={() => setSelectedLog(row)}
                  aria-label={`Ver detalle del log ${row.id_log}`}
                >
                  <Eye className="size-3" />
                  Ver detalle
                </Button>
              </div>
            )
          },
        }),
      ]),
    [],
  )

  const paginationState = useMemo<PaginationState>(
    () => ({
      pageIndex: Math.max(0, filters.pagina - 1),
      pageSize: filters.tamano,
    }),
    [filters.pagina, filters.tamano],
  )

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const next = typeof updater === 'function' ? updater(paginationState) : updater
    if (next.pageSize !== paginationState.pageSize) {
      onUpdateFilters({ tamano: next.pageSize, pagina: 1 })
      return
    }
    const nextPagina = Math.max(1, next.pageIndex + 1)
    if (nextPagina !== filters.pagina) {
      onUpdateFilters({ pagina: nextPagina })
    }
  }

  const table = useTable(
    {
      features: bitacoraTableFeatures,
      data: rows,
      columns,
      manualPagination: true,
      rowCount: total,
      state: {
        pagination: paginationState,
        sorting,
      },
      onPaginationChange: handlePaginationChange,
      onSortingChange: setSorting,
    },
    (state) => ({
      pagination: state.pagination,
      sorting: state.sorting,
    }),
  )

  const tableRows = table.getRowModel().rows
  const pageCount = Math.max(1, table.getPageCount())
  const startItem = total === 0 ? 0 : (filters.pagina - 1) * filters.tamano + 1
  const endItem = Math.min(total, filters.pagina * filters.tamano)
  const activeFilters =
    hasActiveBitacoraFilters(filters) ||
    tablaInput.trim().length > 0 ||
    corridaInput.trim().length > 0

  const desdeLocalValue = toDateTimeLocalInputValue(filters.desde)
  const hastaLocalValue = toDateTimeLocalInputValue(filters.hasta)

  return (
    <div className="space-y-5">
      {/* KPIs por ventana temporal */}
      <BitacoraKpiGrid
        ventanaDias={filters.ventana_dias}
        onVentanaChange={handleVentanaChange}
        resumen={resumenQuery.data}
        isLoading={resumenQuery.isLoading}
        isFetching={resumenQuery.isFetching}
        isPlaceholderData={resumenQuery.isPlaceholderData}
        isError={resumenQuery.isError}
        error={resumenQuery.error}
        onRetry={() => void resumenQuery.refetch()}
        onQuickFilterError={handleQuickFilterError}
      />

      {/* Tabla de Bitácora con filtros server-side */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          {/* Título + contador + tamaño de página + refrescar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Bitácora de Cargas (Auditoria.Log_Carga)
              </CardTitle>
              {!bitacoraQuery.isError && (
                <Badge
                  variant="secondary"
                  className="metric-value font-mono text-[11px] tabular-nums"
                >
                  {formatNumber(total)} registros
                </Badge>
              )}
              {bitacoraQuery.isFetching && bitacoraQuery.isPlaceholderData && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Consultando…
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(filters.tamano)}
                onValueChange={(val) => {
                  if (!val) return
                  const parsed = Number.parseInt(val, 10)
                  if (!Number.isNaN(parsed)) {
                    onUpdateFilters({ tamano: parsed, pagina: 1 })
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Filas por página"
                  className="font-mono text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BITACORA_PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void bitacoraQuery.refetch()}
                disabled={bitacoraQuery.isFetching}
              >
                <RefreshCw
                  className={cn('size-3.5', bitacoraQuery.isFetching && 'animate-spin')}
                />
                Refrescar
              </Button>
            </div>
          </div>

          {/* Pills multi-select de estado */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estado">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Estados:</span>
            {ESTADOS_BITACORA.map((estado) => {
              const meta = ESTADO_BITACORA_META[estado]
              const selected = filters.estados.includes(estado)
              return (
                <button
                  key={estado}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleToggleEstado(estado)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/20'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
                  <span>{meta.label}</span>
                </button>
              )
            })}

            {filters.estados.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onUpdateFilters({ estados: [], pagina: 1 })}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Quitar estados ({filters.estados.length})
              </Button>
            )}
          </div>

          {/* Fila de filtros: tabla_destino, id_corrida, desde, hasta, limpiar */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
            {/* tabla_destino */}
            <div className="space-y-1 xl:col-span-3">
              <Label htmlFor="bitacora-tabla-filter" className="text-[11px] text-muted-foreground">
                Tabla destino (LIKE)
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bitacora-tabla-filter"
                  value={tablaInput}
                  onChange={(e) => setDraftTabla(e.target.value)}
                  maxLength={BITACORA_MAX_TABLA_LENGTH}
                  list="bitacora-catalog-tables"
                  placeholder="Ej. Silver.Fact_Cosecha…"
                  className="pr-8 pl-8 font-mono text-xs"
                />
                <datalist id="bitacora-catalog-tables">
                  {catalogTables.map((tbl) => (
                    <option key={tbl.nombre} value={tbl.nombre} />
                  ))}
                </datalist>
                {tablaInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTabla(null)
                      onUpdateFilters({ tabla_destino: '', pagina: 1 }, { replace: true })
                    }}
                    aria-label="Limpiar filtro de tabla destino"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* id_corrida */}
            <div className="space-y-1 xl:col-span-3">
              <Label
                htmlFor="bitacora-corrida-filter"
                className="text-[11px] text-muted-foreground"
              >
                ID Corrida (UUID exacto)
              </Label>
              <div className="relative">
                <Fingerprint className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="bitacora-corrida-filter"
                  value={corridaInput}
                  onChange={(e) => setDraftCorrida(e.target.value)}
                  maxLength={BITACORA_MAX_CORRIDA_LENGTH}
                  placeholder="UUID de Control.Corrida…"
                  className="pr-8 pl-8 font-mono text-xs"
                />
                {corridaInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCorrida(null)
                      onUpdateFilters({ id_corrida: '', pagina: 1 }, { replace: true })
                    }}
                    aria-label="Limpiar filtro de ID corrida"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* desde */}
            <div className="space-y-1 xl:col-span-2">
              <Label htmlFor="bitacora-desde-filter" className="text-[11px] text-muted-foreground">
                Desde
              </Label>
              <Input
                id="bitacora-desde-filter"
                type="datetime-local"
                value={desdeLocalValue}
                onChange={(e) => {
                  const val = e.target.value
                  const iso = val ? (toIsoDateTimeParam(val) ?? '') : ''
                  onUpdateFilters({ desde: iso, pagina: 1 })
                }}
                className="font-mono text-xs tabular-nums"
              />
            </div>

            {/* hasta */}
            <div className="space-y-1 xl:col-span-2">
              <Label htmlFor="bitacora-hasta-filter" className="text-[11px] text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="bitacora-hasta-filter"
                type="datetime-local"
                value={hastaLocalValue}
                onChange={(e) => {
                  const val = e.target.value
                  const iso = val ? (toIsoDateTimeParam(val) ?? '') : ''
                  onUpdateFilters({ hasta: iso, pagina: 1 })
                }}
                className="font-mono text-xs tabular-nums"
              />
            </div>

            {/* Limpiar */}
            <div className="flex items-end xl:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetAll}
                disabled={!activeFilters}
                className="w-full"
              >
                <FilterX className="size-3.5" />
                Limpiar filtros
              </Button>
            </div>
          </div>

          {dateRangeWarning && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>
                El límite <strong>Desde</strong> es posterior a <strong>Hasta</strong>; la consulta
                no devolverá resultados hasta ajustar el rango.
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {bitacoraQuery.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={bitacoraQuery.error}
                title="No se pudo consultar la bitácora (/api/v1/auditoria/bitacora)"
                onRetry={() => void bitacoraQuery.refetch()}
              />
            </div>
          ) : bitacoraQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  bitacoraQuery.isPlaceholderData && 'opacity-70 transition-opacity',
                )}
              >
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                        {headerGroup.headers.map((header) => {
                          const canSort = header.column.getCanSort()
                          const sorted = header.column.getIsSorted()
                          const isNumeric =
                            header.column.id === 'filas_insertadas' ||
                            header.column.id === 'filas_rechazadas' ||
                            header.column.id === 'duracion_segundos'
                          const isRight = isNumeric || header.column.id === 'acciones'

                          return (
                            <TableHead
                              key={header.id}
                              className={cn(
                                'h-9 text-xs font-semibold text-muted-foreground',
                                isRight && 'text-right',
                              )}
                            >
                              {header.isPlaceholder ? null : canSort ? (
                                <button
                                  type="button"
                                  onClick={header.column.getToggleSortingHandler()}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                    isRight && 'ml-auto flex-row-reverse',
                                  )}
                                >
                                  <table.FlexRender header={header} />
                                  {sorted === 'asc' ? (
                                    <ArrowUp className="size-3 text-foreground" />
                                  ) : sorted === 'desc' ? (
                                    <ArrowDown className="size-3 text-foreground" />
                                  ) : (
                                    <ArrowUpDown className="size-3 opacity-45" />
                                  )}
                                </button>
                              ) : (
                                <table.FlexRender header={header} />
                              )}
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>

                  <TableBody>
                    {tableRows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={columns.length} className="py-14 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                            <ScrollText className="size-7 text-muted-foreground/60" />
                            <p className="text-sm font-medium text-foreground">
                              {activeFilters
                                ? 'Sin entradas para los filtros aplicados'
                                : 'No hay registros en Auditoria.Log_Carga'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activeFilters
                                ? 'Prueba ampliar el rango de fechas, quitar algún estado o limpiar la tabla destino.'
                                : 'Las cargas registradas por el pipeline ETL aparecerán aquí automáticamente.'}
                            </p>
                            {activeFilters && (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="mt-1"
                                onClick={handleResetAll}
                              >
                                <FilterX className="size-3" />
                                Limpiar todos los filtros
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((row) => (
                        <TableRow
                          key={row.original.id_log}
                          className={cn(
                            row.original.estado.toUpperCase() === 'ERROR' && 'bg-rose-500/[0.03]',
                          )}
                        >
                          {row.getAllCells().map((cell) => (
                            <TableCell key={cell.id} className="py-2.5 align-middle">
                              <table.FlexRender cell={cell} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="metric-value font-mono tabular-nums">
                    Mostrando {formatNumber(startItem)}–{formatNumber(endItem)} de{' '}
                    {formatNumber(total)} · Página {formatNumber(filters.pagina)} de{' '}
                    {formatNumber(pageCount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      aria-label="Primera página"
                      onClick={() => table.firstPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronsLeft className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Siguiente
                      <ChevronRight className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      aria-label="Última página"
                      onClick={() => table.lastPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      <ChevronsRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drawer de detalle individual */}
      <LogDetailSheet
        logPreview={selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null)
        }}
        onFilterByCorrida={handleFilterByCorrida}
      />
    </div>
  )
}
