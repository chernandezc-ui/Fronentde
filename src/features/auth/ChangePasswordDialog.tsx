import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { cambiarClaveRequest } from '@/features/auth/authApi'

const changePasswordSchema = z
  .object({
    clave_actual: z.string().min(1, 'Ingresa tu contraseña actual.'),
    clave_nueva: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
      .max(200, 'La contraseña excede el límite permitido.'),
    confirmar_clave: z.string().min(1, 'Confirma la nueva contraseña.'),
  })
  .refine((data) => data.clave_nueva === data.confirmar_clave, {
    message: 'Las contraseñas nuevas no coinciden.',
    path: ['confirmar_clave'],
  })
  .refine((data) => data.clave_nueva !== data.clave_actual, {
    message: 'La nueva contraseña debe ser diferente a la actual.',
    path: ['clave_nueva'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      clave_actual: '',
      clave_nueva: '',
      confirmar_clave: '',
    },
  })

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
      setSubmitError(null)
      setShowCurrent(false)
      setShowNew(false)
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: ChangePasswordFormValues) {
    setSubmitError(null)
    try {
      const res = await cambiarClaveRequest({
        clave_actual: values.clave_actual,
        clave_nueva: values.clave_nueva,
      })
      toast.success(res.mensaje || 'Contraseña actualizada correctamente.')
      handleClose(false)
    } catch (err) {
      setSubmitError(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            Cambiar contraseña
          </DialogTitle>
          <DialogDescription>
            Actualiza la clave de acceso de tu cuenta. Debe contener al menos 8 caracteres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError != null && (
            <ApiErrorBanner error={submitError} title="No se pudo actualizar la contraseña" />
          )}

          <div className="space-y-1.5">
            <Label htmlFor="clave_actual">Contraseña actual</Label>
            <div className="relative">
              <Input
                id="clave_actual"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!errors.clave_actual}
                className="pr-9"
                {...register('clave_actual')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.clave_actual && (
              <p className="text-xs text-destructive">{errors.clave_actual.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clave_nueva">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="clave_nueva"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={!!errors.clave_nueva}
                className="pr-9"
                {...register('clave_nueva')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNew ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.clave_nueva && (
              <p className="text-xs text-destructive">{errors.clave_nueva.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar_clave">Confirmar nueva contraseña</Label>
            <Input
              id="confirmar_clave"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmar_clave}
              {...register('confirmar_clave')}
            />
            {errors.confirmar_clave && (
              <p className="text-xs text-destructive">{errors.confirmar_clave.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Guardar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
