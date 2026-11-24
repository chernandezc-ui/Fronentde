import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { ApiError } from '@/shared/api/client'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import {
  ROLES_USUARIO_META,
  USUARIO_CLAVE_MIN,
  USUARIO_DISPLAY_MAX,
  USUARIO_NOMBRE_MAX,
  createUsuarioFormSchema,
  getRolMeta,
  toCreateUsuarioPayload,
  type CreateUsuarioFormValues,
} from '../schemas'
import { useCreateUsuarioMutation } from '../useConfiguracionQueries'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_VALUES: CreateUsuarioFormValues = {
  nombre_usuario: '',
  nombre_display: '',
  email: '',
  clave: '',
  confirmar_clave: '',
  rol: 'viewer',
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [showPassword, setShowPassword] = useState(false)
  const createMutation = useCreateUsuarioMutation()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUsuarioFormValues>({
    resolver: zodResolver(createUsuarioFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const nombreUsuarioVal = useWatch({ control, name: 'nombre_usuario' }) ?? ''
  const nombreDisplayVal = useWatch({ control, name: 'nombre_display' }) ?? ''
  const selectedRol = useWatch({ control, name: 'rol' }) ?? 'viewer'
  const selectedRolMeta = getRolMeta(selectedRol)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(DEFAULT_VALUES)
      setSubmitError(null)
      setShowPassword(false)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await createMutation.mutateAsync(toCreateUsuarioPayload(values))
      handleOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('nombre_usuario', {
          type: 'server',
          message:
            err.detail ||
            `El usuario "${values.nombre_usuario.trim()}" ya existe.`,
        })
      }
      setSubmitError(err)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4 text-primary" />
            Crear usuario
          </DialogTitle>
          <DialogDescription>
            Registra una cuenta activa en{' '}
            <span className="font-mono text-xs text-foreground">
              Seguridad.Usuarios
            </span>{' '}
            con el rol operativo correspondiente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {submitError != null && (
            <ApiErrorBanner
              error={submitError}
              title="No se pudo crear el usuario"
            />
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* nombre_usuario */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cfg-user-login">
                  Usuario (login) <span className="text-destructive">*</span>
                </Label>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {nombreUsuarioVal.trim().length}/{USUARIO_NOMBRE_MAX}
                </span>
              </div>
              <Input
                id="cfg-user-login"
                placeholder="Ej. m.rodriguez"
                autoComplete="off"
                maxLength={USUARIO_NOMBRE_MAX}
                aria-invalid={Boolean(errors.nombre_usuario)}
                className="font-mono text-xs"
                {...register('nombre_usuario')}
              />
              {errors.nombre_usuario ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.nombre_usuario.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  3 a 100 caracteres, sin espacios.
                </p>
              )}
            </div>

            {/* rol */}
            <div className="space-y-1.5">
              <Label htmlFor="cfg-user-rol">
                Rol de acceso <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="rol"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      if (val) field.onChange(val)
                    }}
                  >
                    <SelectTrigger
                      id="cfg-user-rol"
                      className="w-full"
                      aria-invalid={Boolean(errors.rol)}
                    >
                      <SelectValue>{selectedRolMeta.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES_USUARIO_META.map((rolItem) => (
                        <SelectItem key={rolItem.value} value={rolItem.value}>
                          {rolItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.rol ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.rol.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  {selectedRolMeta.descripcion}
                </p>
              )}
            </div>
          </div>

          {/* nombre_display */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="cfg-user-display">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  nombreDisplayVal.trim().length > USUARIO_DISPLAY_MAX - 20
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {nombreDisplayVal.trim().length}/{USUARIO_DISPLAY_MAX}
              </span>
            </div>
            <Input
              id="cfg-user-display"
              placeholder="Ej. María Rodríguez Silva"
              autoComplete="name"
              maxLength={USUARIO_DISPLAY_MAX}
              aria-invalid={Boolean(errors.nombre_display)}
              {...register('nombre_display')}
            />
            {errors.nombre_display && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.nombre_display.message}
              </p>
            )}
          </div>

          {/* email */}
          <div className="space-y-1.5">
            <Label htmlFor="cfg-user-email">Correo electrónico (opcional)</Label>
            <Input
              id="cfg-user-email"
              type="email"
              placeholder="Ej. mrodriguez@acp.com.pe"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* clave + confirmar_clave */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-user-clave">
                Contraseña inicial <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="cfg-user-clave"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={`Mínimo ${USUARIO_CLAVE_MIN} caracteres`}
                  aria-invalid={Boolean(errors.clave)}
                  className="pr-9"
                  {...register('clave')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.clave && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.clave.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cfg-user-confirmar">
                Confirmar contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cfg-user-confirmar"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repite la contraseña"
                aria-invalid={Boolean(errors.confirmar_clave)}
                {...register('confirmar_clave')}
              />
              {errors.confirmar_clave && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {errors.confirmar_clave.message}
                </p>
              )}
            </div>
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
                  Creando...
                </>
              ) : (
                <>
                  <UserPlus className="size-3.5" />
                  Crear usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
