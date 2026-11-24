import { Loader2, Power, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { getRolMeta } from '../schemas'
import type { UsuarioAdmin } from '../types'

interface ConfirmUserToggleDialogProps {
  target: UsuarioAdmin | null
  isPending: boolean
  onClose: () => void
  onConfirm: (usuario: UsuarioAdmin) => void
}

export function ConfirmUserToggleDialog({
  target,
  isPending,
  onClose,
  onConfirm,
}: ConfirmUserToggleDialogProps) {
  const isDeactivating = Boolean(target?.es_activo)
  const rolMeta = getRolMeta(target?.rol)

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isDeactivating ? (
              <Power className="size-4 text-rose-500" />
            ) : (
              <RotateCcw className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {isDeactivating ? 'Desactivar usuario' : 'Activar usuario'}
          </DialogTitle>
          <DialogDescription>
            {isDeactivating
              ? 'Marca Es_Activo = 0 en Seguridad.Usuarios. El usuario no podrá iniciar nuevas sesiones mientras permanezca inactivo.'
              : 'Restaura Es_Activo = 1 en Seguridad.Usuarios para habilitar nuevamente el acceso al sistema.'}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-semibold text-foreground">
                @{target.nombre_usuario}
              </span>
              <div className="flex items-center gap-1.5">
                <StatusBadge
                  label={target.rol}
                  tone={rolMeta.tone}
                  showDot={false}
                />
                <StatusBadge
                  label={target.es_activo ? 'ACTIVO' : 'INACTIVO'}
                  tone={target.es_activo ? 'ok' : 'cancelled'}
                />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {target.nombre_display}
            </p>
            <p className="text-muted-foreground">
              Correo:{' '}
              <span className="text-foreground">
                {target.email || 'Sin correo registrado'}
              </span>
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={isDeactivating ? 'destructive' : 'default'}
            disabled={!target || isPending}
            onClick={() => {
              if (target) onConfirm(target)
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Aplicando...
              </>
            ) : isDeactivating ? (
              <>
                <Power className="size-3.5" />
                Confirmar desactivación
              </>
            ) : (
              <>
                <RotateCcw className="size-3.5" />
                Confirmar activación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
