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
import type { DimVariedad } from '../types'

interface ConfirmVarietyToggleDialogProps {
  target: DimVariedad | null
  isPending: boolean
  onClose: () => void
  onConfirm: (variedad: DimVariedad) => void
}

export function ConfirmVarietyToggleDialog({
  target,
  isPending,
  onClose,
  onConfirm,
}: ConfirmVarietyToggleDialogProps) {
  const isDeactivating = Boolean(target?.es_activa)

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
            {isDeactivating ? 'Desactivar variedad' : 'Reactivar variedad'}
          </DialogTitle>
          <DialogDescription>
            {isDeactivating
              ? 'Soft-delete trazable: marca Es_Activa = 0 en Silver.Dim_Variedad conservando integridad histórica en los facts del DWH.'
              : 'Restaura Es_Activa = 1 en Silver.Dim_Variedad para volver a habilitar esta variedad en las operaciones del DWH.'}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-muted-foreground">
                ID #{target.id_variedad}
              </span>
              <StatusBadge
                label={target.es_activa ? 'ACTIVA' : 'INACTIVA'}
                tone={target.es_activa ? 'ok' : 'cancelled'}
              />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {target.nombre_variedad}
            </p>
            <p className="text-muted-foreground">
              Breeder:{' '}
              <span className="text-foreground">
                {target.breeder || 'Sin especificar'}
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
                Confirmar reactivación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
