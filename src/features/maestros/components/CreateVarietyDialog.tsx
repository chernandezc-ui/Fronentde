import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2, Plus, Sprout } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { cn } from '@/lib/utils'
import { ApiError } from '@/shared/api/client'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import {
  VARIEDAD_BREEDER_MAX,
  VARIEDAD_NOMBRE_MAX,
  createVarietyFormSchema,
  toCreateVarietyPayload,
  type CreateVarietyFormValues,
} from '../schemas'
import { useCreateDimVariedadMutation } from '../useMaestrosQueries'

interface CreateVarietyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateVarietyDialog({
  open,
  onOpenChange,
}: CreateVarietyDialogProps) {
  const [conflictDetail, setConflictDetail] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const createMutation = useCreateDimVariedadMutation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateVarietyFormValues>({
    resolver: zodResolver(createVarietyFormSchema),
    defaultValues: {
      nombre_variedad: '',
      breeder: '',
    },
  })

  const nombreValue = useWatch({ control, name: 'nombre_variedad' }) ?? ''
  const breederValue = useWatch({ control, name: 'breeder' }) ?? ''

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset({ nombre_variedad: '', breeder: '' })
      setConflictDetail(null)
      setSubmitError(null)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (values) => {
    setConflictDetail(null)
    setSubmitError(null)

    try {
      await createMutation.mutateAsync(toCreateVarietyPayload(values))
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const message =
          err.detail ||
          `Ya existe una variedad registrada con el nombre "${values.nombre_variedad.trim()}".`
        setConflictDetail(message)
        setError('nombre_variedad', {
          type: 'server',
          message,
        })
        return
      }
      setSubmitError(err)
    }
  })

  const nombreReg = register('nombre_variedad', {
    onChange: () => {
      if (conflictDetail) setConflictDetail(null)
    },
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sprout className="size-4 text-primary" />
            Nueva variedad DWH
          </DialogTitle>
          <DialogDescription>
            Registra una variedad activa en{' '}
            <span className="font-mono text-xs text-foreground">
              Silver.Dim_Variedad
            </span>
            . El nombre debe ser único en la dimensión.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {conflictDetail && (
            <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="flex items-center justify-between text-xs font-semibold">
                <span>Variedad duplicada</span>
                <span className="font-mono text-[11px] opacity-80">HTTP 409</span>
              </AlertTitle>
              <AlertDescription className="text-xs">
                {conflictDetail} Verifica si ya existe como inactiva para reactivarla en lugar de duplicarla.
              </AlertDescription>
            </Alert>
          )}

          {submitError != null && (
            <ApiErrorBanner
              error={submitError}
              title="No se pudo registrar la variedad"
            />
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="maestros-nombre-variedad">
                Nombre de variedad <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  nombreValue.trim().length > VARIEDAD_NOMBRE_MAX - 15
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {nombreValue.trim().length}/{VARIEDAD_NOMBRE_MAX}
              </span>
            </div>
            <Input
              id="maestros-nombre-variedad"
              placeholder="Ej. Ventura, Biloxi, Sekoya Pop..."
              autoComplete="off"
              maxLength={VARIEDAD_NOMBRE_MAX}
              aria-invalid={Boolean(errors.nombre_variedad)}
              {...nombreReg}
            />
            {errors.nombre_variedad ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.nombre_variedad.message}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Entre 2 y 150 caracteres. Los espacios al inicio o final se recortan automáticamente.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="maestros-breeder">Breeder / Obtentor (opcional)</Label>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  breederValue.trim().length > VARIEDAD_BREEDER_MAX - 10
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {breederValue.trim().length}/{VARIEDAD_BREEDER_MAX}
              </span>
            </div>
            <Input
              id="maestros-breeder"
              placeholder="Ej. Fall Creek, Planasa, Ozblu..."
              autoComplete="off"
              maxLength={VARIEDAD_BREEDER_MAX}
              aria-invalid={Boolean(errors.breeder)}
              {...register('breeder')}
            />
            {errors.breeder && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.breeder.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Crear variedad
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
