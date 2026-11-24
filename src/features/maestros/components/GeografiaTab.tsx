import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  FlaskConical,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  X,
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
import {
  GEOGRAFIA_FILTER_MAX_LEN,
  GEOGRAFIA_PAGE_SIZES,
  buildGeografiaQueryParams,
  getGeografiaIdentifier,
  normalizeGeografiaPage,
  normalizeGeografiaPageSize,
} from '../schemas'
import type { GeografiaItem } from '../types'
import {
  useDebouncedValue,
  useGeografia,
  useToggleGeografiaVigenciaMutation,
} from '../useMaestrosQueries'
import { GeografiaFormDialog } from './GeografiaFormDialog'

const EMPTY_ROWS: GeografiaItem[] = []

const geografiaTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<typeof geografiaTableFeatures, GeografiaItem>()

interface GeografiaTabProps {
  active: boolean
  canAdmin: boolean
}

export function GeografiaTab({ active, canAdmin }: GeografiaTabProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeografiaItem | null>(null)
  const toggleVigenciaMutation = useToggleGeografiaVigenciaMutation()

  const urlTexto = searchParams.get('texto') ?? ''
  const urlFundo = searchParams.get('fundo') ?? ''
  const urlSector = searchParams.get('sector') ?? ''
  const pagina = normalizeGeografiaPage(searchParams.get('geo_pagina'))
  const tamano = normalizeGeografiaPageSize(searchParams.get('geo_tamano'))

  const [textoInput, setTextoInput] = useState(urlTexto)
  const [fundoInput, setFundoInput] = useState(urlFundo)
  const [sectorInput, setSectorInput] = useState(urlSector)
  const [prevUrlFilters, setPrevUrlFilters] = useState({
    texto: urlTexto,
    fundo: urlFundo,
    sector: urlSector,
  })
  const [sorting, setSorting] = useState<SortingState>([])

  // Keep local inputs synchronized if URL changes via navigation (e.g. Back/Forward)
  if (
    prevUrlFilters.texto !== urlTexto ||
    prevUrlFilters.fundo !== urlFundo ||
    prevUrlFilters.sector !== urlSector
  ) {
    setPrevUrlFilters({ texto: urlTexto, fundo: urlFundo, sector: urlSector })
    if (prevUrlFilters.texto !== urlTexto) setTextoInput(urlTexto)
    if (prevUrlFilters.fundo !== urlFundo) setFundoInput(urlFundo)
    if (prevUrlFilters.sector !== urlSector) setSectorInput(urlSector)
  }

  const debouncedTexto = useDebouncedValue(textoInput, 350)
  const debouncedFundo = useDebouncedValue(fundoInput, 350)
  const debouncedSector = useDebouncedValue(sectorInput, 350)

  // Synchronize debounced filter inputs into URL searchParams and reset page to 1
  useEffect(() => {
    if (!active) return
    const nextTexto = debouncedTexto.trim().slice(0, GEOGRAFIA_FILTER_MAX_LEN)
    const nextFundo = debouncedFundo.trim().slice(0, GEOGRAFIA_FILTER_MAX_LEN)
    const nextSector = debouncedSector.trim().slice(0, GEOGRAFIA_FILTER_MAX_LEN)

    if (
      nextTexto === urlTexto &&
      nextFundo === urlFundo &&
      nextSector === urlSector
    ) {
      return
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (nextTexto) next.set('texto', nextTexto)
        else next.delete('texto')

        if (nextFundo) next.set('fundo', nextFundo)
        else next.delete('fundo')

        if (nextSector) next.set('sector', nextSector)
        else next.delete('sector')

        next.delete('geo_pagina')
        return next
      },
      { replace: true },
    )
  }, [
    active,
    debouncedTexto,
    debouncedFundo,
    debouncedSector,
    urlTexto,
    urlFundo,
    urlSector,
    setSearchParams,
  ])

  const queryParams = useMemo(
    () =>
      buildGeografiaQueryParams({
        pagina,
        tamano,
        texto: urlTexto,
        fundo: urlFundo,
        sector: urlSector,
      }),
    [pagina, tamano, urlTexto, urlFundo, urlSector],
  )

  const query = useGeografia(queryParams, active)
  const rows = query.data?.datos ?? EMPTY_ROWS
  const total = query.data?.total ?? 0

  const setGeoPage = (nextPage: number) => {
    const safePage = normalizeGeografiaPage(nextPage)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (safePage <= 1) next.delete('geo_pagina')
        else next.set('geo_pagina', String(safePage))
        return next
      },
      { replace: true },
    )
  }

  const setGeoPageSize = (nextSize: number) => {
    const safeSize = normalizeGeografiaPageSize(nextSize)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('geo_tamano', String(safeSize))
        next.delete('geo_pagina')
        return next
      },
      { replace: true },
    )
  }

  const handleClearFilters = () => {
    setTextoInput('')
    setFundoInput('')
    setSectorInput('')
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('texto')
        next.delete('fundo')
        next.delete('sector')
        next.delete('geo_pagina')
        return next
      },
      { replace: true },
    )
  }

  const hasActiveFilters = Boolean(
    textoInput.trim() || fundoInput.trim() || sectorInput.trim(),
  )

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('fundo', {
          header: 'Fundo',
          cell: (info) => (
            <span className="font-medium text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('sector', {
          header: 'Sector',
          cell: (info) => (
            <span className="text-xs text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('modulo', {
          header: 'Módulo',
          cell: (info) => (
            <span className="block text-right font-mono text-xs tabular-nums">
              {info.getValue() !== null && info.getValue() !== undefined
                ? formatNumber(info.getValue())
                : '—'}
            </span>
          ),
        }),
        columnHelper.accessor('turno', {
          header: 'Turno',
          cell: (info) => (
            <span className="block text-right font-mono text-xs tabular-nums">
              {info.getValue() !== null && info.getValue() !== undefined
                ? formatNumber(info.getValue())
                : '—'}
            </span>
          ),
        }),
        columnHelper.accessor('valvula', {
          header: 'Válvula',
          cell: (info) => (
            <span className="font-mono text-xs text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('cama', {
          header: 'Cama',
          cell: (info) => (
            <span className="font-mono text-xs text-foreground">
              {info.getValue() || '—'}
            </span>
          ),
        }),
        columnHelper.accessor('codigo_sap_campo', {
          header: 'Código SAP',
          cell: (info) => {
            const code = info.getValue()
            return code ? (
              <span className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {code}
              </span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">—</span>
            )
          },
        }),
        columnHelper.accessor('es_test_block', {
          header: 'Test Block',
          cell: (info) =>
            info.getValue() ? (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 border-amber-500/35 bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-300"
              >
                <FlaskConical className="size-3" />
                TEST
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No</span>
            ),
        }),
        columnHelper.accessor('es_vigente', {
          header: 'Vigencia',
          cell: (info) =>
            info.getValue() ? (
              <StatusBadge label="VIGENTE" tone="ok" />
            ) : (
              <StatusBadge label="HISTÓRICO" tone="cancelled" />
            ),
        }),
        ...(canAdmin
          ? [
              columnHelper.display({
                id: 'acciones',
                header: 'Acciones',
                cell: (info) => {
                  const row = info.row.original
                  return (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setEditingItem(row)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-3" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={toggleVigenciaMutation.isPending}
                        onClick={() =>
                          toggleVigenciaMutation.mutate({
                            id: getGeografiaIdentifier(row),
                            esVigente: !row.es_vigente,
                          })
                        }
                        aria-label={row.es_vigente ? 'Desactivar vigencia' : 'Activar vigencia'}
                      >
                        <Power
                          className={cn(
                            'size-3',
                            row.es_vigente ? 'text-amber-600' : 'text-emerald-600',
                          )}
                        />
                      </Button>
                    </div>
                  )
                },
              }),
            ]
          : []),
      ]),
    [canAdmin, toggleVigenciaMutation],
  )

  const table = useTable(
    {
      features: geografiaTableFeatures,
      data: rows,
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
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Geografía Vigente (Silver.Dim_Geografia)
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(total)} coincidencias
              </Badge>
              {!canAdmin && <StatusBadge label="Solo lectura" tone="readonly" />}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingItem(null)
                    setDialogOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Nueva unidad
                </Button>
              )}
              <Select
                value={String(tamano)}
                onValueChange={(val) => {
                  if (!val) return
                  setGeoPageSize(Number(val))
                }}
              >
                <SelectTrigger size="sm" aria-label="Tamaño de página geografía">
                  <SelectValue>{tamano} / pág</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GEOGRAFIA_PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} por página {size === 200 ? '(máx)' : ''}
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

          {/* Server-side debounced filters synced to URL */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <div className="relative sm:col-span-5">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={textoInput}
                onChange={(e) => setTextoInput(e.target.value)}
                maxLength={GEOGRAFIA_FILTER_MAX_LEN}
                placeholder="Buscar texto en fundo, sector, válvula, SAP o cama..."
                aria-label="Búsqueda libre en geografía (server-side)"
                className="pl-8 text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                value={fundoInput}
                onChange={(e) => setFundoInput(e.target.value)}
                maxLength={GEOGRAFIA_FILTER_MAX_LEN}
                placeholder="Fundo exacto (server-side)..."
                aria-label="Filtrar por fundo exacto"
                className="text-xs"
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                value={sectorInput}
                onChange={(e) => setSectorInput(e.target.value)}
                maxLength={GEOGRAFIA_FILTER_MAX_LEN}
                placeholder="Sector exacto (server-side)..."
                aria-label="Filtrar por sector exacto"
                className="text-xs"
              />
            </div>

            <div className="flex items-center sm:col-span-1 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="w-full sm:w-auto"
                aria-label="Limpiar filtros de geografía"
              >
                <X className="size-3.5" />
                <span className="sm:sr-only">Limpiar</span>
              </Button>
            </div>
          </div>

          {(urlTexto || urlFundo || urlSector) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Filtros activos (server-side):</span>
              {urlTexto && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  texto: &ldquo;{urlTexto}&rdquo;
                </Badge>
              )}
              {urlFundo && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  fundo: {urlFundo}
                </Badge>
              )}
              {urlSector && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  sector: {urlSector}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al consultar Silver.Dim_Geografia"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'transition-opacity duration-150',
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
                          const isRight = ['modulo', 'turno'].includes(
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
                          No se encontraron registros geográficos para los filtros ingresados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableRows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getAllCells().map((cell) => (
                            <TableCell key={cell.id} className="py-2">
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
                    Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} de{' '}
                    {formatNumber(total)} · Página {pagina} de{' '}
                    {formatNumber(totalPages)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setGeoPage(pagina - 1)}
                      disabled={pagina <= 1 || query.isFetching}
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setGeoPage(pagina + 1)}
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

      <GeografiaFormDialog
        open={dialogOpen}
        item={editingItem}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
