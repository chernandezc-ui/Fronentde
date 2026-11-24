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
  RefreshCw,
  Search,
  ShieldCheck,
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
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge, type OperationalTone } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import type { ReglaValidacion } from '../types'
import { useReglas } from '../useConfiguracionQueries'

type EstadoReglaFiltro = 'TODAS' | 'ACTIVAS' | 'INACTIVAS'

const ESTADO_OPTIONS: { value: EstadoReglaFiltro; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'ACTIVAS', label: 'Activas' },
  { value: 'INACTIVAS', label: 'Inactivas' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
const EMPTY_REGLAS: ReglaValidacion[] = []

const reglasTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<
  typeof reglasTableFeatures,
  ReglaValidacion
>()

function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  const aMissing = a === null || a === undefined || Number.isNaN(a)
  const bMissing = b === null || b === undefined || Number.isNaN(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return -1
  if (bMissing) return 1
  return a - b
}

function mapAccionToTone(accion: string | null | undefined): OperationalTone {
  const norm = (accion ?? '').toUpperCase().trim()
  if (norm.includes('RECHAZ') || norm.includes('BLOQ') || norm.includes('ERROR')) {
    return 'error'
  }
  if (norm.includes('CUARENTENA')) {
    return 'warning'
  }
  if (norm.includes('WARN') || norm.includes('ADVERT') || norm.includes('ALERT')) {
    return 'pending'
  }
  return 'neutral'
}

interface ReglasTabProps {
  active: boolean
}

export function ReglasTab({ active }: ReglasTabProps) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<number>(50)
  const [searchText, setSearchText] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoReglaFiltro>('TODAS')
  const [sorting, setSorting] = useState<SortingState>([])

  const query = useReglas(pagina, tamano, active)
  const rows = query.data?.datos ?? EMPTY_REGLAS
  const totalReglas = query.data?.total ?? 0
  const kpis = query.data?.kpis ?? { total: 0, activas: 0, inactivas: 0 }

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (estadoFiltro === 'ACTIVAS' && !item.activo) return false
      if (estadoFiltro === 'INACTIVAS' && item.activo) return false
      if (!q) return true
      return (
        (item.tabla_destino?.toLowerCase().includes(q) ?? false) ||
        (item.columna?.toLowerCase().includes(q) ?? false) ||
        (item.tipo_validacion?.toLowerCase().includes(q) ?? false) ||
        (item.accion?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, searchText, estadoFiltro])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('tabla_destino', {
          header: 'Tabla destino',
          cell: (info) => (
            <span className="font-mono text-xs font-medium text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('columna', {
          header: 'Columna',
          cell: (info) => (
            <span className="font-mono text-xs text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('tipo_validacion', {
          header: 'Tipo validación',
          cell: (info) => {
            const val = info.getValue()
            return val ? (
              <Badge variant="outline" className="font-mono text-[11px] font-normal">
                {val}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )
          },
        }),
        columnHelper.accessor('valor_min', {
          header: 'Mínimo',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.valor_min,
              rowB.original.valor_min,
            ),
          cell: (info) => (
            <span className="metric-value block text-right font-mono text-xs text-foreground">
              {formatNumber(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('valor_max', {
          header: 'Máximo',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.valor_max,
              rowB.original.valor_max,
            ),
          cell: (info) => (
            <span className="metric-value block text-right font-mono text-xs text-foreground">
              {formatNumber(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('accion', {
          header: 'Acción',
          cell: (info) => {
            const val = info.getValue()
            return val ? (
              <StatusBadge
                label={val}
                tone={mapAccionToTone(val)}
                showDot={false}
              />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )
          },
        }),
        columnHelper.accessor('activo', {
          header: 'Estado',
          sortFn: (rowA, rowB) =>
            Number(rowA.original.activo) - Number(rowB.original.activo),
          cell: (info) =>
            info.getValue() ? (
              <StatusBadge label="ACTIVA" tone="ok" />
            ) : (
              <StatusBadge label="INACTIVA" tone="cancelled" />
            ),
        }),
      ]),
    [],
  )

  const table = useTable(
    {
      features: reglasTableFeatures,
      data: filteredData,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
    },
    (state) => ({ sorting: state.sorting }),
  )

  const tableRows = table.getRowModel().rows
  const totalPages = Math.max(1, Math.ceil(totalReglas / tamano))
  const rangeStart = totalReglas === 0 ? 0 : (pagina - 1) * tamano + 1
  const rangeEnd = Math.min(totalReglas, pagina * tamano)

  return (
    <div className="space-y-4">
      {/* 3 KPIs from backend kpis object */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total de reglas
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                  {formatNumber(kpis.total)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Catálogo Config.Reglas_Validacion
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Reglas activas
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {formatNumber(kpis.activas)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                En evaluación durante el pipeline DQ
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
                Reglas inactivas
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-muted-foreground">
                  {formatNumber(kpis.inactivas)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Deshabilitadas temporalmente en BD
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Slash className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Paginated Table */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Reglas de Validación (Config.Reglas_Validacion)
              </CardTitle>
              <StatusBadge label="Solo lectura · Etapa 2" tone="readonly" />
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(filteredData.length)} visibles ·{' '}
                {formatNumber(totalReglas)} total
              </Badge>
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
                <SelectTrigger size="sm" aria-label="Reglas por página">
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
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar tabla, columna, tipo o acción..."
                aria-label="Buscar reglas de validación en página actual"
                className="pl-8 text-xs"
              />
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar reglas por estado"
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
                title="Error al cargar reglas de validación"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'overflow-x-auto transition-opacity duration-150',
                  query.isPlaceholderData && 'opacity-65',
                )}
              >
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="bg-muted/30 hover:bg-muted/30"
                      >
                        {headerGroup.headers.map((header) => {
                          const isRight = ['valor_min', 'valor_max'].includes(
                            header.column.id,
                          )
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
                            ? 'No hay reglas registradas en Config.Reglas_Validacion.'
                            : 'No se encontraron reglas con los filtros aplicados en esta página.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(!row.original.activo && 'opacity-70')}
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
              </div>

              {totalReglas > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)}{' '}
                    de {formatNumber(totalReglas)} · Página {pagina} de{' '}
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
                      onClick={() =>
                        setPagina((p) => Math.min(totalPages, p + 1))
                      }
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
    </div>
  )
}
