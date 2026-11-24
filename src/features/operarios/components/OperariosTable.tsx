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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
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
import { formatNumber } from '@/shared/lib/format'
import { isAlertAsertividad } from '../operariosUtils'
import type { OperarioPersonal } from '../types'
import { AsertividadMeter } from './AsertividadMeter'

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
const ALL_ROLES = '__ALL__'
const NO_ROLE = '__SIN_ROL__'

const operariosTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<
  typeof operariosTableFeatures,
  OperarioPersonal
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

interface OperariosTableProps {
  rows: OperarioPersonal[]
  total: number
  pagina: number
  tamano: number
  isLoading: boolean
  isFetching: boolean
  isPlaceholderData: boolean
  isError: boolean
  error: unknown
  onPaginaChange: (pagina: number) => void
  onTamanoChange: (tamano: number) => void
  onRefresh: () => void
  onSelectOperario: (operario: OperarioPersonal) => void
}

export function OperariosTable({
  rows,
  total,
  pagina,
  tamano,
  isLoading,
  isFetching,
  isPlaceholderData,
  isError,
  error,
  onPaginaChange,
  onTamanoChange,
  onRefresh,
  onSelectOperario,
}: OperariosTableProps) {
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>(ALL_ROLES)
  const [onlyAlert, setOnlyAlert] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const roleOptions = useMemo(() => {
    const distinct = new Set<string>()
    let hasEmpty = false
    for (const row of rows) {
      const r = row.rol?.trim()
      if (r) distinct.add(r)
      else hasEmpty = true
    }
    const sorted = Array.from(distinct).sort((a, b) => a.localeCompare(b, 'es'))
    return { roles: sorted, hasEmpty }
  }, [rows])

  const alertCountInPage = useMemo(
    () => rows.filter((r) => isAlertAsertividad(r.pct_asertividad)).length,
    [rows],
  )

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (onlyAlert && !isAlertAsertividad(item.pct_asertividad)) {
        return false
      }
      if (roleFilter === NO_ROLE) {
        if (item.rol?.trim()) return false
      } else if (roleFilter !== ALL_ROLES) {
        if ((item.rol?.trim() ?? '') !== roleFilter) return false
      }
      if (!q) return true
      return (
        (item.dni?.toLowerCase().includes(q) ?? false) ||
        (item.nombre_completo?.toLowerCase().includes(q) ?? false) ||
        (item.id_planilla?.toLowerCase().includes(q) ?? false) ||
        (item.rol?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [rows, searchText, roleFilter, onlyAlert])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('dni', {
          header: 'DNI',
          cell: (info) => (
            <span className="font-mono text-xs font-medium text-foreground tabular-nums">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('nombre_completo', {
          header: 'Operario',
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="max-w-[260px] space-y-0.5">
                <p
                  className="truncate font-medium text-foreground"
                  title={row.nombre_completo ?? 'Sin nombre registrado'}
                >
                  {row.nombre_completo || (
                    <span className="text-muted-foreground italic">
                      Sin nombre
                    </span>
                  )}
                </p>
                {row.sexo && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Sexo: {row.sexo}
                  </span>
                )}
              </div>
            )
          },
        }),
        columnHelper.accessor('rol', {
          header: 'Rol',
          cell: (info) => {
            const val = info.getValue()?.trim()
            return val ? (
              <Badge variant="outline" className="text-[11px] font-normal">
                {val}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Sin rol
              </span>
            )
          },
        }),
        columnHelper.accessor('id_planilla', {
          header: 'ID Planilla',
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('pct_asertividad', {
          header: 'Asertividad',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.pct_asertividad,
              rowB.original.pct_asertividad,
            ),
          cell: (info) => <AsertividadMeter value={info.getValue()} compact />,
        }),
        columnHelper.accessor('dias_ausentismo', {
          header: 'Ausentismo',
          sortFn: (rowA, rowB) =>
            compareNullableNumbers(
              rowA.original.dias_ausentismo,
              rowB.original.dias_ausentismo,
            ),
          cell: (info) => {
            const val = info.getValue()
            if (val === null || val === undefined) {
              return (
                <span className="block text-right text-xs text-muted-foreground">
                  —
                </span>
              )
            }
            return (
              <span
                className={cn(
                  'metric-value block text-right font-mono text-xs',
                  val >= 5
                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                    : 'text-foreground',
                )}
              >
                {formatNumber(val)} d
              </span>
            )
          },
        }),
        columnHelper.display({
          id: 'acciones',
          header: 'Acciones',
          cell: (info) => (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="xs"
                onClick={() => onSelectOperario(info.row.original)}
              >
                <FileSearch className="size-3" />
                Ver ficha e incidencias
              </Button>
            </div>
          ),
        }),
      ]),
    [onSelectOperario],
  )

  const table = useTable(
    {
      features: operariosTableFeatures,
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

  const roleSelectLabel =
    roleFilter === ALL_ROLES
      ? 'Todos los roles'
      : roleFilter === NO_ROLE
        ? 'Sin rol asignado'
        : roleFilter

  return (
    <Card>
      <CardHeader className="space-y-3 border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-semibold">
              Padrón de Personal (Silver.Dim_Personal)
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
                  onTamanoChange(parsed)
                }
              }}
            >
              <SelectTrigger size="sm" aria-label="Operarios por página">
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
              onClick={onRefresh}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn('size-3.5', isFetching && 'animate-spin')}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Local filters: search, role dropdown, quick <85% alert switch */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar DNI, nombre completo o ID planilla..."
                aria-label="Buscar operario en página actual"
                className="pl-8 text-xs"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(val) => {
                if (val) setRoleFilter(val)
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-[200px]"
                aria-label="Filtrar por rol operativo"
              >
                <SelectValue>{roleSelectLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>Todos los roles</SelectItem>
                {roleOptions.roles.map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {rol}
                  </SelectItem>
                ))}
                {roleOptions.hasEmpty && (
                  <SelectItem value={NO_ROLE}>Sin rol asignado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-2.5 rounded-lg border px-3 py-1.5 transition-colors sm:justify-start',
              onlyAlert
                ? 'border-orange-500/40 bg-orange-500/10'
                : 'border-border bg-muted/30',
            )}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                className={cn(
                  'size-3.5',
                  onlyAlert
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-muted-foreground',
                )}
              />
              <Label
                htmlFor="operarios-only-alert"
                className="cursor-pointer text-xs font-medium"
              >
                Solo alerta de asertividad (&lt;85%)
              </Label>
              <Badge
                variant={alertCountInPage > 0 ? 'secondary' : 'outline'}
                className="h-4 px-1.5 font-mono text-[10px] tabular-nums"
              >
                {alertCountInPage}
              </Badge>
            </div>
            <Switch
              id="operarios-only-alert"
              size="sm"
              checked={onlyAlert}
              onCheckedChange={(checked) => setOnlyAlert(Boolean(checked))}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isError ? (
          <div className="p-4">
            <ApiErrorBanner
              error={error}
              title="Error al cargar el directorio de operarios"
              onRetry={onRefresh}
            />
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Skeleton key={idx} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div
              className={cn(
                'transition-opacity duration-150',
                isPlaceholderData && 'opacity-65',
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
                        const isRight = ['dias_ausentismo', 'acciones'].includes(
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
                          ? 'No hay operarios registrados en Silver.Dim_Personal.'
                          : onlyAlert
                            ? 'Ningún operario en la página actual tiene asertividad medida por debajo de 85%.'
                            : 'No se encontraron operarios que coincidan con la búsqueda o rol seleccionado.'}
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
            </div>

            {total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)}{' '}
                  de {formatNumber(total)} en padrón · Página {pagina} de{' '}
                  {formatNumber(totalPages)}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onPaginaChange(Math.max(1, pagina - 1))}
                    disabled={pagina <= 1 || isFetching}
                  >
                    <ChevronLeft className="size-3.5" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      onPaginaChange(Math.min(totalPages, pagina + 1))
                    }
                    disabled={pagina >= totalPages || isFetching}
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
  )
}
