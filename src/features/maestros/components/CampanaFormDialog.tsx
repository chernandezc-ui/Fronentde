import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarRange, Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  campanaFormSchema,
  toUpsertCampanaPayload,
  type CampanaFormValues,
} from '../schemas'
import type { CampanaItem } from '../types'
import { useCreateCampanaMutation, useUpdateCampanaMutation } from '../useMaestrosQueries'

interface CampanaFormDialogProps {
  open: boolean
  item: CampanaItem | null
  onOpenChange: (open: boolean) => void
}

export function CampanaFormDialog({ open, item, onOpenChange }: CampanaFormDialogProps) {
  const formKey = item ? `edit-camp-${item.id_campana}` : `create-camp-${open}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CampanaFormContent key={formKey} item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CampanaFormContent({
  item,
  onClose,
}: {
  item: CampanaItem | null
  onClose: () => void
}) {
  const isEditing = Boolean(item)
  const createMutation = useCreateCampanaMutation()
  const updateMutation = useUpdateCampanaMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampanaFormValues>({
    resolver: zodResolver(campanaFormSchema),
    defaultValues: {
      codigo: item?.codigo ?? '',
      nombre_campana: item?.nombre_campana ?? '',
      fecha_inicio: item?.fecha_inicio?.slice(0, 10) ?? '',
      fecha_fin: item?.fecha_fin?.slice(0, 10) ?? '',
      es_activa: item?.es_activa ?? true,
      descripcion: item?.descripcion ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload = toUpsertCampanaPayload(values)
    try {
      if (item) {
        await updateMutation.mutateAsync({
          idCampana: item.id_campana,
          payload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onClose()
    } catch {
      // Manejado por notifyStage2MutationError
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="size-4 text-primary" />
          {isEditing ? 'Editar campaña agrícola' : 'Nueva campaña agrícola'}
        </DialogTitle>
        <DialogDescription>
          Define las ventanas estacionales oficiales en{' '}
          <span className="font-mono text-xs text-foreground">Silver.Dim_Campana</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="camp-codigo">Código</Label>
            <Input
              id="camp-codigo"
              placeholder="Ej. C2026-27"
              className="font-mono text-xs"
              {...register('codigo')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-nombre">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="camp-nombre"
              placeholder="Ej. Campaña Arándano 2026–2027"
              aria-invalid={Boolean(errors.nombre_campana)}
              {...register('nombre_campana')}
            />
            {errors.nombre_campana && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.nombre_campana.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="camp-inicio">
              Fecha inicio <span className="text-destructive">*</span>
            </Label>
            <Input
              id="camp-inicio"
              type="date"
              aria-invalid={Boolean(errors.fecha_inicio)}
              {...register('fecha_inicio')}
            />
            {errors.fecha_inicio && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.fecha_inicio.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="camp-fin">
              Fecha cierre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="camp-fin"
              type="date"
              aria-invalid={Boolean(errors.fecha_fin)}
              {...register('fecha_fin')}
            />
            {errors.fecha_fin && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.fecha_fin.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="camp-desc">Descripción</Label>
          <Textarea
            id="camp-desc"
            rows={2}
            placeholder="Notas operativas de la campaña..."
            {...register('descripcion')}
          />
        </div>

        <Controller
          control={control}
          name="es_activa"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <Label htmlFor="camp-activa" className="cursor-pointer text-xs">
                Marcar como campaña activa
              </Label>
              <Switch
                id="camp-activa"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Guardando...
              </>
            ) : isEditing ? (
              'Guardar cambios'
            ) : (
              'Crear campaña'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
