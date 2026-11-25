import { AlertTriangle, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatIdTiempo } from '../proyeccionesUtils'
import { formatMarginPctDelta } from '../proyeccionesWorkflow'
import type { OrigenMatrizProyeccion } from '../types'

interface ConfirmExecuteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  idTiempo: number | null
  fundo: string
  modulo: string
  variedad: string
  condicion: string
  margenPesimista: number
  margenOptimista: number
  origenMatriz: OrigenMatrizProyeccion
  estimadasFallback?: number
  unidadesTotales?: number
  isPending: boolean
  onConfirm: () => void
}

export function ConfirmExecuteDialog({
  open,
  onOpenChange,
  idTiempo,
  fundo,
  modulo,
  variedad,
  condicion,
  margenPesimista,
  margenOptimista,
  origenMatriz,
  estimadasFallback = 0,
  unidadesTotales = 0,
  isPending,
  onConfirm,
}: ConfirmExecuteDialogProps) {
  const alcance = [
    fundo || 'Todos los fundos',
    modulo ? `Módulo ${modulo}` : null,
    variedad || null,
    condicion || null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar publicación de proyección Six-Week</DialogTitle>
          <DialogDescription>
            Se guardará como versión oficial vigente para reportes. Si ya existe una proyección publicada para la misma fecha y alcance, será reemplazada en una única transacción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <dl className="grid gap-1.5 rounded-lg border bg-muted/35 p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">Fecha de evaluación</dt>
              <dd className="min-w-0 truncate font-mono font-medium text-foreground">
                {formatIdTiempo(idTiempo, true)}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">Alcance</dt>
              <dd className="min-w-0 truncate font-medium text-foreground" title={alcance}>
                {alcance}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">Bandas</dt>
              <dd className="min-w-0 truncate font-mono text-foreground">
                {formatMarginPctDelta(margenPesimista)} / {formatMarginPctDelta(margenOptimista)}
              </dd>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground">Matriz biológica</dt>
              <dd className="min-w-0 truncate font-medium text-foreground">
                {origenMatriz === 'backend' ? 'Configuración oficial' : 'Valores estándar'}
              </dd>
            </div>
          </dl>

          {estimadasFallback > 0 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {estimadasFallback} de {unidadesTotales} unidades no tienen censo real y usan estimación de respaldo (1,500 plantas). ¿Confirmas publicar de todas formas?
              </span>
            </div>
          )}

          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Detalle técnico</summary>
            <p className="mt-1 font-mono">
              POST /api/v1/proyecciones/ejecutar · Silver.Fact_Proyecciones (ID_Escenario = 4) ·
              factores {margenPesimista}/{margenOptimista}
            </p>
          </details>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Publicando…
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                Confirmar y publicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
