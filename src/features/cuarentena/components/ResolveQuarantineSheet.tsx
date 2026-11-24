import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  ArchiveX,
  Calendar,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  Database,
  FileText,
  Hash,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import {
  DISCARD_REASON_PRESETS,
  isRecordPending,
  mapCuarentenaEstadoTone,
  rechazarCuarentenaSchema,
  resolverCuarentenaSchema,
  toRechazarPayload,
  toResolverPayload,
  type RechazarCuarentenaFormValues,
  type ResolverCuarentenaFormValues,
} from '../cuarentenaUtils'
import {
  useRechazarCuarentenaMutation,
  useResolverCuarentenaMutation,
} from '../useCuarentenaQueries'
import type { RegistroCuarentena } from '../types'

type SolverTab = 'resolver' | 'rechazar'

interface ResolveQuarantineSheetProps {
  record: RegistroCuarentena | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canManageMdm: boolean
  userRoleLabel: string
  onOpenReinjectionForTable?: (tabla: string) => void
}

function copyToClipboard(text: string, label: string) {
  void navigator.clipboard.writeText(text)
  toast.success(`${label} copiado`)
}

export function ResolveQuarantineSheet({
  record,
  open,
  onOpenChange,
  canManageMdm,
  userRoleLabel,
  onOpenReinjectionForTable,
}: ResolveQuarantineSheetProps) {
  const [activeTab, setActiveTab] = useState<SolverTab>('resolver')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)

  const resolverMutation = useResolverCuarentenaMutation()
  const rechazarMutation = useRechazarCuarentenaMutation()

  const resolverForm = useForm<ResolverCuarentenaFormValues>({
    resolver: zodResolver(resolverCuarentenaSchema),
    defaultValues: {
      valor_canonico: '',
      comentario: '',
    },
  })

  const rechazarForm = useForm<RechazarCuarentenaFormValues>({
    resolver: zodResolver(rechazarCuarentenaSchema),
    defaultValues: {
      motivo: '',
    },
  })

  const valorCanonicoVal = useWatch({ control: resolverForm.control, name: 'valor_canonico' })
  const comentarioVal = useWatch({ control: resolverForm.control, name: 'comentario' })
  const motivoVal = useWatch({ control: rechazarForm.control, name: 'motivo' })

  const sessionKey = open && record ? `${record.tabla_origen}::${record.id_registro}` : ''
  const [prevSessionKey, setPrevSessionKey] = useState(sessionKey)

  if (prevSessionKey !== sessionKey) {
    setPrevSessionKey(sessionKey)
    if (sessionKey) {
      setActiveTab('resolver')
      setConfirmDiscard(false)
      setSubmitError(null)
    }
  }

  useEffect(() => {
    if (!open || !record) return
    resolverForm.reset({
      valor_canonico: record.valor_corregido ?? '',
      comentario: '',
    })
    rechazarForm.reset({
      motivo: '',
    })
  }, [open, record, resolverForm, rechazarForm])

  const isPending = record ? isRecordPending(record.estado) : false
  const isSubmitting = resolverMutation.isPending || rechazarMutation.isPending

  const handleCopyRawAsBase = () => {
    if (!record) return
    const baseValue = record.valor_raw.trim()
    resolverForm.setValue('valor_canonico', baseValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    resolverForm.setFocus('valor_canonico')
  }

  const handleResolverSubmit = resolverForm.handleSubmit(async (values) => {
    if (!record) return
    setSubmitError(null)
    try {
      await resolverMutation.mutateAsync({
        tablaOrigen: record.tabla_origen,
        idRegistro: record.id_registro,
        payload: toResolverPayload(values),
      })
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err)
    }
  })

  const handleRechazarSubmit = rechazarForm.handleSubmit(async (values) => {
    if (!record || !confirmDiscard) return
    setSubmitError(null)
    try {
      await rechazarMutation.mutateAsync({
        tablaOrigen: record.tabla_origen,
        idRegistro: record.id_registro,
        payload: toRechazarPayload(values),
      })
      onOpenChange(false)
    } catch (err) {
      setSubmitError(err)
    }
  })

  return (
    <Sheet open={open && Boolean(record)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        {record && (
          <>
            <SheetHeader className="border-b bg-muted/25 px-5 py-4 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                <SheetTitle className="text-sm font-semibold">
                  Solucionador de Cuarentena
                </SheetTitle>
                <StatusBadge
                  label={record.estado}
                  tone={mapCuarentenaEstadoTone(record.estado)}
                />
                <Badge variant="outline" className="metric-value font-mono text-[11px] tabular-nums">
                  #{record.id_registro}
                </Badge>
              </div>
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 font-mono text-xs">
                <span className="text-foreground">{record.tabla_origen}</span>
                <span>·</span>
                <span>{record.columna_origen}</span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Ficha forense del rechazo */}
              <section aria-label="Ficha del registro rechazado" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Ficha del rechazo
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => copyToClipboard(record.id_registro, 'ID de cuarentena')}
                    className="h-6 text-[11px] text-muted-foreground"
                  >
                    <Copy className="size-3" />
                    Copiar ID
                  </Button>
                </div>

                <dl className="grid grid-cols-1 gap-2.5 rounded-lg border bg-muted/20 p-3.5 text-xs sm:grid-cols-2">
                  <div className="space-y-0.5">
                    <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Database className="size-3" />
                      Tabla origen
                    </dt>
                    <dd className="break-all font-mono font-medium text-foreground">
                      {record.tabla_origen}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Hash className="size-3" />
                      Columna origen
                    </dt>
                    <dd className="break-all font-mono font-medium text-foreground">
                      {record.columna_origen}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[11px] text-muted-foreground">ID Registro Cuarentena</dt>
                    <dd className="metric-value font-mono font-medium text-foreground tabular-nums">
                      #{record.id_registro}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="text-[11px] text-muted-foreground">ID Registro Origen (Bronce)</dt>
                    <dd className="flex flex-wrap items-center gap-1.5 font-mono">
                      {record.id_registro_origen !== null ? (
                        <span className="metric-value font-medium text-foreground tabular-nums">
                          {record.id_registro_origen}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/35 bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-300"
                        >
                          Sin ID origen (no reinyectable)
                        </Badge>
                      )}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <FileText className="size-3" />
                      Archivo fuente
                    </dt>
                    <dd className="break-all font-mono text-foreground">
                      {record.nombre_archivo || (
                        <span className="text-muted-foreground">No registrado</span>
                      )}
                    </dd>
                  </div>

                  <div className="space-y-0.5">
                    <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="size-3" />
                      Fecha de ingreso
                    </dt>
                    <dd className="metric-value font-mono text-foreground tabular-nums">
                      {formatDateTime(record.fecha_ingreso)}
                    </dd>
                  </div>
                </dl>

                {/* Valor crudo recibido */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Valor crudo recibido (valor_raw)
                    </span>
                    {record.valor_raw.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => copyToClipboard(record.valor_raw, 'Valor crudo')}
                        className="h-6 text-[11px] text-muted-foreground"
                      >
                        <Copy className="size-3" />
                        Copiar valor
                      </Button>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2.5 font-mono text-xs break-all text-foreground">
                    {record.valor_raw.length > 0 ? (
                      record.valor_raw
                    ) : (
                      <span className="text-muted-foreground italic">(cadena vacía)</span>
                    )}
                  </div>
                </div>

                {/* Motivo de rechazo */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Motivo de rechazo
                  </span>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2.5 text-xs leading-relaxed text-foreground">
                    {record.motivo || (
                      <span className="text-muted-foreground italic">
                        Sin detalle de motivo registrado en MDM.Cuarentena.
                      </span>
                    )}
                  </div>
                </div>

                {/* Valor corregido previo si existe */}
                {record.valor_corregido && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Valor corregido registrado
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          copyToClipboard(record.valor_corregido ?? '', 'Valor corregido')
                        }
                        className="h-6 text-[11px] text-muted-foreground"
                      >
                        <Copy className="size-3" />
                        Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 font-mono text-xs font-medium break-all text-emerald-800 dark:text-emerald-200">
                      {record.valor_corregido}
                    </div>
                  </div>
                )}
              </section>

              <Separator />

              {/* Zona de decisión MDM o modo solo lectura */}
              {!canManageMdm ? (
                <Alert className="border-indigo-500/35 bg-indigo-500/8">
                  <Lock className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <AlertTitle className="text-xs font-semibold">
                    Modo solo lectura (rol actual: {userRoleLabel})
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Puedes inspeccionar todos los detalles del rechazo, pero se requiere rol mínimo{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                      analista_mdm
                    </code>{' '}
                    para homologar, resolver o descartar registros de cuarentena.
                  </AlertDescription>
                </Alert>
              ) : !isPending ? (
                <div className="space-y-3">
                  <Alert className="border-border bg-muted/35">
                    <Info className="size-4 text-muted-foreground" />
                    <AlertTitle className="text-xs font-semibold">
                      Registro en estado {record.estado}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      Este registro ya fue atendido. En Etapa 1, el backend únicamente permite
                      resolver o descartar registros que se encuentren en estado{' '}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                        PENDIENTE
                      </code>
                      .
                    </AlertDescription>
                  </Alert>

                  {record.estado.toUpperCase() === 'RESUELTO' &&
                    record.id_registro_origen !== null &&
                    onOpenReinjectionForTable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onOpenChange(false)
                          onOpenReinjectionForTable(record.tabla_origen)
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        Abrir Reinyección MDM para {record.tabla_origen}
                      </Button>
                    )}
                </div>
              ) : (
                <section aria-label="Decisión MDM" className="space-y-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Decisión de analista MDM
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      El analista responsable se registra automáticamente desde tu sesión JWT.
                    </p>
                  </div>

                  {submitError != null && (
                    <ApiErrorBanner
                      error={submitError}
                      title="No se pudo aplicar la acción en cuarentena"
                    />
                  )}

                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                      if (value === 'resolver' || value === 'rechazar') {
                        setActiveTab(value)
                        setSubmitError(null)
                      }
                    }}
                    className="space-y-4"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="resolver" className="gap-1.5 text-xs">
                        <CheckCircle2 className="size-3.5" />
                        Homologar / Resolver
                      </TabsTrigger>
                      <TabsTrigger value="rechazar" className="gap-1.5 text-xs">
                        <ArchiveX className="size-3.5" />
                        Descartar / Rechazar
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Homologar / Resolver */}
                    <TabsContent value="resolver">
                      <form onSubmit={handleResolverSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label htmlFor="cuarentena-valor-canonico" className="text-xs font-medium">
                              Valor canónico <span className="text-destructive">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={handleCopyRawAsBase}
                                disabled={isSubmitting || record.valor_raw.trim().length === 0}
                              >
                                <ClipboardCopy className="size-3" />
                                Copiar valor crudo como base
                              </Button>
                              <span
                                className={cn(
                                  'metric-value font-mono text-[11px] tabular-nums',
                                  valorCanonicoVal.length > 180
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {valorCanonicoVal.length}/200
                              </span>
                            </div>
                          </div>

                          <Input
                            id="cuarentena-valor-canonico"
                            maxLength={200}
                            placeholder="Ej. FUNDO SAN CARLOS"
                            className="font-mono text-xs"
                            aria-invalid={Boolean(resolverForm.formState.errors.valor_canonico)}
                            disabled={isSubmitting}
                            {...resolverForm.register('valor_canonico')}
                          />

                          {resolverForm.formState.errors.valor_canonico && (
                            <p className="text-xs font-medium text-destructive" role="alert">
                              {resolverForm.formState.errors.valor_canonico.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="cuarentena-comentario" className="text-xs font-medium">
                              Comentario de auditoría (opcional)
                            </Label>
                            <span
                              className={cn(
                                'metric-value font-mono text-[11px] tabular-nums',
                                comentarioVal.length > 460
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {comentarioVal.length}/500
                            </span>
                          </div>

                          <Textarea
                            id="cuarentena-comentario"
                            rows={3}
                            maxLength={500}
                            placeholder="Justificación breve o referencia de homologación con maestro..."
                            aria-invalid={Boolean(resolverForm.formState.errors.comentario)}
                            disabled={isSubmitting}
                            {...resolverForm.register('comentario')}
                          />

                          {resolverForm.formState.errors.comentario && (
                            <p className="text-xs font-medium text-destructive" role="alert">
                              {resolverForm.formState.errors.comentario.message}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm" disabled={isSubmitting}>
                            {resolverMutation.isPending ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Resolviendo…
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-3.5" />
                                Confirmar homologación
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    {/* Tab 2: Descartar / Rechazar */}
                    <TabsContent value="rechazar">
                      <form onSubmit={handleRechazarSubmit} className="space-y-4">
                        <Alert className="border-rose-500/35 bg-rose-500/8 text-rose-900 dark:text-rose-200">
                          <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
                          <AlertTitle className="text-xs font-semibold">
                            Descarte definitivo de la cola MDM
                          </AlertTitle>
                          <AlertDescription className="text-xs">
                            El registro pasará a estado <strong className="font-mono">DESCARTADO</strong>{' '}
                            y quedará excluido de la herramienta de reinyección hacia Bronce.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="cuarentena-motivo-descarte" className="text-xs font-medium">
                              Motivo del descarte <span className="text-destructive">*</span>
                            </Label>
                            <span
                              className={cn(
                                'metric-value font-mono text-[11px] tabular-nums',
                                motivoVal.length > 460
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {motivoVal.length}/500
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {DISCARD_REASON_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() =>
                                  rechazarForm.setValue('motivo', preset, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }
                                className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <Textarea
                            id="cuarentena-motivo-descarte"
                            rows={3}
                            maxLength={500}
                            placeholder="Explica por qué este registro debe descartarse y no reprocesarse..."
                            aria-invalid={Boolean(rechazarForm.formState.errors.motivo)}
                            disabled={isSubmitting}
                            {...rechazarForm.register('motivo')}
                          />

                          {rechazarForm.formState.errors.motivo && (
                            <p className="text-xs font-medium text-destructive" role="alert">
                              {rechazarForm.formState.errors.motivo.message}
                            </p>
                          )}
                        </div>

                        <label
                          htmlFor="cuarentena-confirmar-descarte"
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-rose-500/25 bg-rose-500/[0.04] p-3 text-xs"
                        >
                          <Checkbox
                            id="cuarentena-confirmar-descarte"
                            checked={confirmDiscard}
                            onCheckedChange={(checked) => setConfirmDiscard(Boolean(checked))}
                            disabled={isSubmitting}
                            className="mt-0.5"
                          />
                          <span className="leading-snug text-foreground">
                            Confirmo descartar el registro <strong className="font-mono">#{record.id_registro}</strong>{' '}
                            de <strong className="font-mono">{record.tabla_origen}</strong> y dejarlo
                            fuera de reinyección.
                          </span>
                        </label>

                        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            disabled={isSubmitting || !confirmDiscard}
                          >
                            {rechazarMutation.isPending ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Descartando…
                              </>
                            ) : (
                              <>
                                <ArchiveX className="size-3.5" />
                                Confirmar descarte
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                  </Tabs>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
