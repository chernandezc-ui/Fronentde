import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
  type Updater,
} from '@tanstack/react-table'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  FilterX,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import {
  BRONZE_TABLE_SUGGESTIONS,
  ESTADO_FILTRO_OPTIONS,
  getCuarentenaRecordKey,
  isRecordPending,
  mapCuarentenaEstadoTone,
  PAGE_SIZE_OPTIONS,
} from '../cuarentenaUtils'
import type { CuarentenaResumen, EstadoCuarentenaFiltro, RegistroCuarentena } from '../types'

const quarantineTableFeatures = tableFeatures({
  rowPaginationFeature,
})

const columnHelper = createColumnHelper<typeof quarantineTableFeatures, RegistroCuarentena>()

interface QuarantineTableProps {
  rows: RegistroCuarentena[]
  total: number
  pagina: number
  tamano: number
  estado: EstadoCuarentenaFiltro
  tabla: string
  q?: string
  columna?: string
  resumen: CuarentenaResumen | undefined
  isLoading: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  isError: boolean
  error: unknown
  canManageMdm: boolean
  selectedKeys?: ReadonlySet<string>
  onToggleSelect?: (record: RegistroCuarentena, checked: boolean) => void
  onToggleSelectAllPending?: (checked: boolean) => void
  onEstadoChange: (estado: EstadoCuarentenaFiltro) => void
  onTablaChange: (tabla: string) => void
  onQueryChange?: (q: string) => void
  onColumnaChange?: (columna: string) => void
  onPaginaChange: (pagina: number) => void
  onTamanoChange: (tamano: number) => void
  onResetFilters: () => void
  onRefresh: () => void
  onSelectRecord: (record: RegistroCuarentena) => void
}

function getEstadoCount(
  resumen: CuarentenaResumen | undefined,
  estado: EstadoCuarentenaFiltro,
): number | null {
  if (!resumen) return null
  switch (estado) {
    case 'PENDIENTE':
      return resumen.pendientes
    case 'RESUELTO':
      return resumen.resueltos
    case 'DESCARTADO':
      return resumen.descartados
    case 'all':
      return resumen.total
  }
}

