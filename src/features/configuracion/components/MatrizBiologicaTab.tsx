import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Info,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  DECAY_FACTOR,
  DELTA_PRODUCTIVAS,
  ESTADOS_BIOLOGICOS_ORDEN,
  ESTADO_BIOLOGICO_META,
  PLANTAS_POR_PUNTO,
  SEMANAS_SIXWEEK,
  SEMANAS_SIXWEEK_KEYS,
  areMatricesEqual,
  cerrarMatriz,
  createDefaultMatrizCompleta,
  decimalToPctInputString,
  formatPctDecimal,
  isMatrizBackendVacia,
  normalizarMatrizCompleta,
  pctInputToDecimal,
  resumirValidacionMatriz,
  serializeMatrizPayload,
  validarMatriz,
} from '../matrizUtils'
import type {
  EstadoBiologico,
  MatrizBiologicaCompleta,
  SemanaSixWeekKey,
} from '../types'
import {
  useMatrizBiologica,
  useSaveMatrizBiologicaMutation,
} from '../useConfiguracionQueries'

interface MatrizBiologicaTabProps {
  active: boolean
  canEdit: boolean
}

function makeCellId(estado: EstadoBiologico, weekKey: SemanaSixWeekKey): string {
  return `${estado}:${weekKey}`
}

