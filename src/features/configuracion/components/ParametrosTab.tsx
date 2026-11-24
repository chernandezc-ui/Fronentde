import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import {
  GRUPOS_PARAMETRO_META,
  PARAMETRO_VALOR_MAX,
  clasificarGrupoParametro,
  getGrupoParametroMeta,
  parametroValorSchema,
} from '../schemas'
import type { GrupoParametro, ParametroPipeline } from '../types'
import {
  useParametros,
  useUpdateParametroMutation,
  useUpdateParametrosBatchMutation,
} from '../useConfiguracionQueries'

const EMPTY_PARAMS: ParametroPipeline[] = []
const MATRIZ_PARAM_KEY = 'PROY_SIXWEEK_MATRIZ_INPUTS'

type GrupoFiltro = 'todos' | GrupoParametro

interface ParametrosTabProps {
  active: boolean
  onOpenBiologiaTab: () => void
}

interface EnrichedParametro {
  raw: ParametroPipeline
  grupo: GrupoParametro
  originalValue: string
  currentValue: string
  isDirty: boolean
  validationError: string | null
}

export function ParametrosTab({
  active,
  onOpenBiologiaTab,
}: ParametrosTabProps) {
  const [searchText, setSearchText] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState<GrupoFiltro>('todos')
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [savingSingleKey, setSavingSingleKey] = useState<string | null>(null)

  const query = useParametros(active)
  const updateSingleMutation = useUpdateParametroMutation()
  const updateBatchMutation = useUpdateParametrosBatchMutation()

  const rows = query.data?.datos ?? EMPTY_PARAMS
  const totalBackend = query.data?.total ?? rows.length

  const enrichedRows = useMemo<EnrichedParametro[]>(() => {
    return rows.map((item) => {
      const originalValue = item.valor ?? ''
      const hasDraft = Object.prototype.hasOwnProperty.call(
        draftValues,
        item.nombre_parametro,
      )
      const currentValue = hasDraft
        ? draftValues[item.nombre_parametro]
        : originalValue
      const isDirty = currentValue !== originalValue
      let validationError: string | null = null

      if (isDirty) {
        const parsed = parametroValorSchema.safeParse(currentValue)
        if (!parsed.success) {
          validationError =
            parsed.error.issues[0]?.message ?? 'Valor inválido.'
        }
      }

      return {
        raw: item,
        grupo: clasificarGrupoParametro(
          item.nombre_parametro,
          item.descripcion,
        ),
        originalValue,
        currentValue,
        isDirty,
        validationError,
      }
    })
  }, [rows, draftValues])

  const groupCounts = useMemo(() => {
    const counts: Record<GrupoFiltro, number> = {
      todos: enrichedRows.length,
      campana: 0,
      biologia: 0,
      calidad_etl: 0,
      general: 0,
    }
    for (const row of enrichedRows) {
      counts[row.grupo] += 1
    }
    return counts
  }, [enrichedRows])

  const dirtyRows = useMemo(
    () => enrichedRows.filter((row) => row.isDirty),
    [enrichedRows],
  )

  const hasInvalidDirty = useMemo(
    () => dirtyRows.some((row) => row.validationError !== null),
    [dirtyRows],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return enrichedRows.filter((row) => {
      if (grupoFiltro !== 'todos' && row.grupo !== grupoFiltro) return false
      if (!q) return true
      return (
        row.raw.nombre_parametro.toLowerCase().includes(q) ||
        row.currentValue.toLowerCase().includes(q) ||
        (row.raw.descripcion?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [enrichedRows, grupoFiltro, searchText])

  const handleDraftChange = (
    nombre: string,
    nextVal: string,
    originalVal: string,
  ) => {
    setDraftValues((prev) => {
      if (nextVal === originalVal) {
        if (!Object.prototype.hasOwnProperty.call(prev, nombre)) return prev
        const next = { ...prev }
        delete next[nombre]
        return next
      }
      return { ...prev, [nombre]: nextVal }
    })
  }

  const handleRevertSingle = (nombre: string) => {
    setDraftValues((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, nombre)) return prev
      const next = { ...prev }
      delete next[nombre]
      return next
    })
  }

  const handleSaveSingle = (row: EnrichedParametro) => {
    if (!row.isDirty || row.validationError) return
    const key = row.raw.nombre_parametro
    setSavingSingleKey(key)
    updateSingleMutation.mutate(
      { nombre: key, valor: row.currentValue },
      {
        onSuccess: () => {
          setDraftValues((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
          })
        },
        onSettled: () => {
          setSavingSingleKey((curr) => (curr === key ? null : curr))
        },
      },
    )
  }

  const handleSaveBatch = () => {
    if (dirtyRows.length === 0 || hasInvalidDirty) return
    const payload = dirtyRows.map((row) => ({
      nombre_parametro: row.raw.nombre_parametro,
      valor: row.currentValue,
    }))

    updateBatchMutation.mutate(payload, {
      onSuccess: (res) => {
        const failedSet = new Set(res.fallos)
        setDraftValues((prev) => {
          const next: Record<string, string> = {}
          for (const item of payload) {
            if (failedSet.has(item.nombre_parametro)) {
              next[item.nombre_parametro] =
                prev[item.nombre_parametro] ?? item.valor
            }
          }
          return next
        })
      },
    })
  }

  const handleDiscardAll = () => {
    setDraftValues({})
  }

  const isMutating =
    updateBatchMutation.isPending || updateSingleMutation.isPending

  return (
    <div className="space-y-4">
      {/* Sticky / Prominent pending changes bar */}
      {dirtyRows.length > 0 && (
        <div
          role="region"
          aria-label="Cambios pendientes en parámetros"
          className={cn(
            'flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between',
            hasInvalidDirty
              ? 'border-rose-500/40 bg-rose-500/8'
              : 'border-amber-500/40 bg-amber-500/10',
          )}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle
              className={cn(
                'mt-0.5 size-4 shrink-0',
                hasInvalidDirty
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-amber-600 dark:text-amber-400',
              )}
            />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {dirtyRows.length === 1
                  ? '1 parámetro modificado pendiente de guardar'
                  : `${dirtyRows.length} parámetros modificados pendientes de guardar`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {hasInvalidDirty
                  ? 'Corrige los valores con error (1 a 500 caracteres) antes de guardar el lote.'
                  : 'Puedes guardar todos los cambios juntos mediante PATCH /api/v1/config/parametros o fila por fila.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardAll}
              disabled={isMutating}
            >
              <RotateCcw className="size-3.5" />
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveBatch}
              disabled={hasInvalidDirty || isMutating}
            >
              {updateBatchMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando lote...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Guardar lote ({dirtyRows.length})
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Main Parameters Card */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Parámetros del Pipeline (Config.Parametros_Pipeline)
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(filteredRows.length)} visibles ·{' '}
                {formatNumber(totalBackend)} total
              </Badge>
            </div>

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

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por clave, valor o descripción..."
                aria-label="Buscar parámetros del pipeline"
                className="pl-8 text-xs"
              />
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar parámetros por grupo"
            >
              <button
                type="button"
                onClick={() => setGrupoFiltro('todos')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  grupoFiltro === 'todos'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Todos
                <span className="font-mono text-[10px] opacity-75">
                  {groupCounts.todos}
                </span>
              </button>

              {GRUPOS_PARAMETRO_META.map((grupo) => (
                <button
                  key={grupo.key}
                  type="button"
                  onClick={() => setGrupoFiltro(grupo.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    grupoFiltro === grupo.key
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {grupo.label}
                  <span className="font-mono text-[10px] opacity-75">
                    {groupCounts[grupo.key]}
                  </span>
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
                title="Error al cargar parámetros del pipeline"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, idx) => (
                <Skeleton key={idx} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="h-9 min-w-[230px] text-xs font-semibold text-muted-foreground">
                      Parámetro y grupo
                    </TableHead>
                    <TableHead className="h-9 min-w-[260px] text-xs font-semibold text-muted-foreground">
                      Valor vigente (edición inline)
                    </TableHead>
                    <TableHead className="h-9 min-w-[220px] text-xs font-semibold text-muted-foreground">
                      Descripción
                    </TableHead>
                    <TableHead className="h-9 min-w-[140px] text-xs font-semibold text-muted-foreground">
                      Modificación
                    </TableHead>
                    <TableHead className="h-9 min-w-[140px] text-right text-xs font-semibold text-muted-foreground">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        {rows.length === 0
                          ? 'No hay parámetros registrados en Config.Parametros_Pipeline.'
                          : 'No se encontraron parámetros que coincidan con la búsqueda o el grupo seleccionado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const grupoMeta = getGrupoParametroMeta(row.grupo)
                      const isMatrizJson =
                        row.raw.nombre_parametro === MATRIZ_PARAM_KEY
                      const isRowSaving =
                        savingSingleKey === row.raw.nombre_parametro

                      return (
                        <TableRow
                          key={row.raw.nombre_parametro}
                          className={cn(
                            row.isDirty && 'bg-amber-500/[0.04]',
                            row.validationError && 'bg-rose-500/[0.05]',
                          )}
                        >
                          <TableCell className="py-2.5 align-top">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  {row.raw.nombre_parametro}
                                </span>
                                {row.isDirty && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-500/40 bg-amber-500/12 px-1.5 py-0 font-mono text-[10px] text-amber-700 dark:text-amber-300"
                                  >
                                    Modificado
                                  </Badge>
                                )}
                              </div>
                              <StatusBadge
                                label={grupoMeta.label}
                                tone={grupoMeta.badgeTone}
                                showDot={false}
                                className="text-[10px]"
                              />
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 align-top">
                            <div className="space-y-1">
                              <Input
                                value={row.currentValue}
                                onChange={(e) =>
                                  handleDraftChange(
                                    row.raw.nombre_parametro,
                                    e.target.value,
                                    row.originalValue,
                                  )
                                }
                                aria-label={`Valor del parámetro ${row.raw.nombre_parametro}`}
                                aria-invalid={Boolean(row.validationError)}
                                disabled={isMutating}
                                className={cn(
                                  'h-8 font-mono text-xs',
                                  row.isDirty &&
                                    !row.validationError &&
                                    'border-amber-500/60 bg-amber-500/5',
                                )}
                              />

                              {row.validationError ? (
                                <p
                                  className="text-[11px] font-medium text-destructive"
                                  role="alert"
                                >
                                  {row.validationError}
                                </p>
                              ) : row.isDirty ? (
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  Original:{' '}
                                  <span className="text-foreground">
                                    {row.originalValue || '(vacío)'}
                                  </span>{' '}
                                  · {row.currentValue.length}/
                                  {PARAMETRO_VALOR_MAX}
                                </p>
                              ) : isMatrizJson ? (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="text-[11px] text-muted-foreground">
                                    JSON administrado por la matriz Six-Week.
                                  </span>
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    onClick={onOpenBiologiaTab}
                                    className="h-auto p-0 text-[11px]"
                                  >
                                    Abrir en Biología
                                    <ArrowUpRight className="size-3" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 align-top">
                            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                              {row.raw.descripcion || (
                                <span className="italic opacity-70">
                                  Sin descripción registrada
                                </span>
                              )}
                            </p>
                          </TableCell>

                          <TableCell className="py-2.5 align-top">
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {formatDateTime(row.raw.fecha_modificacion)}
                            </span>
                          </TableCell>

                          <TableCell className="py-2.5 align-top text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.isDirty ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    title="Revertir cambio"
                                    aria-label={`Revertir ${row.raw.nombre_parametro}`}
                                    onClick={() =>
                                      handleRevertSingle(
                                        row.raw.nombre_parametro,
                                      )
                                    }
                                    disabled={isMutating}
                                  >
                                    <RotateCcw className="size-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="xs"
                                    onClick={() => handleSaveSingle(row)}
                                    disabled={
                                      Boolean(row.validationError) || isMutating
                                    }
                                  >
                                    {isRowSaving ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <Check className="size-3" />
                                    )}
                                    Guardar
                                  </Button>
                                </>
                              ) : (
                                <span className="font-mono text-[11px] text-muted-foreground/70">
                                  Sin cambios
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Honest Etapa 2 notice for Dim_Campana */}
      <Alert className="border-indigo-500/25 bg-indigo-500/[0.06]">
        <Info className="size-4 text-indigo-600 dark:text-indigo-400" />
        <AlertTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span>Gestión de campañas (Silver.Dim_Campana)</span>
          <StatusBadge
            label="Etapa 2"
            tone="readonly"
            showDot={false}
            className="text-[10px]"
          />
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          Los parámetros operativos de campaña aquí listados ajustan el
          comportamiento del pipeline en{' '}
          <span className="font-mono text-foreground">
            Config.Parametros_Pipeline
          </span>
          . El mantenimiento CRUD de vigencias y cierres de{' '}
          <span className="font-mono text-foreground">Silver.Dim_Campana</span>{' '}
          se habilitará en la <strong>Etapa 2</strong> del backend.
        </AlertDescription>
      </Alert>
    </div>
  )
}
