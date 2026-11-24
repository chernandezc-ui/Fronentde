import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  CheckSquare,
  Layers,
  Loader2,
  Play,
  Search,
  Sparkles,
  Square,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useStartRunMutation } from '../useEtlQueries'
import type { CorridaIniciada, FactDisponible } from '../types'

const launchRunSchema = z
  .object({
    modo_ejecucion: z.enum(['completo', 'facts']),
    facts: z.array(z.string()).max(20, 'Máximo 20 facts por corrida dirigida.'),
    incluir_dependencias: z.boolean(),
    refrescar_gold: z.boolean(),
    forzar_relectura_bronce: z.boolean(),
    comentario: z.string().max(500, 'El comentario no puede superar los 500 caracteres.'),
  })
  .superRefine((values, ctx) => {
    if (values.modo_ejecucion === 'facts' && values.facts.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['facts'],
        message: 'Selecciona al menos 1 fact para el reproceso dirigido.',
      })
    }
  })

type LaunchRunFormValues = z.infer<typeof launchRunSchema>

interface LaunchRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facts: FactDisponible[]
  isLoadingFacts: boolean
  initialSelectedFacts?: string[]
  hasActiveRun: boolean
  onLaunched: (corrida: CorridaIniciada) => void
}

export function LaunchRunDialog({
  open,
  onOpenChange,
  facts,
  isLoadingFacts,
  initialSelectedFacts,
  hasActiveRun,
  onLaunched,
}: LaunchRunDialogProps) {
  const [factSearch, setFactSearch] = useState('')
  const startMutation = useStartRunMutation()

  const sortedFacts = useMemo(
    () => [...facts].sort((a, b) => a.orden - b.orden),
    [facts],
  )

  const form = useForm<LaunchRunFormValues>({
    resolver: zodResolver(launchRunSchema),
    defaultValues: {
      modo_ejecucion: 'completo',
      facts: [],
      incluir_dependencias: true,
      refrescar_gold: true,
      forzar_relectura_bronce: true,
      comentario: '',
    },
  })

  useEffect(() => {
    if (!open) return
    const preselected = (initialSelectedFacts ?? []).filter(Boolean)
    form.reset({
      modo_ejecucion: preselected.length > 0 ? 'facts' : 'completo',
      facts: preselected,
      incluir_dependencias: true,
      refrescar_gold: true,
      forzar_relectura_bronce: true,
      comentario: '',
    })
  }, [open, initialSelectedFacts, form])

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFactSearch('')
    }
    onOpenChange(nextOpen)
  }

  const modoEjecucion = useWatch({ control: form.control, name: 'modo_ejecucion' })
  const selectedFacts = useWatch({ control: form.control, name: 'facts' })
  const comentarioValue = useWatch({ control: form.control, name: 'comentario' })

  const filteredFacts = useMemo(() => {
    const q = factSearch.trim().toLowerCase()
    if (!q) return sortedFacts
    return sortedFacts.filter((f) => {
      return (
        f.nombre_fact.toLowerCase().includes(q) ||
        f.tabla_destino.toLowerCase().includes(q) ||
        f.dependencias.some((d) => d.toLowerCase().includes(q)) ||
        f.estrategia_rerun.toLowerCase().includes(q)
      )
    })
  }, [sortedFacts, factSearch])

  const toggleFact = (factName: string, checked: boolean) => {
    const current = form.getValues('facts')
    if (checked) {
      if (!current.includes(factName)) {
        form.setValue('facts', [...current, factName], { shouldValidate: true })
      }
    } else {
      form.setValue(
        'facts',
        current.filter((item) => item !== factName),
        { shouldValidate: true },
      )
    }
  }

  const selectAllFiltered = () => {
    const current = new Set(form.getValues('facts'))
    for (const f of filteredFacts) {
      if (current.size >= 20) break
      current.add(f.nombre_fact)
    }
    form.setValue('facts', Array.from(current), { shouldValidate: true })
  }

  const clearSelectedFacts = () => {
    form.setValue('facts', [], { shouldValidate: true })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const trimmedComment = values.comentario.trim()
    const payload = {
      comentario: trimmedComment.length > 0 ? trimmedComment : null,
      modo_ejecucion: values.modo_ejecucion,
      facts: values.modo_ejecucion === 'facts' ? values.facts : null,
      incluir_dependencias: values.incluir_dependencias,
      refrescar_gold: values.refrescar_gold,
      forzar_relectura_bronce: values.forzar_relectura_bronce,
    }

    try {
      const created = await startMutation.mutateAsync(payload)
      handleDialogOpenChange(false)
      onLaunched(created)
    } catch {
      // Error already notified via mutation onError
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Play className="size-4 text-primary" />
            Lanzar nueva corrida ETL
          </DialogTitle>
          <DialogDescription>
            Encola una ejecución controlada en el runner persistente. Puedes ejecutar el pipeline completo o reprocesar facts específicos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          {hasActiveRun && (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">Corrida activa detectada</AlertTitle>
              <AlertDescription className="text-xs">
                Existe al menos una corrida en ejecución o pendiente. Si el lock del control-plane está activo, el backend responderá con HTTP 409 hasta que finalice.
              </AlertDescription>
            </Alert>
          )}

          {/* Mode selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Modo de ejecución
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Modo de ejecución">
              <button
                type="button"
                role="radio"
                aria-checked={modoEjecucion === 'completo'}
                onClick={() => form.setValue('modo_ejecucion', 'completo', { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  modoEjecucion === 'completo'
                    ? 'border-primary bg-primary/6 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/50',
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="size-3.5 text-primary" />
                    Pipeline completo
                  </span>
                  <Badge variant={modoEjecucion === 'completo' ? 'default' : 'outline'} className="font-mono text-[10px]">
                    completo
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ejecuta todas las dimensiones, facts Silver y marts Gold según el orden configurado.
                </p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={modoEjecucion === 'facts'}
                onClick={() => form.setValue('modo_ejecucion', 'facts', { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  modoEjecucion === 'facts'
                    ? 'border-primary bg-primary/6 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:bg-muted/50',
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <Layers className="size-3.5 text-primary" />
                    Reproceso dirigido
                  </span>
                  <Badge variant={modoEjecucion === 'facts' ? 'default' : 'outline'} className="font-mono text-[10px]">
                    facts
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecciona uno o más facts del catálogo para reprocesarlos de forma selectiva.
                </p>
              </button>
            </div>
          </div>

          {/* Searchable Facts checklist when mode === 'facts' */}
          {modoEjecucion === 'facts' && (
            <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="etl-fact-search" className="text-xs font-semibold">
                    Catálogo de Facts ({sortedFacts.length})
                  </Label>
                  <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                    {selectedFacts.length} seleccionados
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={selectAllFiltered}
                    disabled={filteredFacts.length === 0}
                  >
                    <CheckSquare className="size-3" />
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={clearSelectedFacts}
                    disabled={selectedFacts.length === 0}
                  >
                    <Square className="size-3" />
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="etl-fact-search"
                  value={factSearch}
                  onChange={(e) => setFactSearch(e.target.value)}
                  placeholder="Filtrar por fact, tabla destino o dependencia..."
                  className="bg-background pl-8 text-xs"
                />
              </div>

              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {isLoadingFacts ? (
                  <div className="space-y-2 py-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredFacts.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No hay facts que coincidan con &ldquo;{factSearch}&rdquo;.
                  </p>
                ) : (
                  filteredFacts.map((fact) => {
                    const isChecked = selectedFacts.includes(fact.nombre_fact)
                    const checkboxId = `launch-fact-${fact.nombre_fact}`
                    return (
                      <label
                        key={fact.nombre_fact}
                        htmlFor={checkboxId}
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors',
                          isChecked
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/70 bg-background hover:bg-muted/40',
                        )}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={isChecked}
                          onCheckedChange={(checked) => toggleFact(fact.nombre_fact, Boolean(checked))}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                              <span className="text-[10px] text-muted-foreground tabular-nums">
                                #{String(fact.orden).padStart(2, '0')}
                              </span>
                              {fact.nombre_fact}
                            </span>
                            <span className="truncate font-mono text-[11px] text-muted-foreground">
                              {fact.tabla_destino}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="h-4 px-1.5 font-mono text-[10px]">
                              {fact.estrategia_rerun}
                            </Badge>
                            {fact.dependencias.length > 0 ? (
                              fact.dependencias.map((dep) => (
                                <span
                                  key={dep}
                                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                >
                                  dep:{dep}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sin dependencias</span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>

              {form.formState.errors.facts && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {form.formState.errors.facts.message}
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Execution flags */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Opciones del pipeline
            </Label>

            <div className="space-y-2.5">
              <Controller
                control={form.control}
                name="incluir_dependencias"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="opt-dependencias" className="text-sm font-medium">
                        Incluir dependencias
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ejecuta dimensiones y procedimientos almacenados dependientes antes de cargar los facts.
                      </p>
                    </div>
                    <Switch
                      id="opt-dependencias"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="refrescar_gold"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="opt-gold" className="text-sm font-medium">
                        Refrescar capa Gold
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Actualiza automáticamente los marts analíticos Gold impactados al terminar Silver.
                      </p>
                    </div>
                    <Switch
                      id="opt-gold"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="forzar_relectura_bronce"
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="opt-bronce" className="text-sm font-medium">
                        Forzar relectura de Bronce
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Reabre filas marcadas como PROCESADO o RECHAZADO en Bronce antes de reprocesar.
                      </p>
                    </div>
                    <Switch
                      id="opt-bronce"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    />
                  </div>
                )}
              />
            </div>
          </div>

          {/* Audit comment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="etl-comentario" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Comentario de auditoría (opcional)
              </Label>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  comentarioValue.length > 480 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                )}
              >
                {comentarioValue.length}/500
              </span>
            </div>
            <Textarea
              id="etl-comentario"
              rows={2}
              maxLength={500}
              placeholder="Ej. Reproceso post-corrección de cuarentena MDM lote 2026-W47"
              {...form.register('comentario')}
            />
            {form.formState.errors.comentario && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {form.formState.errors.comentario.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={startMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={startMutation.isPending}>
              {startMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Encolando...
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  {modoEjecucion === 'facts'
                    ? `Lanzar reproceso (${selectedFacts.length})`
                    : 'Lanzar pipeline completo'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