export function QuarantineTable({
  rows,
  total,
  pagina,
  tamano,
  estado,
  tabla,
  q = '',
  columna = '',
  resumen,
  isLoading,
  isFetching,
  isPlaceholderData,
  isError,
  error,
  canManageMdm,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAllPending,
  onEstadoChange,
  onTablaChange,
  onQueryChange,
  onColumnaChange,
  onPaginaChange,
  onTamanoChange,
  onResetFilters,
  onRefresh,
  onSelectRecord,
}: QuarantineTableProps) {
  const [draftTabla, setDraftTabla] = useState<string | null>(null)
  const [draftQ, setDraftQ] = useState<string | null>(null)
  const [draftColumna, setDraftColumna] = useState<string | null>(null)
  const tablaInput = draftTabla ?? tabla
  const qInput = draftQ ?? q
  const columnaInput = draftColumna ?? columna

  // Debounce de filtro por tabla_origen hacia URL + servidor
  useEffect(() => {
    if (draftTabla === null) return
    const trimmed = draftTabla.trim()
    const timer = window.setTimeout(() => {
      if (trimmed !== tabla) {
        onTablaChange(trimmed)
      }
      setDraftTabla(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftTabla, tabla, onTablaChange])

  useEffect(() => {
    if (draftQ === null || !onQueryChange) return
    const trimmed = draftQ.trim()
    const timer = window.setTimeout(() => {
      if (trimmed !== q) {
        onQueryChange(trimmed)
      }
      setDraftQ(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftQ, q, onQueryChange])

  useEffect(() => {
    if (draftColumna === null || !onColumnaChange) return
    const trimmed = draftColumna.trim()
    const timer = window.setTimeout(() => {
      if (trimmed !== columna) {
        onColumnaChange(trimmed)
      }
      setDraftColumna(null)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draftColumna, columna, onColumnaChange])

  const pendingRowsInPage = useMemo(
    () => rows.filter((r) => isRecordPending(r.estado)),
    [rows],
  )
  const allPendingSelected =
    pendingRowsInPage.length > 0 &&
    Boolean(selectedKeys) &&
    pendingRowsInPage.every((r) => selectedKeys?.has(getCuarentenaRecordKey(r)))

  const columns = useMemo(
    () =>
      columnHelper.columns([
        ...(canManageMdm && onToggleSelect
          ? [
              columnHelper.display({
                id: 'seleccion',
                header: () => (
                  <Checkbox
                    aria-label="Seleccionar todos los pendientes en página"
                    checked={allPendingSelected}
                    disabled={pendingRowsInPage.length === 0}
                    onCheckedChange={(checked) =>
                      onToggleSelectAllPending?.(Boolean(checked))
                    }
                  />
                ),
                cell: (info) => {
                  const row = info.row.original
                  const pending = isRecordPending(row.estado)
                  const isChecked = Boolean(selectedKeys?.has(getCuarentenaRecordKey(row)))
                  return (
                    <Checkbox
                      aria-label={`Seleccionar registro ${row.id_registro}`}
                      checked={isChecked}
                      disabled={!pending}
                      onCheckedChange={(checked) => onToggleSelect(row, Boolean(checked))}
                    />
                  )
                },
              }),
            ]
          : []),
        columnHelper.accessor('tabla_origen', {
          header: 'Tabla origen',
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="max-w-[230px] space-y-0.5">
                <div
                  className="truncate font-mono text-xs font-medium text-foreground"
                  title={row.tabla_origen}
                >
                  {row.tabla_origen}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                  <span>#{row.id_registro}</span>
                  <span>·</span>
                  <span>
                    {row.id_registro_origen !== null
                      ? `origen:${row.id_registro_origen}`
                      : 'sin ID origen'}
                  </span>
                </div>
              </div>
            )
          },
        }),
        columnHelper.accessor('columna_origen', {
          header: 'Columna',
          cell: (info) => (
            <span className="inline-block max-w-[160px] truncate rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('valor_raw', {
          header: 'Valor crudo / Corregido',
          cell: (info) => {
            const row = info.row.original
            const rawText = row.valor_raw ?? ''
            const hasCorrected = Boolean(row.valor_corregido && row.valor_corregido.trim().length > 0)
            return (
              <div className="max-w-[260px] space-y-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="truncate font-mono text-xs text-foreground" />
                    }
                  >
                    {rawText.length > 0 ? (
                      rawText
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">(vacío)</span>
                    )}
                  </TooltipTrigger>
                  {rawText.length > 0 && (
                    <TooltipContent className="max-w-sm font-mono text-[11px] break-all">
                      Crudo: {rawText}
                    </TooltipContent>
                  )}
                </Tooltip>

                {hasCorrected ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div className="inline-flex max-w-full items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300" />
                      }
                    >
                      <ArrowRight className="size-3 shrink-0" />
                      <span className="truncate font-medium">{row.valor_corregido}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm font-mono text-[11px] break-all">
                      Corregido: {row.valor_corregido}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="font-mono text-[10px] text-muted-foreground/75">
                    Sin valor corregido
                  </div>
                )}
              </div>
            )
          },
        }),
        columnHelper.accessor('motivo', {
          header: 'Motivo',
          cell: (info) => {
            const motivo = info.getValue()
            if (!motivo) {
              return <span className="text-xs text-muted-foreground">—</span>
            }
            return (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="block max-w-[220px] truncate text-xs text-muted-foreground" />
                  }
                >
                  {motivo}
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs break-words">{motivo}</TooltipContent>
              </Tooltip>
            )
          },
        }),
        columnHelper.accessor('nombre_archivo', {
          header: 'Archivo',
          cell: (info) => {
            const archivo = info.getValue()
            if (!archivo) {
              return <span className="font-mono text-xs text-muted-foreground/70">—</span>
            }
            return (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="block max-w-[160px] truncate font-mono text-[11px] text-muted-foreground" />
                  }
                >
                  {archivo}
                </TooltipTrigger>
                <TooltipContent className="max-w-sm font-mono text-[11px] break-all">
                  {archivo}
                </TooltipContent>
              </Tooltip>
            )
          },
        }),
        columnHelper.accessor('fecha_ingreso', {
          header: 'Ingreso',
          cell: (info) => {
            const raw = info.getValue()
            const formatted = raw
              ? /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? raw
                : formatDateTime(raw)
              : '—'
            return (
              <span className="metric-value font-mono text-xs text-muted-foreground tabular-nums">
                {formatted}
              </span>
            )
          },
        }),
        columnHelper.accessor('estado', {
          header: 'Estado',
          cell: (info) => {
            const val = info.getValue()
            return <StatusBadge label={val} tone={mapCuarentenaEstadoTone(val)} />
          },
        }),
        columnHelper.display({
          id: 'acciones',
          header: 'Acción',
          cell: (info) => {
            const row = info.row.original
            const actionable = canManageMdm && isRecordPending(row.estado)
            return (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant={actionable ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => onSelectRecord(row)}
                  aria-label={
                    actionable
                      ? `Inspeccionar y resolver registro ${row.id_registro}`
                      : `Inspeccionar registro ${row.id_registro}`
                  }
                >
                  {actionable ? (
                    <>
                      <Wrench className="size-3" />
                      Resolver
                    </>
                  ) : (
                    <>
                      <Eye className="size-3" />
                      Inspeccionar
                    </>
                  )}
                </Button>
              </div>
            )
          },
        }),
      ]),
    [canManageMdm, onSelectRecord, selectedKeys, onToggleSelect, onToggleSelectAllPending, allPendingSelected, pendingRowsInPage.length],
  )

  const paginationState = useMemo<PaginationState>(
    () => ({
      pageIndex: Math.max(0, pagina - 1),
      pageSize: tamano,
    }),
    [pagina, tamano],
  )

  const handlePaginationChange = (updater: Updater<PaginationState>) => {
    const next = typeof updater === 'function' ? updater(paginationState) : updater
    if (next.pageSize !== paginationState.pageSize) {
      onTamanoChange(next.pageSize)
      return
    }
    const nextPagina = Math.max(1, next.pageIndex + 1)
    if (nextPagina !== pagina) {
      onPaginaChange(nextPagina)
    }
  }

  const table = useTable(
    {
      features: quarantineTableFeatures,
      data: rows,
      columns,
      manualPagination: true,
      rowCount: total,
      state: {
        pagination: paginationState,
      },
      onPaginationChange: handlePaginationChange,
    },
    (state) => ({
      pagination: state.pagination,
    }),
  )

  const tableRows = table.getRowModel().rows
  const pageCount = Math.max(1, table.getPageCount())
  const startItem = total === 0 ? 0 : (pagina - 1) * tamano + 1
  const endItem = Math.min(total, pagina * tamano)
  const hasActiveFilters =
    estado !== 'PENDIENTE' ||
    tabla.length > 0 ||
    tablaInput.trim().length > 0 ||
    q.length > 0 ||
    qInput.trim().length > 0 ||
    columna.length > 0 ||
    columnaInput.trim().length > 0

  return (
    <Card>
      <CardHeader className="space-y-3 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-semibold">
              Bandeja de Cuarentena (MDM.Cuarentena)
            </CardTitle>
            {!isError && (
              <Badge variant="secondary" className="metric-value font-mono text-[11px] tabular-nums">
                {formatNumber(total)} registros
              </Badge>
            )}
            {isFetching && isPlaceholderData && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Actualizando…
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(tamano)}
              onValueChange={(val) => {
                if (!val) return
                const parsed = Number.parseInt(val, 10)
                if (!Number.isNaN(parsed)) {
                  onTamanoChange(parsed)
                }
              }}
            >
              <SelectTrigger size="sm" aria-label="Registros por página" className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isFetching}
                  />
                }
              >
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                Refrescar
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Recarga resumen, bandeja y candidatos. Nota: en Etapa 1 el backend mantiene un TTL
                breve de caché (30s resumen / 60s listado) si alternas estados rápidamente o tras un
                ETL externo.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Barra de filtros: tabs de estado + búsqueda por tabla origen */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
            role="tablist"
            aria-label="Filtrar cuarentena por estado"
          >
            {ESTADO_FILTRO_OPTIONS.map((opt) => {
              const isSelected = estado === opt.value
              const count = getEstadoCount(resumen, opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onEstadoChange(opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{opt.label}</span>
                  {count !== null && (
                    <span
                      className={cn(
                        'metric-value rounded px-1 py-0.2 font-mono text-[10px] tabular-nums',
                        isSelected
                          ? 'bg-muted text-foreground'
                          : 'bg-background/60 text-muted-foreground',
                      )}
                    >
                      {formatNumber(count)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onQueryChange && (
              <div className="relative min-w-[200px] flex-1 sm:w-56 sm:flex-initial">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={qInput}
                  onChange={(e) => setDraftQ(e.target.value)}
                  maxLength={80}
                  placeholder="Buscar texto o DNI (q)..."
                  aria-label="Buscar texto en cuarentena (server-side)"
                  className="pr-7 pl-8 text-xs"
                />
                {qInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftQ(null)
                      onQueryChange('')
                    }}
                    aria-label="Limpiar búsqueda de texto"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {onColumnaChange && (
              <div className="relative min-w-[160px] sm:w-44">
                <Input
                  value={columnaInput}
                  onChange={(e) => setDraftColumna(e.target.value)}
                  maxLength={80}
                  placeholder="Columna origen..."
                  aria-label="Filtrar por columna origen"
                  className="pr-7 font-mono text-xs"
                />
                {columnaInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftColumna(null)
                      onColumnaChange('')
                    }}
                    aria-label="Limpiar filtro de columna"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="relative min-w-[210px] flex-1 sm:w-64 sm:flex-initial">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={tablaInput}
                onChange={(e) => setDraftTabla(e.target.value)}
                list="cuarentena-bronce-tables"
                placeholder="Tabla origen (ej. Peladas)..."
                aria-label="Filtrar por tabla origen"
                className="pr-8 pl-8 font-mono text-xs"
              />
              <datalist id="cuarentena-bronce-tables">
                {BRONZE_TABLE_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {tablaInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftTabla(null)
                    onTablaChange('')
                  }}
                  aria-label="Limpiar filtro de tabla"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftTabla(null)
                  setDraftQ(null)
                  setDraftColumna(null)
                  onResetFilters()
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <FilterX className="size-3.5" />
                Restablecer
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="Información sobre caché de lectura en Etapa 1"
                    className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  />
                }
              >
                <Info className="size-3 shrink-0" />
                <span className="hidden sm:inline">Caché 30–60s</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                En Etapa 1, el backend cachea lecturas brevemente (30s resumen, 60s listado). Las
                acciones de resolver, descartar o reinyectar invalidan la caché automáticamente; si
                cambias rápido de filtro o hubo una corrida ETL externa, pulsa Refrescar.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isError ? (
          <div className="p-4">
            <ApiErrorBanner
              error={error}
              title="No se pudo cargar la bandeja de cuarentena"
              onRetry={onRefresh}
            />
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 7 }).map((_, idx) => (
              <Skeleton key={idx} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className={cn(isPlaceholderData && 'opacity-70 transition-opacity')}>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'h-9 text-xs font-semibold text-muted-foreground',
                            header.column.id === 'acciones' && 'text-right',
                          )}
                        >
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columns.length} className="py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                          <CheckCircle2 className="size-7 text-emerald-500/80" />
                          <p className="text-sm font-medium text-foreground">
                            {hasActiveFilters
                              ? 'Sin registros con los filtros aplicados'
                              : 'Sin registros pendientes en cuarentena'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hasActiveFilters
                              ? 'Prueba limpiar el filtro de tabla origen o cambiar el estado seleccionado.'
                              : 'Todos los registros de entrada cumplen actualmente las reglas de calidad MDM.'}
                          </p>
                          {hasActiveFilters && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="mt-1"
                              onClick={() => {
                                setDraftTabla(null)
                                onResetFilters()
                              }}
                            >
                              <FilterX className="size-3" />
                              Volver a Pendientes sin filtro
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row) => (
                      <TableRow key={`${row.original.tabla_origen}-${row.original.id_registro}`}>
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
                  {formatNumber(total)} · Página {formatNumber(pagina)} de {formatNumber(pageCount)}
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
  )
}
