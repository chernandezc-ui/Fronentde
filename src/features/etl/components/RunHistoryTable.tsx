import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Radio,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatDuration, formatNumber } from '@/shared/lib/format'
import type { HistorialCorrida } from '../types'

type EstadoFilter = 'TODOS' | 'OK' | 'ERROR' | 'EN_PROCESO' | 'CANCELADO'

const ESTADO_FILTERS: { value: EstadoFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'OK', label: 'OK' },
  { value: 'ERROR', label: 'Error' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const VALID_TABLE_PATTERN = /^[A-Za-z0-9_]+\.[A-Za-z0-9_]+$/

const historyTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof historyTableFeatures, HistorialCorrida>()

function matchesEstadoFilter(estado: string, filter: EstadoFilter): boolean {
  if (filter === 'TODOS') return true
  const norm = estado.toUpperCase().trim()
  if (filter === 'OK') return ['OK', 'COMPLETADO', 'EXITOSO'].includes(norm)
  if (filter === 'ERROR') return ['ERROR', 'FALLIDO', 'TIMEOUT'].includes(norm)
  if (filter === 'EN_PROCESO') return ['EN_PROCESO', 'EJECUTANDO', 'PENDIENTE', 'PROCESANDO'].includes(norm)
  if (filter === 'CANCELADO') return norm === 'CANCELADO'
  return norm === filter
}

interface RunHistoryTableProps {
  rows: HistorialCorrida[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  limite: number
  onLimiteChange: (limite: number) => void
  onRefresh: () => void
  onInspectRun: (idCorrida: string) => void
  onPreviewTable: (tabla: string) => void
}

export function RunHistoryTable({
  rows,
  isLoading,
  isFetching,
  isError,
  error,
  limite,
  onLimiteChange,
  onRefresh,
  onInspectRun,
  onPreviewTable,
}: RunHistoryTableProps) {
  const [searchText, setSearchText] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('TODOS')
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  })

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (!matchesEstadoFilter(item.estado, estadoFilter)) return false
      if (!q) return true
      return (
        item.nombre_proceso.toLowerCase().includes(q) ||
        item.tabla_destino.toLowerCase().includes(q) ||
        (item.nombre_archivo?.toLowerCase().includes(q) ?? false) ||
        (item.id_corrida?.toLowerCase().includes(q) ?? false) ||
        (item.mensaje_error?.toLowerCase().includes(q) ?? false) ||
        String(item.id_log).includes(q)
      )
    })
  }, [rows, searchText, estadoFilter])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('nombre_proceso', {
        header: 'Proceso',
        cell: (info) => {
          const row = info.row.original
          return (
            <div className="max-w-[260px] space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium text-foreground" title={row.nombre_proceso}>
                  {row.nombre_proceso}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
                  #{row.id_log}
                </span>
              </div>
              {row.nombre_archivo && (
                <div className="truncate font-mono text-[11px] text-muted-foreground" title={row.nombre_archivo}>
                  {row.nombre_archivo}
                </div>
              )}
              {row.mensaje_error && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex max-w-full items-center gap-1 truncate font-mono text-[11px] text-rose-600 dark:text-rose-400" />
                    }
                  >
                    <AlertCircle className="size-3 shrink-0" />
                    <span className="truncate">{row.mensaje_error}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md font-mono text-[11px] break-words">
                    {row.mensaje_error}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('tabla_destino', {
        header: 'Tabla destino',
        cell: (info) => (
          <span className="font-mono text-xs text-foreground">{info.getValue() || '—'}</span>
        ),
      }),
      columnHelper.accessor('estado', {
        header: 'Estado',
        cell: (info) => <StatusBadge label={info.getValue()} />,
      }),
      columnHelper.accessor('filas_insertadas', {
        header: 'Insertadas',
        cell: (info) => (
          <span className="block text-right font-mono text-xs tabular-nums">
            {formatNumber(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('filas_rechazadas', {
        header: 'Rechazadas',
        cell: (info) => {
          const val = info.getValue()
          return (
            <span
              className={cn(
                'block text-right font-mono text-xs tabular-nums',
                val > 0 ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}
            >
              {formatNumber(val)}
            </span>
          )
        },
      }),
      columnHelper.accessor('duracion_segundos', {
        header: 'Duración',
        cell: (info) => (
          <span className="block text-right font-mono text-xs text-muted-foreground tabular-nums">
            {formatDuration(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('fecha_inicio', {
        header: 'Inicio',
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'acciones',
        header: 'Acciones',
        cell: (info) => {
          const row = info.row.original
          const canPreview = VALID_TABLE_PATTERN.test(row.tabla_destino.trim())
          return (
            <div className="flex items-center justify-end gap-1">
              {row.id_corrida && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onInspectRun(row.id_corrida!)}
                      />
                    }
                  >
                    <Radio className="size-3" />
                    Inspeccionar
                  </TooltipTrigger>
                  <TooltipContent>
                    Abrir corrida {row.id_corrida.slice(0, 8)} en el monitor
                  </TooltipContent>
                </Tooltip>
              )}
              {canPreview && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Vista previa de ${row.tabla_destino}`}
                        onClick={() => onPreviewTable(row.tabla_destino.trim())}
                      />
                    }
                  >
                    <Eye className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Vista previa de {row.tabla_destino}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      }),
    ]),
    [onInspectRun, onPreviewTable],
  )

  const table = useTable(
    {
      features: historyTableFeatures,
      data: filteredData,
      columns,
      state: {
        sorting,
        pagination,
      },
      onSortingChange: setSorting,
      onPaginationChange: setPagination,
    },
    (state) => ({
      sorting: state.sorting,
      pagination: state.pagination,
    }),
  )

  const pageRows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const currentPage = table.state.pagination.pageIndex + 1

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Historial de cargas (Auditoria.Log_Carga)
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                {formatNumber(filteredData.length)} registros
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={String(limite)}
                onValueChange={(val) => {
                  if (!val) return
                  const parsed = Number(val)
                  if (!Number.isNaN(parsed)) {
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                    onLimiteChange(parsed)
                  }
                }}
              >
                <SelectTrigger size="sm" aria-label="Límite de registros">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Últimos 50</SelectItem>
                  <SelectItem value="100">Últimos 100</SelectItem>
                  <SelectItem value="200">Últimos 200</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isFetching}
              >
                <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
                placeholder="Buscar proceso, tabla, archivo, UUID o error..."
                aria-label="Filtrar historial ETL"
                className="pl-8 text-xs"
              />
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar por estado"
            >
              {ESTADO_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setEstadoFilter(opt.value)
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    estadoFilter === opt.value
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={error}
                title="Error al cargar historial ETL"
                onRetry={onRefresh}
              />
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                      {headerGroup.headers.map((header) => {
                        const isRight = ['filas_insertadas', 'filas_rechazadas', 'duracion_segundos', 'acciones'].includes(
                          header.column.id,
                        )
                        const canSort = header.column.getCanSort()
                        const sorted = header.column.getIsSorted()
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
                                  'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                                  isRight && 'ml-auto flex-row-reverse',
                                )}
                              >
                                <table.FlexRender header={header} />
                                {sorted === 'asc' ? (
                                  <ArrowUp className="size-3" />
                                ) : sorted === 'desc' ? (
                                  <ArrowDown className="size-3" />
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
                  {pageRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        No se encontraron registros en el historial con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageRows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getAllCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {filteredData.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Página {currentPage} de {Math.max(1, pageCount)} · {formatNumber(filteredData.length)} filas
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      Siguiente
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
