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
  ChevronLeft,
  ChevronRight,
  Info,
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
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import type { MdmVariedad } from '../types'
import { useMdmVariedades } from '../useMaestrosQueries'

type EstadoFiltro = 'TODAS' | 'ACTIVAS' | 'INACTIVAS'

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const
const EMPTY_ROWS: MdmVariedad[] = []

const mdmTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof mdmTableFeatures, MdmVariedad>()

interface MdmVariedadesTabProps {
  active: boolean
}

export function MdmVariedadesTab({ active }: MdmVariedadesTabProps) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<number>(50)
  const [searchText, setSearchText] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODAS')
  const [sorting, setSorting] = useState<SortingState>([])

  const query = useMdmVariedades(pagina, tamano, active)
  const rows = query.data?.datos ?? EMPTY_ROWS
  const total = query.data?.total ?? 0

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (estadoFiltro === 'ACTIVAS' && !item.es_activa) return false
      if (estadoFiltro === 'INACTIVAS' && item.es_activa) return false
      if (!q) return true
      return (
        item.nombre_canonico.toLowerCase().includes(q) ||
        (item.breeder?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, searchText, estadoFiltro])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('nombre_canonico', {
          header: 'Nombre canónico',
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
      ]),
    [],
  )

  const table = useTable(
    {
      features: mdmTableFeatures,
      data: filteredData,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
    },
    (state) => ({ sorting: state.sorting }),
  )

  const tableRows = table.getRowModel().rows
  const totalPages = Math.max(1, Math.ceil(total / tamano))
  const rangeStart = total === 0 ? 0 : (pagina - 1) * tamano + 1
  const rangeEnd = Math.min(total, pagina * tamano)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/6 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <p>
            <span className="font-medium text-foreground">
              MDM.Catalogo_Variedades
            </span>{' '}
            se expone en modo solo lectura durante Etapa 1. La edición directa del catálogo canónico MDM y reglas de sinónimos se habilitará en Etapa 2.
          </p>
        </div>
        <StatusBadge
          label="Solo lectura · Etapa 2"
          tone="readonly"
          className="shrink-0 self-start sm:self-center"
        />
      </div>

      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Catálogo MDM de Variedades
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(filteredData.length)} visibles ·{' '}
                {formatNumber(total)} total
              </Badge>
            </div>

            <div className="flex items-center gap-2">
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
                <SelectTrigger size="sm" aria-label="Registros por página MDM">
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
                placeholder="Buscar nombre canónico o breeder..."
                aria-label="Buscar en catálogo MDM"
                className="pl-8 text-xs"
              />
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar catálogo MDM por estado"
            >
              {(
                [
                  { value: 'TODAS', label: 'Todas' },
                  { value: 'ACTIVAS', label: 'Activas' },
                  { value: 'INACTIVAS', label: 'Inactivas' },
                ] as const
              ).map((opt) => (
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
                title="Error al cargar MDM.Catalogo_Variedades"
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
                            className="h-9 text-xs font-semibold text-muted-foreground"
                          >
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
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
                        No se encontraron registros en el catálogo MDM con los filtros actuales.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row) => (
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

              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} de{' '}
                    {formatNumber(total)} · Página {pagina} de{' '}
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
    </div>
  )
}
