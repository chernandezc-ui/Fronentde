import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  ESTADOS_BIOLOGICOS_ORDEN,
  ESTADO_BIOLOGICO_META,
  SEMANAS_SIXWEEK,
  SEMANAS_SIXWEEK_KEYS,
  cerrarMatriz,
  formatPctDecimal,
} from '@/features/configuracion/matrizUtils'
import type {
  BiologiaConstantes,
  MatrizBiologicaCompleta,
} from '@/features/configuracion/types'
import type { OrigenMatrizProyeccion } from '../types'

interface MatrizBiologicaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  matrizActiva: MatrizBiologicaCompleta
  constantesActivas: BiologiaConstantes
  origenMatriz: OrigenMatrizProyeccion
}

function getHeatOpacityClass(val: number): string {
  if (val >= 0.7) return 'bg-emerald-500/20 text-foreground font-semibold'
  if (val >= 0.35) return 'bg-emerald-500/12 text-foreground font-medium'
  if (val > 0) return 'bg-emerald-500/[0.06] text-foreground'
  return 'text-muted-foreground/35'
}

export function MatrizBiologicaSheet({
  open,
  onOpenChange,
  matrizActiva,
  constantesActivas,
  origenMatriz,
}: MatrizBiologicaSheetProps) {
  const cierre = cerrarMatriz(matrizActiva)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <SheetTitle>Matriz biológica y constantes del modelo</SheetTitle>
            <StatusBadge
              label={origenMatriz === 'backend' ? 'Matriz oficial' : 'Matriz estándar'}
              tone={origenMatriz === 'backend' ? 'ok' : 'pending'}
              showDot={false}
            />
          </div>
          <SheetDescription className="text-xs">
            Distribución efectiva de maduración (W1–W6) aplicada al cálculo Six-Week. Para modificar estos valores de forma permanente, edítalos en Configuración.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {/* Matriz 7x6 con mini-heatmap */}
          <div className="space-y-2.5 px-5 py-4">
            <h3 className="text-xs font-semibold text-foreground">
              Distribución por estado fenológico (W1–W6)
            </h3>
            <div className="min-w-0 overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/35 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Estado</th>
                    {SEMANAS_SIXWEEK.map((w) => (
                      <th key={w} className="px-2 py-2 text-right font-mono font-medium">
                        W{w}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-mono font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ESTADOS_BIOLOGICOS_ORDEN.map((estado) => {
                    const meta = ESTADO_BIOLOGICO_META[estado]
                    const row = cierre[estado] ?? [0, 0, 0, 0, 0, 0]
                    const total = row.reduce((acc, v) => acc + v, 0)
                    return (
                      <tr key={estado}>
                        <td className="px-3 py-2 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn('size-1.5 rounded-full', meta.dotClass)} />
                            {meta.label}
                          </span>
                        </td>
                        {row.map((val, idx) => (
                          <td
                            key={idx}
                            className={cn(
                              'metric-value px-2 py-2 text-right font-mono',
                              getHeatOpacityClass(val),
                            )}
                          >
                            {val > 0 ? formatPctDecimal(val) : '—'}
                          </td>
                        ))}
                        <td className="metric-value px-3 py-2 text-right font-mono font-semibold text-foreground">
                          {formatPctDecimal(total)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Constantes del motor */}
          <div className="space-y-2.5 px-5 py-4">
            <h3 className="text-xs font-semibold text-foreground">
              Constantes agronómicas del motor
            </h3>
            <dl className="grid gap-2 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Plantas por punto de muestreo</dt>
                <dd className="metric-value font-mono font-semibold text-foreground">
                  {constantesActivas.plantas_por_punto}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <dt className="text-muted-foreground">Factor de retención (W1–W6)</dt>
                <dd className="metric-value font-mono text-foreground">
                  {SEMANAS_SIXWEEK_KEYS.map((wk) => constantesActivas.decay_factor[wk]).join(' · ')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Ajuste semanal productivas</dt>
                <dd className="metric-value font-mono text-foreground">
                  {SEMANAS_SIXWEEK_KEYS.map((wk) => {
                    const v = constantesActivas.delta_productivas[wk]
                    return `${v > 0 ? '+' : ''}${v}`
                  }).join(' · ')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/configuracion?tab=biologia" />}
          >
            Editar en Configuración
            <ArrowUpRight className="size-3.5" />
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
