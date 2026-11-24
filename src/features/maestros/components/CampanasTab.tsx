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
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { API_ENDPOINTS, isEndpointNotImplementedError } from '@/shared/api/endpoints'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { EndpointPendingBanner } from '@/shared/components/EndpointPendingBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import type { CampanaItem } from '../types'
import { useCampanas, useToggleCampanaEstadoMutation } from '../useMaestrosQueries'
import { CampanaFormDialog } from './CampanaFormDialog'

const EMPTY_ROWS: CampanaItem[] = []

const campanaTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof campanaTableFeatures, CampanaItem>()

interface CampanasTabProps {
  active: boolean
  canAdmin: boolean
}

export function CampanasTab({ active, canAdmin }: CampanasTabProps) {
  const [pagina] = useState(1)
  const [tamano] = useState(50)
  const [sorting, setSorting] = useState<SortingState>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CampanaItem | null>(null)

  const query = useCampanas(pagina, tamano, active)
  const toggleMutation = useToggleCampanaEstadoMutation()

  const rows = query.data?.datos ?? EMPTY_ROWS
  const total = query.data?.total ?? 0
  const isBackendPending = query.isError && isEndpointNotImplementedError(query.error)

  const stats = useMemo(() => {
    let activas = 0
    let cerradas = 0
    for (const c of rows) {
      if (c.es_activa) activas += 1
      if (c.cerrada) cerradas += 1
    }
    return { activas, cerradas }
  }, [rows])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('codigo', {
          header: 'Código',
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground">
              {info.getValue() || `#${info.row.original.id_campana}`}
            </span>
          ),
        }),
        columnHelper.accessor('nombre_campana', {
          header: 'Campaña',
          cell: (info) => (
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">{info.getValue()}</p>
              {info.row.original.descripcion && (
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {info.row.original.descripcion}
                </p>
              )}
            </div>
          ),
        }),
        columnHelper.accessor('fecha_inicio', {
          header: 'Inicio',
          cell: (info) => (
            <span className="font-mono text-xs tabular-nums">{info.getValue()?.slice(0, 10) || '—'}</span>
          ),
        }),
        columnHelper.accessor('fecha_fin', {
          header: 'Cierre',
          cell: (info) => (
            <span className="font-mono text-xs tabular-nums">{info.getValue()?.slice(0, 10) || '—'}</span>
          ),
        }),
        columnHelper.accessor('es_activa', {
          header: 'Estado',
          cell: (info) =>
            info.getValue() ? (
              <StatusBadge label="ACTIVA" tone="ok" />
            ) : info.row.original.cerrada ? (
              <StatusBadge label="CERRADA" tone="cancelled" />
            ) : (
              <StatusBadge label="INACTIVA" tone="neutral" />
            ),
        }),
        columnHelper.display({
          id: 'acciones',
          header: 'Acciones',
          cell: (info) => {
            const item = info.row.original
            if (!canAdmin) {
              return <span className="text-[11px] text-muted-foreground">Solo lectura</span>
            }
            return (
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setEditingItem(item)
                    setDialogOpen(true)
                  }}
                >
                  <Pencil className="size-3" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({
                      idCampana: item.id_campana,
                      activar: !item.es_activa,
                    })
                  }
                >
                  {item.es_activa ? (
                    <>
                      <Lock className="size-3 text-amber-600" />
                      Cerrar
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Activar
                    </>
                  )}
                </Button>
              </div>
            )
          },
        }),
      ]),
    [canAdmin, toggleMutation],
  )

  const table = useTable(
    {
      features: campanaTableFeatures,
      data: rows,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
    },
    (state) => ({ sorting: state.sorting }),
  )

  const tableRows = table.getRowModel().rows

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Campañas registradas</p>
              <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                {formatNumber(total)}
              </p>
              <p className="text-[11px] text-muted-foreground">Dimensión Silver.Dim_Campana</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <CalendarRange className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Campañas activas</p>
              <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                {formatNumber(stats.activas)}
              </p>
              <p className="text-[11px] text-muted-foreground">Habilitadas para ingesta actual</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <CalendarCheck2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Campañas cerradas</p>
              <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-muted-foreground">
                {formatNumber(stats.cerradas)}
              </p>
              <p className="text-[11px] text-muted-foreground">Históricas / solo consulta</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Lock className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Gestión de Campañas Agrícolas (Silver.Dim_Campana)
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                {formatNumber(rows.length)} visibles
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw className={cn('size-3.5', query.isFetching && 'animate-spin')} />
                Actualizar
              </Button>
              {canAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null)
                    setDialogOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Nueva campaña
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isBackendPending ? (
            <div className="p-4">
              <EndpointPendingBanner
                title="Catálogo y CRUD de Campañas listo para conectar"
                method="GET"
                endpoint={API_ENDPOINTS.maestros.campanasBase}
                description="Al implementar /api/v1/catalogos/campanas en el backend podrás listar, crear, editar y cerrar campañas desde aquí."
                onRetry={() => void query.refetch()}
                isRetrying={query.isFetching}
              />
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al consultar campañas"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
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
                              className="inline-flex items-center gap-1 hover:text-foreground"
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
                      className="py-10 text-center text-xs text-muted-foreground"
                    >
                      No hay campañas registradas.
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
          )}
        </CardContent>
      </Card>

      <CampanaFormDialog
        open={dialogOpen}
        item={editingItem}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
