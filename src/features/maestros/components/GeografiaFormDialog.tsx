import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MapPin } from 'lucide-react'
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
import {
  geografiaFormSchema,
  getGeografiaIdentifier,
  toUpsertGeografiaPayload,
  type GeografiaFormValues,
} from '../schemas'
import type { GeografiaItem } from '../types'
import { useCreateGeografiaMutation, useUpdateGeografiaMutation } from '../useMaestrosQueries'

interface GeografiaFormDialogProps {
  open: boolean
  item: GeografiaItem | null
  onOpenChange: (open: boolean) => void
}

export function GeografiaFormDialog({ open, item, onOpenChange }: GeografiaFormDialogProps) {
  const formKey = item ? `edit-${getGeografiaIdentifier(item)}` : `create-${open}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <GeografiaFormContent key={formKey} item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function GeografiaFormContent({
  item,
  onClose,
}: {
  item: GeografiaItem | null
  onClose: () => void
}) {
  const isEditing = Boolean(item)
  const createMutation = useCreateGeografiaMutation()
  const updateMutation = useUpdateGeografiaMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GeografiaFormValues>({
    resolver: zodResolver(geografiaFormSchema),
    defaultValues: {
      fundo: item?.fundo ?? '',
      sector: item?.sector ?? '',
      modulo: item?.modulo != null ? String(item.modulo) : '',
      turno: item?.turno != null ? String(item.turno) : '',
      valvula: item?.valvula ?? '',
      cama: item?.cama ?? '',
      codigo_sap_campo: item?.codigo_sap_campo ?? '',
      es_test_block: item?.es_test_block ?? false,
      es_vigente: item?.es_vigente ?? true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload = toUpsertGeografiaPayload(values)
    try {
      if (item) {
        await updateMutation.mutateAsync({
          id: getGeografiaIdentifier(item),
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
          <MapPin className="size-4 text-primary" />
          {isEditing ? 'Editar unidad geográfica' : 'Nueva unidad geográfica'}
        </DialogTitle>
        <DialogDescription>
          Administra fundos, sectores, válvulas, camas y código SAP en{' '}
          <span className="font-mono text-xs text-foreground">Silver.Dim_Geografia</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="geo-fundo">
              Fundo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="geo-fundo"
              placeholder="Ej. Cerro Prieto"
              aria-invalid={Boolean(errors.fundo)}
              {...register('fundo')}
            />
            {errors.fundo && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.fundo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="geo-sector">
              Sector <span className="text-destructive">*</span>
            </Label>
            <Input
              id="geo-sector"
              placeholder="Ej. Norte 1"
              aria-invalid={Boolean(errors.sector)}
              {...register('sector')}
            />
            {errors.sector && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.sector.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="geo-modulo">Módulo</Label>
            <Input
              id="geo-modulo"
              inputMode="numeric"
              placeholder="Ej. 4"
              aria-invalid={Boolean(errors.modulo)}
              {...register('modulo')}
            />
            {errors.modulo && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.modulo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="geo-turno">Turno</Label>
            <Input
              id="geo-turno"
              inputMode="numeric"
              placeholder="Ej. 2"
              aria-invalid={Boolean(errors.turno)}
              {...register('turno')}
            />
            {errors.turno && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.turno.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="geo-valvula">Válvula</Label>
            <Input id="geo-valvula" placeholder="Ej. V-04" {...register('valvula')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="geo-cama">Cama</Label>
            <Input id="geo-cama" placeholder="Ej. C-12" {...register('cama')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="geo-sap">Código SAP Campo</Label>
          <Input
            id="geo-sap"
            placeholder="Ej. ACP-M4-T2-V04"
            className="font-mono text-xs"
            {...register('codigo_sap_campo')}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            control={control}
            name="es_test_block"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                <Label htmlFor="geo-test-block" className="cursor-pointer text-xs">
                  Es Test Block
                </Label>
                <Switch
                  id="geo-test-block"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />

          <Controller
            control={control}
            name="es_vigente"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                <Label htmlFor="geo-vigente" className="cursor-pointer text-xs">
                  Unidad vigente
                </Label>
                <Switch
                  id="geo-vigente"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>

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
              'Crear unidad'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