export function MatrizBiologicaTab({
  active,
  canEdit,
}: MatrizBiologicaTabProps) {
  const [draftMatriz, setDraftMatriz] =
    useState<MatrizBiologicaCompleta | null>(null)
  const [rawCellInputs, setRawCellInputs] = useState<Record<string, string>>({})

  const query = useMatrizBiologica(active)
  const saveMutation = useSaveMatrizBiologicaMutation()

  const isBackendEmpty =
    query.isSuccess && isMatrizBackendVacia(query.data)

  const baselineMatriz = useMemo(
    () => normalizarMatrizCompleta(query.data),
    [query.data],
  )

  const currentMatriz = draftMatriz ?? baselineMatriz
  const isDirty = useMemo(
    () => draftMatriz !== null && !areMatricesEqual(draftMatriz, baselineMatriz),
    [draftMatriz, baselineMatriz],
  )

  const cierreActual = useMemo(
    () => cerrarMatriz(currentMatriz),
    [currentMatriz],
  )

  const reporteValidacion = useMemo(
    () => validarMatriz(currentMatriz),
    [currentMatriz],
  )

  const resumenValidacion = useMemo(
    () => resumirValidacionMatriz(reporteValidacion),
    [reporteValidacion],
  )

  const updateCellValue = (
    estado: EstadoBiologico,
    weekKey: SemanaSixWeekKey,
    nextDecimal: number | null,
  ) => {
    setDraftMatriz((prev) => {
      const base = prev ?? baselineMatriz
      return {
        ...base,
        [estado]: {
          ...base[estado],
          [weekKey]: nextDecimal,
        },
      }
    })
  }

  const handleNumericInputChange = (
    estado: EstadoBiologico,
    weekKey: SemanaSixWeekKey,
    rawStr: string,
  ) => {
    const cellId = makeCellId(estado, weekKey)
    setRawCellInputs((prev) => ({ ...prev, [cellId]: rawStr }))

    const trimmed = rawStr.trim().replace(',', '.')
    if (trimmed === '') {
      updateCellValue(estado, weekKey, Number.NaN)
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      updateCellValue(estado, weekKey, Number.NaN)
      return
    }
    updateCellValue(estado, weekKey, pctInputToDecimal(parsed))
  }

  const handleNumericInputBlur = (
    estado: EstadoBiologico,
    weekKey: SemanaSixWeekKey,
  ) => {
    const cellId = makeCellId(estado, weekKey)
    const val = currentMatriz[estado][weekKey]
    if (val !== null && Number.isFinite(val)) {
      setRawCellInputs((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, cellId)) return prev
        const next = { ...prev }
        delete next[cellId]
        return next
      })
    }
  }

  const handleSetAutoResidual = (
    estado: EstadoBiologico,
    weekKey: SemanaSixWeekKey,
  ) => {
    const cellId = makeCellId(estado, weekKey)
    setRawCellInputs((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, cellId)) return prev
      const next = { ...prev }
      delete next[cellId]
      return next
    })
    updateCellValue(estado, weekKey, null)
  }

  const handleSwitchToManual = (
    estado: EstadoBiologico,
    weekKey: SemanaSixWeekKey,
    weekIdx: number,
  ) => {
    const computedValue = cierreActual[estado]?.[weekIdx] ?? 0
    const cellId = makeCellId(estado, weekKey)
    setRawCellInputs((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, cellId)) return prev
      const next = { ...prev }
      delete next[cellId]
      return next
    })
    updateCellValue(estado, weekKey, Number(computedValue.toFixed(6)))
  }

  const handleRestoreDefaults = () => {
    setRawCellInputs({})
    setDraftMatriz(createDefaultMatrizCompleta())
  }

  const handleDiscard = () => {
    setRawCellInputs({})
    setDraftMatriz(null)
  }

  const handleSave = () => {
    if (!canEdit || resumenValidacion.bloqueado) return
    const payload = serializeMatrizPayload(currentMatriz)
    saveMutation.mutate(payload, {
      onSuccess: () => {
        setRawCellInputs({})
        setDraftMatriz(null)
      },
    })
  }

  const canSubmit =
    canEdit &&
    !resumenValidacion.bloqueado &&
    !saveMutation.isPending &&
    (isDirty || isBackendEmpty)

  return (
    <div className="space-y-4">
      {/* Honest state banner when DB returned {} */}
      {isBackendEmpty && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <Info className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span>Matriz aún no guardada en base de datos</span>
            <StatusBadge label="Usando defaults Six-Week" tone="pending" />
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            El endpoint{' '}
            <span className="font-mono text-foreground">
              GET /api/v1/proyecciones/matriz
            </span>{' '}
            devolvió <span className="font-mono text-foreground">{'{}'}</span>.
            Se precargaron los valores por defecto del dominio (
            <span className="font-mono text-foreground">
              MATRIZ_INPUTS_DEFAULT
            </span>
            ). Guarda la matriz para persistirla en{' '}
            <span className="font-mono text-foreground">
              Config.Parametros_Pipeline
            </span>
            .
          </AlertDescription>
        </Alert>
      )}

      {/* Blocking errors summary banner */}
      {resumenValidacion.bloqueado && (
        <Alert variant="destructive" className="border-rose-500/40 bg-rose-500/8">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-semibold">
            Guardado bloqueado · {resumenValidacion.totalErrores}{' '}
            {resumenValidacion.totalErrores === 1 ? 'error' : 'errores'} de
            validación
          </AlertTitle>
          <AlertDescription className="mt-1 space-y-1 text-xs">
            {resumenValidacion.estadosConError.map((estadoKey) => {
              const meta =
                ESTADO_BIOLOGICO_META[estadoKey as EstadoBiologico]
              const errs = reporteValidacion[estadoKey]?.errores ?? []
              return (
                <p key={estadoKey}>
                  <strong className="font-medium">
                    {meta?.label ?? estadoKey}:
                  </strong>{' '}
                  {errs.join(' ')}
                </p>
              )
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Interactive 7 x 6 Matrix Editor Card */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <FlaskConical className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">
                  Matriz Biológica de Maduración Six-Week (7 estados × 6
                  semanas)
                </CardTitle>
                {isDirty ? (
                  <StatusBadge label="Cambios sin guardar" tone="pending" />
                ) : resumenValidacion.bloqueado ? (
                  <StatusBadge label="Con errores" tone="error" />
                ) : (
                  <StatusBadge label="Válida" tone="ok" />
                )}
              </div>
              <CardDescription className="text-xs">
                Edita en porcentaje (<strong>0% – 100%</strong>) o activa{' '}
                <span className="font-medium text-sky-700 dark:text-sky-300">
                  Auto (Residual)
                </span>{' '}
                (<span className="font-mono">null</span>) para que el motor
                calcule <span className="font-mono">max(0, 1 − suma previa)</span>{' '}
                secuencialmente. Al guardar se envían decimales{' '}
                <span className="font-mono">0..1</span> o{' '}
                <span className="font-mono">null</span>.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.isFetching || saveMutation.isPending}
              >
                <RefreshCw
                  className={cn('size-3.5', query.isFetching && 'animate-spin')}
                />
                Recargar
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestoreDefaults}
                disabled={!canEdit || saveMutation.isPending}
              >
                <RotateCcw className="size-3.5" />
                Restaurar defaults
              </Button>

              {isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={saveMutation.isPending}
                >
                  Descartar
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!canSubmit}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    {isBackendEmpty && !isDirty
                      ? 'Guardar defaults en BD'
                      : 'Guardar matriz'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al cargar la matriz biológica Six-Week"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, idx) => (
                <Skeleton key={idx} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/35 text-muted-foreground">
                    <th className="min-w-[180px] px-4 py-2.5 text-left font-semibold">
                      Estado fenológico
                    </th>
                    {SEMANAS_SIXWEEK.map((w) => (
                      <th
                        key={w}
                        className="min-w-[116px] px-2 py-2.5 text-center font-mono font-semibold"
                      >
                        W{w}
                      </th>
                    ))}
                    <th className="min-w-[185px] px-4 py-2.5 text-right font-semibold">
                      Suma y cierre W1–W6
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ESTADOS_BIOLOGICOS_ORDEN.map((estado) => {
                    const meta = ESTADO_BIOLOGICO_META[estado]
                    const fila = currentMatriz[estado]
                    const cierre = cierreActual[estado] ?? [0, 0, 0, 0, 0, 0]
                    const valInfo = reporteValidacion[estado]
                    const hasError = (valInfo?.errores.length ?? 0) > 0
                    const hasWarning = (valInfo?.advertencias.length ?? 0) > 0
                    const pctBarra = Math.min(
                      100,
                      Math.max(0, (valInfo?.sumaCierre ?? 0) * 100),
                    )

                    return (
                      <tr
                        key={estado}
                        className={cn(
                          'transition-colors',
                          hasError
                            ? 'bg-rose-500/[0.06]'
                            : hasWarning
                              ? 'bg-amber-500/[0.03]'
                              : 'hover:bg-muted/20',
                        )}
                      >
                        {/* Biological stage label */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span
                              className={cn(
                                'mt-1.5 size-2 shrink-0 rounded-full',
                                meta.dotClass,
                              )}
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {meta.label}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  #{meta.idEstado}
                                </span>
                              </div>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {estado}
                              </p>
                              {hasError && (
                                <p
                                  className="text-[11px] font-medium text-rose-600 dark:text-rose-400"
                                  role="alert"
                                >
                                  {valInfo?.errores[0]}
                                </p>
                              )}
                              {!hasError && hasWarning && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                  Fuera del corte W1–W6
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* W1..W6 cells */}
                        {SEMANAS_SIXWEEK_KEYS.map((weekKey, weekIdx) => {
                          const value = fila[weekKey]
                          const isAuto = value === null
                          const effectiveVal = cierre[weekIdx] ?? 0
                          const cellId = makeCellId(estado, weekKey)
                          const cellIsInvalid =
                            !isAuto &&
                            (!Number.isFinite(value) || value < 0 || value > 1)
                          const displayInput = Object.prototype.hasOwnProperty.call(
                            rawCellInputs,
                            cellId,
                          )
                            ? rawCellInputs[cellId]
                            : isAuto
                              ? ''
                              : decimalToPctInputString(value)

                          return (
                            <td
                              key={weekKey}
                              className="px-1.5 py-2.5 align-top"
                            >
                              {isAuto ? (
                                <div className="flex flex-col items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/[0.08] px-2 py-1.5">
                                  <div className="flex w-full items-center justify-between gap-1">
                                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                      <Sparkles className="size-2.5" />
                                      Auto
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <button
                                            type="button"
                                            disabled={!canEdit || saveMutation.isPending}
                                            onClick={() =>
                                              handleSwitchToManual(
                                                estado,
                                                weekKey,
                                                weekIdx,
                                              )
                                            }
                                            aria-label={`Cambiar ${meta.label} W${weekKey} a porcentaje manual`}
                                            className="rounded p-0.5 text-sky-700/80 transition-colors hover:bg-sky-500/20 hover:text-sky-900 disabled:opacity-40 dark:text-sky-300"
                                          />
                                        }
                                      >
                                        <Pencil className="size-2.5" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Cambiar a valor manual (%)
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <span className="metric-value font-mono text-xs font-semibold text-sky-800 dark:text-sky-200">
                                    {formatPctDecimal(effectiveVal)}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="any"
                                      min={0}
                                      max={100}
                                      value={displayInput}
                                      disabled={!canEdit || saveMutation.isPending}
                                      aria-label={`${meta.label} semana W${weekKey} en porcentaje`}
                                      aria-invalid={cellIsInvalid || hasError}
                                      onChange={(e) =>
                                        handleNumericInputChange(
                                          estado,
                                          weekKey,
                                          e.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        handleNumericInputBlur(estado, weekKey)
                                      }
                                      className={cn(
                                        'h-8 pr-5 text-right font-mono text-xs tabular-nums',
                                        cellIsInvalid &&
                                          'border-destructive focus-visible:ring-destructive/30',
                                      )}
                                    />
                                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                                      %
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between px-0.5">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {Number.isFinite(value)
                                        ? value.toFixed(2)
                                        : '—'}
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <button
                                            type="button"
                                            disabled={!canEdit || saveMutation.isPending}
                                            onClick={() =>
                                              handleSetAutoResidual(
                                                estado,
                                                weekKey,
                                              )
                                            }
                                            aria-label={`Cambiar ${meta.label} W${weekKey} a Auto (Residual)`}
                                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-sky-500/15 hover:text-sky-700 disabled:opacity-40 dark:hover:text-sky-300"
                                          />
                                        }
                                      >
                                        <Sparkles className="size-2.5" />
                                        Auto
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Usar cierre residual automático (null)
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        })}

                        {/* Row sum + progress bar */}
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasError ? (
                                <AlertTriangle className="size-3.5 text-rose-500" />
                              ) : hasWarning ? (
                                <Info className="size-3.5 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                              )}
                              <span
                                className={cn(
                                  'metric-value font-mono text-xs font-semibold',
                                  hasError
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : hasWarning
                                      ? 'text-amber-700 dark:text-amber-300'
                                      : 'text-emerald-700 dark:text-emerald-400',
                                )}
                              >
                                {formatPctDecimal(
                                  hasError
                                    ? (valInfo?.suma ?? 0)
                                    : (valInfo?.sumaCierre ?? 0),
                                )}
                              </span>
                            </div>

                            {/* Visual progress bar <= 100% */}
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  hasError
                                    ? 'bg-rose-500'
                                    : hasWarning
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500',
                                )}
                                style={{
                                  width: `${hasError ? 100 : pctBarra}%`,
                                }}
                              />
                            </div>

                            <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              Inputs: {formatPctDecimal(valInfo?.suma ?? 0)}
                              {valInfo?.tieneNones ? ' · +Auto' : ' · Manual'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-blocking warnings summary */}
      {!resumenValidacion.bloqueado &&
        resumenValidacion.totalAdvertencias > 0 && (
          <Alert className="border-amber-500/30 bg-amber-500/[0.06]">
            <Info className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-semibold">
              Advertencias biológicas no bloqueantes (
              {resumenValidacion.totalAdvertencias})
            </AlertTitle>
            <AlertDescription className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {resumenValidacion.estadosConAdvertencia.map((estadoKey) => {
                const meta =
                  ESTADO_BIOLOGICO_META[estadoKey as EstadoBiologico]
                const warns = reporteValidacion[estadoKey]?.advertencias ?? []
                return (
                  <p key={estadoKey}>
                    <strong className="font-medium text-foreground">
                      {meta?.label ?? estadoKey}:
                    </strong>{' '}
                    {warns.join(' ')}
                  </p>
                )
              })}
            </AlertDescription>
          </Alert>
        )}

      {/* Live Effective Closure Preview + Fixed Engine Constants Grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Live Preview of Closed Matrix W1..W6 */}
        <Card className="xl:col-span-7">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">
                Vista previa en vivo del cierre efectivo (W1–W6)
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                cerrar_matriz()
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Distribución final que aplicará el motor Six-Week tras resolver
              las celdas <span className="font-mono">Auto (Residual)</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    {SEMANAS_SIXWEEK.map((w) => (
                      <th
                        key={w}
                        className="px-2 py-2 text-right font-mono font-medium"
                      >
                        W{w}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-mono font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ESTADOS_BIOLOGICOS_ORDEN.map((estado) => {
                    const meta = ESTADO_BIOLOGICO_META[estado]
                    const cierre = cierreActual[estado] ?? [0, 0, 0, 0, 0, 0]
                    const total = cierre.reduce((acc, v) => acc + v, 0)

                    return (
                      <tr key={estado}>
                        <td className="px-3 py-2 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                meta.dotClass,
                              )}
                            />
                            {meta.label}
                          </span>
                        </td>
                        {SEMANAS_SIXWEEK_KEYS.map((wk, idx) => {
                          const isAuto = currentMatriz[estado][wk] === null
                          const val = cierre[idx] ?? 0
                          return (
                            <td
                              key={wk}
                              className={cn(
                                'metric-value px-2 py-2 text-right font-mono',
                                isAuto && val > 0
                                  ? 'font-semibold text-sky-700 dark:text-sky-300'
                                  : val === 0
                                    ? 'text-muted-foreground/55'
                                    : 'text-foreground',
                              )}
                            >
                              {formatPctDecimal(val)}
                            </td>
                          )
                        })}
                        <td className="metric-value px-3 py-2 text-right font-mono font-semibold">
                          {formatPctDecimal(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Read-only Reference Card for Fixed Engine Constants */}
        <Card className="xl:col-span-5">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-sm font-semibold">
                  Parámetros biológicos fijos del motor
                </CardTitle>
              </div>
              <StatusBadge label="Solo lectura · Etapa 2" tone="readonly" />
            </div>
            <CardDescription className="text-xs">
              Constantes definidas en{' '}
              <span className="font-mono text-foreground">
                dominio/proyecciones.py
              </span>
              . Su edición persistida en BD y el CRUD de{' '}
              <span className="font-mono text-foreground">
                Silver.Dim_Campana
              </span>{' '}
              pertenecen a <strong>Etapa 2</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* PLANTAS_POR_PUNTO */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/25 px-3 py-2">
              <div>
                <p className="font-mono text-xs font-semibold text-foreground">
                  PLANTAS_POR_PUNTO
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Plantas evaluadas por punto de muestreo fenológico
                </p>
              </div>
              <span className="metric-value font-mono text-lg font-semibold text-foreground">
                {PLANTAS_POR_PUNTO}
              </span>
            </div>

            {/* DECAY_FACTOR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-foreground">
                  DECAY_FACTOR
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Factor de decaimiento semanal
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {SEMANAS_SIXWEEK.map((w) => (
                  <div
                    key={w}
                    className="rounded-md border bg-muted/20 px-1.5 py-1.5 text-center"
                  >
                    <p className="font-mono text-[10px] text-muted-foreground">
                      W{w}
                    </p>
                    <p className="metric-value font-mono text-xs font-semibold text-foreground">
                      {DECAY_FACTOR[w].toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DELTA_PRODUCTIVAS */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-foreground">
                  DELTA_PRODUCTIVAS
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ajuste semanal de % plantas productivas
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {SEMANAS_SIXWEEK.map((w) => {
                  const delta = DELTA_PRODUCTIVAS[w]
                  const sign = delta > 0 ? '+' : ''
                  return (
                    <div
                      key={w}
                      className="rounded-md border bg-muted/20 px-1.5 py-1.5 text-center"
                    >
                      <p className="font-mono text-[10px] text-muted-foreground">
                        W{w}
                      </p>
                      <p
                        className={cn(
                          'metric-value font-mono text-xs font-semibold',
                          delta > 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : delta < 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {sign}
                        {delta.toFixed(2)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
