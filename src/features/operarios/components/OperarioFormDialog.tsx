import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserPlus, UserRound } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  operarioFormSchema,
  toUpsertOperarioPayload,
  type OperarioFormValues,
} from '../operariosUtils'
import type { OperarioPersonal } from '../types'
import { useCreateOperarioMutation, useUpdateOperarioMutation } from '../useOperariosQueries'

interface OperarioFormDialogProps {
  open: boolean
  operario: OperarioPersonal | null
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function OperarioFormDialog({
  open,
  operario,
  onOpenChange,
  onSaved,
}: OperarioFormDialogProps) {
  const formKey = operario ? `edit-op-${operario.dni ?? operario.nombre_completo}` : `create-op-${open}`
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <OperarioFormContent
          key={formKey}
          operario={operario}
          onClose={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

function normalizeSexoValue(raw: string | null | undefined): '' | 'M' | 'F' {
  const up = (raw ?? '').trim().toUpperCase()
  if (up === 'M' || up === 'MASCULINO') return 'M'
  if (up === 'F' || up === 'FEMENINO') return 'F'
  return ''
}

function OperarioFormContent({
  operario,
  onClose,
  onSaved,
}: {
  operario: OperarioPersonal | null
  onClose: () => void
  onSaved?: () => void
}) {
  const isEditing = Boolean(operario?.dni)
  const createMutation = useCreateOperarioMutation()
  const updateMutation = useUpdateOperarioMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OperarioFormValues>({
    resolver: zodResolver(operarioFormSchema),
    defaultValues: {
      dni: operario?.dni ?? '',
      nombre_completo: operario?.nombre_completo ?? '',
      rol: operario?.rol ?? '',
      sexo: normalizeSexoValue(operario?.sexo),
      id_planilla: operario?.id_planilla ?? '',
      es_activo: operario?.es_activo ?? true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload = toUpsertOperarioPayload(values)
    try {
      if (isEditing && operario?.dni) {
        await updateMutation.mutateAsync({ dni: operario.dni, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onSaved?.()
      onClose()
    } catch {
      // Notificado por notifyStage2MutationError
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          {isEditing ? (
            <UserRound className="size-4 text-primary" />
          ) : (
            <UserPlus className="size-4 text-primary" />
          )}
          {isEditing ? 'Editar operario' : 'Nuevo operario'}
        </DialogTitle>
        <DialogDescription>
          Mantenimiento del padrón operativo en{' '}
          <span className="font-mono text-xs text-foreground">Silver.Dim_Personal</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="op-dni">
              DNI / Documento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="op-dni"
              placeholder="Ej. 07451234"
              className="font-mono text-xs"
              readOnly={isEditing}
              aria-invalid={Boolean(errors.dni)}
              {...register('dni')}
            />
            {errors.dni && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.dni.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-planilla">ID Planilla</Label>
            <Input
              id="op-planilla"
              placeholder="Ej. PL-1042"
              className="font-mono text-xs"
              {...register('id_planilla')}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="op-nombre">
            Nombre completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="op-nombre"
            placeholder="Apellido Nombre"
            aria-invalid={Boolean(errors.nombre_completo)}
            {...register('nombre_completo')}
          />
          {errors.nombre_completo && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {errors.nombre_completo.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="op-rol">Rol operativo</Label>
            <Input id="op-rol" placeholder="Ej. Evaluador" {...register('rol')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-sexo">Sexo</Label>
            <Controller
              control={control}
              name="sexo"
              render={({ field }) => (
                <Select
                  value={field.value || 'NONE'}
                  onValueChange={(val) =>
                    field.onChange(val === 'M' || val === 'F' ? val : '')
                  }
                >
                  <SelectTrigger id="op-sexo" size="sm" className="w-full">
                    <SelectValue>
                      {field.value === 'M'
                        ? 'Masculino (M)'
                        : field.value === 'F'
                          ? 'Femenino (F)'
                          : 'No especificado'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No especificado</SelectItem>
                    <SelectItem value="M">Masculino (M)</SelectItem>
                    <SelectItem value="F">Femenino (F)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <Controller
          control={control}
          name="es_activo"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <Label htmlFor="op-activo" className="cursor-pointer text-xs">
                Operario activo en padrón
              </Label>
              <Switch
                id="op-activo"
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
              'Crear operario'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
