import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpenCheck, Loader2 } from 'lucide-react'
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
  mdmVariedadFormSchema,
  toUpsertMdmVariedadPayload,
  type MdmVariedadFormValues,
} from '../schemas'
import type { MdmVariedad } from '../types'
import { useCreateMdmVariedadMutation, useUpdateMdmVariedadMutation } from '../useMaestrosQueries'

interface MdmVariedadDialogProps {
  open: boolean
  item: MdmVariedad | null
  onOpenChange: (open: boolean) => void
}

export function MdmVariedadDialog({ open, item, onOpenChange }: MdmVariedadDialogProps) {
  const formKey = item ? `edit-mdm-${item.nombre_canonico}` : `create-mdm-${open}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <MdmVariedadFormContent key={formKey} item={item} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function MdmVariedadFormContent({
  item,
  onClose,
}: {
  item: MdmVariedad | null
  onClose: () => void
}) {
  const isEditing = Boolean(item)
  const createMutation = useCreateMdmVariedadMutation()
  const updateMutation = useUpdateMdmVariedadMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MdmVariedadFormValues>({
    resolver: zodResolver(mdmVariedadFormSchema),
    defaultValues: {
      nombre_canonico: item?.nombre_canonico ?? '',
      breeder: item?.breeder ?? '',
      es_activa: item?.es_activa ?? true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload = toUpsertMdmVariedadPayload(values)
    try {
      if (item) {
        await updateMutation.mutateAsync({
          nombreActual: item.nombre_canonico,
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
          <BookOpenCheck className="size-4 text-primary" />
          {isEditing ? 'Editar variedad canónica MDM' : 'Nueva variedad canónica MDM'}
        </DialogTitle>
        <DialogDescription>
          Gestiona el diccionario canónico en{' '}
          <span className="font-mono text-xs text-foreground">MDM.Catalogo_Variedades</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mdm-nombre-canonico">
            Nombre canónico <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mdm-nombre-canonico"
            placeholder="Ej. SEKOYA POP"
            aria-invalid={Boolean(errors.nombre_canonico)}
            {...register('nombre_canonico')}
          />
          {errors.nombre_canonico && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {errors.nombre_canonico.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mdm-breeder">Breeder</Label>
          <Input id="mdm-breeder" placeholder="Ej. Fall Creek" {...register('breeder')} />
          {errors.breeder && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.breeder.message}</p>
          )}
        </div>

        <Controller
          control={control}
          name="es_activa"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <Label htmlFor="mdm-es-activa" className="cursor-pointer text-xs">
                Variedad activa en homologación
              </Label>
              <Switch
                id="mdm-es-activa"
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
              'Crear variedad MDM'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
