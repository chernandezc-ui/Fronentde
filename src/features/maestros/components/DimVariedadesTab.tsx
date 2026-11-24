import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Slash,
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
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import type { DimVariedad } from '../types'
import {
  useDimVariedades,
  useToggleDimVariedadMutation,
} from '../useMaestrosQueries'
import { ConfirmVarietyToggleDialog } from './ConfirmVarietyToggleDialog'
import { CreateVarietyDialog } from './CreateVarietyDialog'

type EstadoFiltro = 'TODAS' | 'ACTIVAS' | 'INACTIVAS'

const ESTADO_OPTIONS: { value: EstadoFiltro; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'ACTIVAS', label: 'Activas' },
  { value: 'INACTIVAS', label: 'Inactivas' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const
const EMPTY_ROWS: DimVariedad[] = []

const variedadTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof variedadTableFeatures, DimVariedad>()

interface DimVariedadesTabProps {
  canAdmin: boolean
}

export function DimVariedadesTab({ canAdmin }: DimVariedadesTabProps) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<number>(50)
  const [searchText, setSearchText] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODAS')
  const [sorting, setSorting] = useState<SortingState>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<DimVariedad | null>(null)

  const query = useDimVariedades(pagina, tamano)
  const toggleMutation = useToggleDimVariedadMutation()

  const rows = query.data?.datos ?? EMPTY_ROWS
  const totalRegistradas = query.data?.total ?? 0

  const kpis = useMemo(() => {
    let activas = 0
    let inactivas = 0
    for (const r of rows) {
      if (r.es_activa) activas += 1
      else inactivas += 1
    }
    return { activas, inactivas }
  }, [rows])

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (estadoFiltro === 'ACTIVAS' && !item.es_activa) return false
      if (estadoFiltro === 'INACTIVAS' && item.es_activa) return false
      if (!q) return true
      return (
        String(item.id_variedad).includes(q) ||
        item.nombre_variedad.toLowerCase().includes(q) ||
        (item.breeder?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, searchText, estadoFiltro])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('id_variedad', {
          header: 'ID',
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              #{info.getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('nombre_variedad', {
          header: 'Nombre variedad',
          cell: (info) => (
            <span className="font-medium text-foreground">{info.getValue()}</span>
          ),
        }),
        columnHelper.accessor('breeder', {
          header: 'Breeder',
          cell: (info) => {
            const val = info.getValue()
            return val ? (
              <span className="text-xs text-foreground">{val}</span>
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">
                Sin especificar
              </span>
            )
          },
        }),
        columnHelper.accessor('es_activa', {
          header: 'Estado',
          cell: (info) =>
            info.getValue() ? (
              <StatusBadge label="ACTIVA" tone="ok" />
            ) : (
              <StatusBadge label="INACTIVA" tone="cancelled" />
            ),
        }),
        columnHelper.accessor('fecha_creacion', {
          header: 'Creación',
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatDateTime(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('fecha_modificacion', {
          header: 'Última modificación',
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
            const isActiva = row.es_activa

            if (!canAdmin) {
              return (
                <div className="flex justify-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className="inline-flex cursor-not-allowed"
                          tabIndex={0}
                        />
                      }
                    >
                      <Button variant="outline" size="xs" disabled>
                        {isActiva ? (
                          <>
                            <Power className="size-3" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <RotateCcw className="size-3" />
                            Reactivar
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Requiere rol admin para activar o desactivar variedades DWH.
                    </TooltipContent>
                  </Tooltip>
                </div>
              )
            }

            return (
              <div className="flex justify-end">
                <Button
                  variant={isActiva ? 'outline' : 'secondary'}
                  size="xs"
                  onClick={() => setToggleTarget(row)}
                  className={cn(
                    isActiva &&
                      'text-rose-700 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200',
                  )}
                >
                  {isActiva ? (
                    <>
                      <Power className="size-3" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-3" />
                      Reactivar
                    </>
                  )}
                </Button>
              </div>
            )
          },
        }),
      ]),
    [canAdmin],
  )

  const table = useTable(
    {
      features: variedadTableFeatures,
      data: filteredData,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
    },
    (state) => ({ sorting: state.sorting }),
  )

  const tableRows = table.getRowModel().rows
  const totalPages = Math.max(1, Math.ceil(totalRegistradas / tamano))
  const rangeStart = totalRegistradas === 0 ? 0 : (pagina - 1) * tamano + 1
  const rangeEnd = Math.min(totalRegistradas, pagina * tamano)

  const handleConfirmToggle = (variedad: DimVariedad) => {
    toggleMutation.mutate(
      { idVariedad: variedad.id_variedad, activar: !variedad.es_activa },
      {
        onSettled: () => setToggleTarget(null),
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total registradas
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                  {formatNumber(totalRegistradas)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Dimensión homologada Silver.Dim_Variedad
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Layers className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Activas en página
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {formatNumber(kpis.activas)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                De {formatNumber(rows.length)} cargadas en página {pagina}
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Inactivas en página
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-muted-foreground">
                  {formatNumber(kpis.inactivas)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Desactivadas (soft-delete trazable)
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Slash className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main CRUD Table Card */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Variedades DWH (Silver.Dim_Variedad)
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(filteredData.length)} visibles ·{' '}
                {formatNumber(totalRegistradas)} total
              </Badge>
              {!canAdmin && <StatusBadge label="Solo lectura (viewer)" tone="readonly" />}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(tamano)}
                onValueChange={(val) => {
                  if (!val) return
                  const parsed = Number(val)
                  if (!Number.isNaN(parsed)) {
                    setTamano(parsed)
                    setPagina(1)
                  }
                }}
              >
                <SelectTrigger size="sm" aria-label="Registros por página">
                  <SelectValue>{tamano} / pág</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw
                  className={cn('size-3.5', query.isFetching && 'animate-spin')}
                />
                Actualizar
              </Button>

              {canAdmin ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  Nueva variedad
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span
                        className="inline-flex cursor-not-allowed"
                        tabIndex={0}
                      />
                    }
                  >
                    <Button size="sm" disabled>
                      <Plus className="size-3.5" />
                      Nueva variedad
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Solo usuarios con rol admin pueden crear variedades en Silver.Dim_Variedad.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por ID, nombre de variedad o breeder..."
                aria-label="Buscar variedades DWH en página actual"
                className="pl-8 text-xs"
              />
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar variedades por estado"
            >
              {ESTADO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstadoFiltro(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    estadoFiltro === opt.value
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
          {query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al cargar Silver.Dim_Variedad"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
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
                    <TableRow
                      key={headerGroup.id}
                      className="bg-muted/30 hover:bg-muted/30"
                    >
                      {headerGroup.headers.map((header) => {
                        const isRight = header.column.id === 'acciones'
                        const canSort = header.column.getCanSort()
                        const sorted = header.column.getIsSorted()
                        return (
                          <TableHead
                            key={header.id}
                            aria-sort={
                              sorted === 'asc'
                                ? 'ascending'
                                : sorted === 'desc'
                                  ? 'descending'
                                  : undefined
                            }
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
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        {rows.length === 0
                          ? 'No hay variedades registradas en Silver.Dim_Variedad.'
                          : 'No se encontraron variedades con los filtros locales aplicados.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(!row.original.es_activa && 'opacity-75')}
                      >
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

              {totalRegistradas > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} de{' '}
                    {formatNumber(totalRegistradas)} · Página {pagina} de{' '}
                    {formatNumber(totalPages)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina <= 1 || query.isFetching}
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPagina((p) => Math.min(totalPages, p + 1))}
                      disabled={pagina >= totalPages || query.isFetching}
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

      {canAdmin && (
        <CreateVarietyDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      <ConfirmVarietyToggleDialog
        target={toggleTarget}
        isPending={toggleMutation.isPending}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
      />
    </div>
  )
}
