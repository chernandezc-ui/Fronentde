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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  FileSpreadsheet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import type { RespuestaValidacionCsv } from '../types'

export type DiagnosticViewTab = 'errores' | 'validas'

interface DiagnosticRow {
  fila_id: number
  datos: Record<string, unknown>
  errores?: string[]
}

const DIAGNOSTIC_PAGE_SIZES = [10, 25, 50, 100] as const

const diagnosticTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof diagnosticTableFeatures, DiagnosticRow>()

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

interface CsvDiagnosticTableProps {
  result: RespuestaValidacionCsv
  fileName: string
  tablaDestino: string
  initialView: DiagnosticViewTab
}

export function CsvDiagnosticTable({
  result,
  fileName,
  tablaDestino,
  initialView,
}: CsvDiagnosticTableProps) {
  const [activeView, setActiveView] = useState<DiagnosticViewTab>(initialView)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  const errorCount = result.filas_con_errores.length
  const validCount = result.filas_validas.length

  const activeRows = useMemo<DiagnosticRow[]>(() => {
    if (activeView === 'errores') {
      return result.filas_con_errores
    }
    return result.filas_validas
  }, [activeView, result.filas_con_errores, result.filas_validas])

  const columns = useMemo(() => {
    const baseCols = [
      columnHelper.accessor('fila_id', {
        header: 'Fila #',
        sortFn: (rowA, rowB) => rowA.original.fila_id - rowB.original.fila_id,
        cell: (info) => (
          <span className="metric-value font-mono text-xs font-semibold text-foreground tabular-nums">
            #{info.getValue()}
          </span>
        ),
      }),
    ]

    const errorCol =
      activeView === 'errores'
        ? [
            columnHelper.display({
              id: '__errores',
              header: 'Errores detectados',
              cell: (info) => {
                const errores = info.row.original.errores ?? []
                return (
                  <div className="min-w-[240px] max-w-[360px] space-y-1">
                    {errores.map((err, idx) => (
                      <div
                        key={`${info.row.original.fila_id}-err-${idx}`}
                        className="flex items-start gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] leading-snug text-rose-800 dark:text-rose-200"
                      >
                        <AlertTriangle className="mt-0.5 size-3 shrink-0 text-rose-500" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )
              },
            }),
          ]
        : []

    const dynamicDataCols = result.columnas.map((colName) =>
      columnHelper.display({
        id: `col_${colName}`,
        header: () => (
          <span className="font-mono text-[11px] whitespace-nowrap">{colName}</span>
        ),
        cell: (info) => {
          const formatted = formatCellValue(info.row.original.datos[colName])
          if (formatted.trim().length === 0) {
            return (
              <span className="font-mono text-[11px] text-muted-foreground/60 italic">
                (vacío)
              </span>
            )
          }
          return (
            <span
              className="metric-value block max-w-[220px] truncate font-mono text-xs text-foreground tabular-nums"
              title={formatted}
            >
              {formatted}
            </span>
          )
        },
      }),
    )

    return columnHelper.columns([...baseCols, ...errorCol, ...dynamicDataCols])
  }, [activeView, result.columnas])

  const table = useTable(
    {
      features: diagnosticTableFeatures,
      data: activeRows,
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

  const tableRows = table.getRowModel().rows
  const totalInTab = activeRows.length
  const pageCount = Math.max(1, table.getPageCount())
  const startItem = totalInTab === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const endItem = Math.min(totalInTab, (pagination.pageIndex + 1) * pagination.pageSize)

  const handleSelectView = (next: DiagnosticViewTab) => {
    setActiveView(next)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  return (
    <Card>
      <CardHeader className="space-y-3 border-b pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Resultado de pre-validación CSV en memoria
            </CardTitle>
            <StatusBadge
              label={errorCount > 0 ? 'CON OBSERVACIONES' : 'CSV VALIDO'}
              tone={errorCount > 0 ? 'warning' : 'ok'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span className="truncate max-w-[220px]" title={fileName}>
              {fileName}
            </span>
            <span>→</span>
            <Badge variant="outline" className="font-mono text-[11px]">
              {tablaDestino}
            </Badge>
          </div>
        </div>

        {/* Resumen numérico del diagnóstico */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/25 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Total filas leídas</p>
            <p className="metric-value font-mono text-lg font-semibold tabular-nums">
              {formatNumber(result.total_filas)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/6 px-3 py-2">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Filas válidas</p>
            <p className="metric-value font-mono text-lg font-semibold text-emerald-700 tabular-nums dark:text-emerald-300">
              {formatNumber(validCount)}
            </p>
          </div>
          <div
            className={cn(
              'rounded-lg border px-3 py-2',
              errorCount > 0
                ? 'border-rose-500/30 bg-rose-500/8'
                : 'border-border bg-muted/25',
            )}
          >
            <p
              className={cn(
                'text-[11px]',
                errorCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground',
              )}
            >
              Filas con errores
            </p>
            <p
              className={cn(
                'metric-value font-mono text-lg font-semibold tabular-nums',
                errorCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-foreground',
              )}
            >
              {formatNumber(errorCount)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/25 px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Columns3 className="size-3" />
              Columnas detectadas
            </p>
            <p className="metric-value font-mono text-lg font-semibold tabular-nums">
              {formatNumber(result.columnas.length)}
            </p>
          </div>
        </div>

        {/* Tabs cliente Filas con errores / Filas válidas + tamaño página */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Vistas del diagnóstico CSV"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'errores'}
              onClick={() => handleSelectView('errores')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeView === 'errores'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <AlertTriangle
                className={cn('size-3.5', errorCount > 0 ? 'text-rose-500' : 'opacity-60')}
              />
              <span>Filas con errores</span>
              <span
                className={cn(
                  'metric-value rounded px-1.5 py-0.2 font-mono text-[10px] tabular-nums',
                  errorCount > 0
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {formatNumber(errorCount)}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'validas'}
              onClick={() => handleSelectView('validas')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeView === 'validas'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>Filas válidas</span>
              <span className="metric-value rounded bg-emerald-500/15 px-1.5 py-0.2 font-mono text-[10px] text-emerald-700 tabular-nums dark:text-emerald-300">
                {formatNumber(validCount)}
              </span>
            </button>
          </div>

          <Select
            value={String(pagination.pageSize)}
            onValueChange={(val) => {
              if (!val) return
              const parsed = Number.parseInt(val, 10)
              if (!Number.isNaN(parsed)) {
                setPagination({ pageIndex: 0, pageSize: parsed })
              }
            }}
          >
            <SelectTrigger size="sm" aria-label="Filas por página en diagnóstico" className="font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIAGNOSTIC_PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {tableRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {activeView === 'errores' ? (
              <>
                <CheckCircle2 className="size-7 text-emerald-500" />
                <p className="text-sm font-medium text-foreground">
                  Sin errores detectados en las filas del CSV
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Todas las filas parseadas pasaron las comprobaciones preliminares en memoria.
                  Recuerda que este paso no inserta registros en la base de datos.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="size-7 text-amber-500" />
                <p className="text-sm font-medium text-foreground">
                  No hay filas válidas en este resultado
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Revisa la pestaña de <strong>Filas con errores</strong> para inspeccionar los
                  motivos detectados por fila.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort()
                        const sorted = header.column.getIsSorted()
                        return (
                          <TableHead
                            key={header.id}
                            className="h-9 text-xs font-semibold text-muted-foreground"
                          >
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground"
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
                  {tableRows.map((row) => (
                    <TableRow
                      key={`${activeView}-${row.original.fila_id}`}
                      className={cn(activeView === 'errores' && 'bg-rose-500/[0.04]')}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2 align-top">
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalInTab > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="metric-value font-mono tabular-nums">
                  Mostrando {formatNumber(startItem)}–{formatNumber(endItem)} de{' '}
                  {formatNumber(totalInTab)} · Página {formatNumber(pagination.pageIndex + 1)} de{' '}
                  {formatNumber(pageCount)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label="Primera página del diagnóstico"
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
                    aria-label="Última página del diagnóstico"
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
