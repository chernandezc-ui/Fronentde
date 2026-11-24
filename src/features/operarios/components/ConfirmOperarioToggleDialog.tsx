import { AlertTriangle, Loader2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OperarioPersonal } from '../types'
import { useToggleOperarioEstadoMutation } from '../useOperariosQueries'

interface ConfirmOperarioToggleDialogProps {
  operario: OperarioPersonal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function ConfirmOperarioToggleDialog({
  operario,
  open,
  onOpenChange,
  onCompleted,
}: ConfirmOperarioToggleDialogProps) {
  const toggleMutation = useToggleOperarioEstadoMutation()
  const currentlyActive = operario?.es_activo ?? true
  const nextActivar = !currentlyActive

  const handleConfirm = async () => {
    if (!operario?.dni) return
    try {
      await toggleMutation.mutateAsync({
        dni: operario.dni,
        activar: nextActivar,
      })
      onCompleted?.()
      onOpenChange(false)
    } catch {
      // Manejado por notifyStage2MutationError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {nextActivar ? (
              <UserCheck className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-rose-600" />
            )}
            {nextActivar ? 'Reactivar operario' : 'Desactivar operario'}
          </DialogTitle>
          <DialogDescription>
            {nextActivar
              ? `El operario ${operario?.nombre_completo ?? ''} (DNI ${operario?.dni ?? '—'}) volverá a estar habilitado en Silver.Dim_Personal.`
              : `El operario ${operario?.nombre_completo ?? ''} (DNI ${operario?.dni ?? '—'}) quedará inactivo para nuevas asignaciones sin perder historial.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={toggleMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={nextActivar ? 'default' : 'destructive'}
            disabled={!operario?.dni || toggleMutation.isPending}
            onClick={() => void handleConfirm()}
          >
            {toggleMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Aplicando...
              </>
            ) : nextActivar ? (
              <>
                <UserCheck className="size-3.5" />
                Confirmar reactivación
              </>
            ) : (
              <>
                <UserX className="size-3.5" />
                Confirmar desactivación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
