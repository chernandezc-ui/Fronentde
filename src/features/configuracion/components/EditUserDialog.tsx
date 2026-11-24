import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserCog } from 'lucide-react'
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
import type { RolUsuario } from '@/shared/auth/authStore'
import {
  ROLES_USUARIO_META,
  ROLES_USUARIO_VALORES,
  USUARIO_DISPLAY_MAX,
  editUsuarioFormSchema,
  getRolMeta,
  toUpdateUsuarioPayload,
  type EditUsuarioFormValues,
} from '../schemas'
import type { UsuarioAdmin } from '../types'
import { useUpdateUsuarioMutation } from '../useConfiguracionQueries'

interface EditUserDialogProps {
  user: UsuarioAdmin | null
  currentUsername: string | null
  onClose: () => void
}

function toSafeRol(rol: string | undefined | null): RolUsuario {
  const norm = (rol ?? '').toLowerCase().trim()
  if ((ROLES_USUARIO_VALORES as readonly string[]).includes(norm)) {
    return norm as RolUsuario
  }
  return 'viewer'
}

export function EditUserDialog({
  user,
  currentUsername,
  onClose,
}: EditUserDialogProps) {
  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        {user !== null && (
          <EditUserFormContent
            key={user.nombre_usuario}
            user={user}
            currentUsername={currentUsername}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditUserFormContent({
  user,
  currentUsername,
  onClose,
}: {
  user: UsuarioAdmin
  currentUsername: string | null
  onClose: () => void
}) {
  const updateMutation = useUpdateUsuarioMutation()
  const isSelf =
    (currentUsername ?? '').trim().length > 0 &&
    user.nombre_usuario.toLowerCase() ===
      (currentUsername ?? '').trim().toLowerCase()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditUsuarioFormValues>({
    resolver: zodResolver(editUsuarioFormSchema),
    defaultValues: {
      nombre_display: user.nombre_display,
      email: user.email ?? '',
      rol: toSafeRol(user.rol),
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const safeValues: EditUsuarioFormValues = isSelf
      ? { ...values, rol: toSafeRol(user.rol) }
      : values
    try {
      await updateMutation.mutateAsync({
        nombreUsuario: user.nombre_usuario,
        payload: toUpdateUsuarioPayload(safeValues),
      })
      onClose()
    } catch {
      // Manejado por notifyStage2MutationError
    }
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <UserCog className="size-4 text-primary" />
          Editar usuario
        </DialogTitle>
        <DialogDescription className="text-xs">
          Actualiza perfil y rol de{' '}
          <span className="font-mono font-semibold text-foreground">
            {user.nombre_usuario}
          </span>{' '}
          en <span className="font-mono text-foreground">Seguridad.Usuarios</span>.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-display" className="text-xs">
            Nombre visible
          </Label>
          <Input
            id="edit-user-display"
            maxLength={USUARIO_DISPLAY_MAX}
            disabled={updateMutation.isPending}
            {...register('nombre_display')}
          />
          {errors.nombre_display && (
            <p className="text-[11px] text-destructive">
              {errors.nombre_display.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-user-email" className="text-xs">
            Correo electrónico (opcional)
          </Label>
          <Input
            id="edit-user-email"
            type="email"
            placeholder="usuario@acp.pe"
            disabled={updateMutation.isPending}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-[11px] text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-user-rol" className="text-xs">
            Rol asignado
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
                disabled={isSelf || updateMutation.isPending}
              >
                <SelectTrigger id="edit-user-rol" className="w-full text-xs">
                  <SelectValue>{getRolMeta(field.value).label}</SelectValue>
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
          {isSelf && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              No puedes cambiar tu propio rol en sesión activa.
            </p>
          )}
          {errors.rol && (
            <p className="text-[11px] text-destructive">{errors.rol.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            Guardar cambios
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
