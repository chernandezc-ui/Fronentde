import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck } from 'lucide-react'
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
  REGLA_ACCIONES_SUGERIDAS,
  REGLA_TIPOS_SUGERIDOS,
  getReglaClave,
  reglaFormSchema,
  type ReglaFormValues,
} from '../schemas'
import type { ReglaValidacion } from '../types'
import {
  useCreateReglaMutation,
  useUpdateReglaMutation,
} from '../useConfiguracionQueries'

interface ReglaFormDialogProps {
  open: boolean
  item: ReglaValidacion | null
  onOpenChange: (open: boolean) => void
}

export function ReglaFormDialog({
  open,
  item,
  onOpenChange,
}: ReglaFormDialogProps) {
  const formKey = item ? `edit-${getReglaClave(item)}` : `create-${open}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ReglaFormContent
          key={formKey}
          item={item}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReglaFormContent({
  item,
  onClose,
}: {
  item: ReglaValidacion | null
  onClose: () => void
}) {
  const isEditing = Boolean(item)
  const createMutation = useCreateReglaMutation()
  const updateMutation = useUpdateReglaMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ReglaFormValues>({
    resolver: zodResolver(reglaFormSchema),
    defaultValues: {
      tabla_destino: item?.tabla_destino ?? '',
      columna: item?.columna ?? '',
      tipo_validacion: item?.tipo_validacion ?? 'RANGO',
      valor_min: item?.valor_min ?? null,
      valor_max: item?.valor_max ?? null,
      accion: item?.accion ?? 'CUARENTENA',
      activo: item?.activo ?? true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (item) {
        await updateMutation.mutateAsync({
          clave: getReglaClave(item),
          payload: values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }
      onClose()
    } catch {
      // Notificación gestionada por notifyStage2MutationError en el hook.
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" />
          {isEditing ? 'Editar regla de validación' : 'Nueva regla de validación'}
        </DialogTitle>
        <DialogDescription className="text-xs">
          Configura umbrales y comportamiento DQ en{' '}
          <span className="font-mono text-foreground">Config.Reglas_Validacion</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="regla-tabla" className="text-xs">
              Tabla destino
            </Label>
            <Input
              id="regla-tabla"
              placeholder="Ej. Silver.Fact_Cosecha"
              className="font-mono text-xs"
              disabled={isEditing || isPending}
              {...register('tabla_destino')}
            />
            {errors.tabla_destino && (
              <p className="text-[11px] text-destructive">
                {errors.tabla_destino.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="regla-columna" className="text-xs">
              Columna
            </Label>
            <Input
              id="regla-columna"
              placeholder="Ej. Kilos_Netos"
              className="font-mono text-xs"
              disabled={isEditing || isPending}
              {...register('columna')}
            />
            {errors.columna && (
              <p className="text-[11px] text-destructive">
                {errors.columna.message}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <p className="text-[11px] text-muted-foreground">
            La tabla y columna identifican la regla existente. Para validar otro campo, crea una regla nueva.
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="regla-tipo" className="text-xs">
            Tipo de validación
          </Label>
          <Input
            id="regla-tipo"
            placeholder="Ej. RANGO, NO_NULO, REGEX"
            className="font-mono text-xs uppercase"
            disabled={isPending}
            {...register('tipo_validacion')}
          />
          <div className="flex flex-wrap gap-1">
            {REGLA_TIPOS_SUGERIDOS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="xs"
                className="h-5 px-1.5 font-mono text-[10px]"
                disabled={isPending}
                onClick={() =>
                  setValue('tipo_validacion', preset, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                {preset}
              </Button>
            ))}
          </div>
          {errors.tipo_validacion && (
            <p className="text-[11px] text-destructive">
              {errors.tipo_validacion.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="regla-min" className="text-xs">
              Valor mínimo (opcional)
            </Label>
            <Controller
              control={control}
              name="valor_min"
              render={({ field }) => (
                <Input
                  id="regla-min"
                  type="number"
                  step="any"
                  placeholder="Sin límite inferior"
                  className="font-mono text-xs"
                  disabled={isPending}
                  value={
                    field.value === null || Number.isNaN(field.value)
                      ? ''
                      : String(field.value)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    field.onChange(raw === '' ? null : Number(raw))
                  }}
                />
              )}
            />
            {errors.valor_min && (
              <p className="text-[11px] text-destructive">
                {errors.valor_min.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="regla-max" className="text-xs">
              Valor máximo (opcional)
            </Label>
            <Controller
              control={control}
              name="valor_max"
              render={({ field }) => (
                <Input
                  id="regla-max"
                  type="number"
                  step="any"
                  placeholder="Sin límite superior"
                  className="font-mono text-xs"
                  disabled={isPending}
                  value={
                    field.value === null || Number.isNaN(field.value)
                      ? ''
                      : String(field.value)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.trim()
                    field.onChange(raw === '' ? null : Number(raw))
                  }}
                />
              )}
            />
            {errors.valor_max && (
              <p className="text-[11px] text-destructive">
                {errors.valor_max.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="regla-accion" className="text-xs">
            Acción ante incumplimiento
          </Label>
          <Input
            id="regla-accion"
            placeholder="Ej. CUARENTENA, RECHAZAR, ADVERTIR"
            className="font-mono text-xs uppercase"
            disabled={isPending}
            {...register('accion')}
          />
          <div className="flex flex-wrap gap-1">
            {REGLA_ACCIONES_SUGERIDAS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="xs"
                className="h-5 px-1.5 font-mono text-[10px]"
                disabled={isPending}
                onClick={() =>
                  setValue('accion', preset, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                {preset}
              </Button>
            ))}
          </div>
          {errors.accion && (
            <p className="text-[11px] text-destructive">
              {errors.accion.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
          <div>
            <Label htmlFor="regla-activa" className="text-xs font-medium">
              Regla activa en pipeline
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Solo las reglas activas se evalúan durante las cargas DQ.
            </p>
          </div>
          <Controller
            control={control}
            name="activo"
            render={({ field }) => (
              <Switch
                id="regla-activa"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isPending}
              />
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear regla'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
