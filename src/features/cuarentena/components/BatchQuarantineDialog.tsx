import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Layers, Loader2, Trash2, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import {
  DISCARD_REASON_PRESETS,
  rechazarCuarentenaSchema,
  resolverCuarentenaSchema,
  toRechazarPayload,
  toResolverPayload,
  type RechazarCuarentenaFormValues,
  type ResolverCuarentenaFormValues,
} from '../cuarentenaUtils'
import type { RegistroCuarentena } from '../types'
import { useRechazarLoteMutation, useResolverLoteMutation } from '../useCuarentenaQueries'

export type BatchQuarantineMode = 'resolver' | 'rechazar' | null

interface BatchQuarantineDialogProps {
  mode: BatchQuarantineMode
  records: RegistroCuarentena[]
  onOpenChange: (open: boolean) => void
  onCompleted: () => void
}

export function BatchQuarantineDialog({
  mode,
  records,
  onOpenChange,
  onCompleted,
}: BatchQuarantineDialogProps) {
  const formKey = `${mode ?? 'none'}-${records.length}`
  return (
    <Dialog open={Boolean(mode)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {mode === 'resolver' && (
          <ResolveBatchForm
            key={formKey}
            records={records}
            onClose={() => onOpenChange(false)}
            onCompleted={onCompleted}
          />
        )}
        {mode === 'rechazar' && (
          <RejectBatchForm
            key={formKey}
            records={records}
            onClose={() => onOpenChange(false)}
            onCompleted={onCompleted}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BatchPreviewSummary({ records }: { records: RegistroCuarentena[] }) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/25 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">Registros incluidos en el lote</span>
        <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
          {records.length} seleccionados
        </Badge>
      </div>
      <div className="max-h-24 space-y-1 overflow-y-auto font-mono text-[11px] text-muted-foreground">
        {records.slice(0, 6).map((r) => (
          <div key={`${r.tabla_origen}-${r.id_registro}`} className="truncate">
            #{r.id_registro} · {r.tabla_origen} ({r.columna_origen}: {r.valor_raw || '(vacío)'})
          </div>
        ))}
        {records.length > 6 && <div>... y {records.length - 6} registro(s) más.</div>}
      </div>
    </div>
  )
}

function ResolveBatchForm({
  records,
  onClose,
  onCompleted,
}: {
  records: RegistroCuarentena[]
  onClose: () => void
  onCompleted: () => void
}) {
  const mutation = useResolverLoteMutation()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResolverCuarentenaFormValues>({
    resolver: zodResolver(resolverCuarentenaSchema),
    defaultValues: {
      valor_canonico: records[0]?.valor_raw?.trim() ?? '',
      comentario: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const clean = toResolverPayload(values)
    try {
      await mutation.mutateAsync({
        registros: records.map((r) => ({
          tabla_origen: r.tabla_origen,
          id_registro: r.id_registro,
        })),
        valor_canonico: clean.valor_canonico,
        comentario: clean.comentario,
      })
      onCompleted()
      onClose()
    } catch {
      // Manejado por notifyStage2MutationError
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Wrench className="size-4 text-primary" />
          Resolver lote en Cuarentena MDM
        </DialogTitle>
        <DialogDescription>
          Aplica el mismo valor canónico a los{' '}
          <span className="font-mono font-semibold text-foreground">{records.length}</span>{' '}
          registros pendientes seleccionados.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <BatchPreviewSummary records={records} />

        <div className="space-y-1.5">
          <Label htmlFor="batch-valor-canonico">
            Valor canónico a aplicar <span className="text-destructive">*</span>
          </Label>
          <Input
            id="batch-valor-canonico"
            placeholder="Ej. VENTURA o FUNDO CERRO PRIETO"
            aria-invalid={Boolean(errors.valor_canonico)}
            {...register('valor_canonico')}
          />
          {errors.valor_canonico && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {errors.valor_canonico.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="batch-comentario">Comentario MDM</Label>
          <Textarea
            id="batch-comentario"
            rows={2}
            placeholder="Motivo de homologación masiva..."
            {...register('comentario')}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={records.length === 0 || mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Aplicando lote...
              </>
            ) : (
              <>
                <Layers className="size-3.5" />
                Resolver {records.length} registros
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

function RejectBatchForm({
  records,
  onClose,
  onCompleted,
}: {
  records: RegistroCuarentena[]
  onClose: () => void
  onCompleted: () => void
}) {
  const mutation = useRechazarLoteMutation()
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<RechazarCuarentenaFormValues>({
    resolver: zodResolver(rechazarCuarentenaSchema),
    defaultValues: {
      motivo: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const clean = toRechazarPayload(values)
    try {
      await mutation.mutateAsync({
        registros: records.map((r) => ({
          tabla_origen: r.tabla_origen,
          id_registro: r.id_registro,
        })),
        motivo: clean.motivo,
      })
      onCompleted()
      onClose()
    } catch {
      // Manejado por notifyStage2MutationError
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Trash2 className="size-4 text-rose-600" />
          Descartar lote en Cuarentena MDM
        </DialogTitle>
        <DialogDescription>
          Marca como <span className="font-mono">DESCARTADO</span> los{' '}
          <span className="font-mono font-semibold text-foreground">{records.length}</span>{' '}
          registros seleccionados.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <BatchPreviewSummary records={records} />

        <div className="space-y-1.5">
          <Label htmlFor="batch-motivo">
            Motivo del descarte masivo <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="batch-motivo"
            rows={2}
            placeholder="Describe el motivo del descarte..."
            aria-invalid={Boolean(errors.motivo)}
            {...register('motivo')}
          />
          {errors.motivo && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.motivo.message}</p>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {DISCARD_REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue('motivo', preset, { shouldValidate: true })}
                className="rounded border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={records.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Descartando...
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Descartar {records.length} registros
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
