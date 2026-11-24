import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type OperationalTone =
  | 'ok'
  | 'running'
  | 'pending'
  | 'warning'
  | 'error'
  | 'cancelled'
  | 'neutral'
  | 'readonly'

const TONE_CLASSES: Record<OperationalTone, string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  running: 'border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-300',
  pending: 'border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300',
  warning: 'border-orange-500/35 bg-orange-500/12 text-orange-700 dark:text-orange-300',
  error: 'border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300',
  cancelled: 'border-zinc-500/30 bg-zinc-500/12 text-zinc-600 dark:text-zinc-300',
  neutral: 'border-border bg-muted/60 text-muted-foreground',
  readonly: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
}

const DOT_CLASSES: Record<OperationalTone, string> = {
  ok: 'bg-emerald-500',
  running: 'bg-sky-500 animate-pulse',
  pending: 'bg-amber-500',
  warning: 'bg-orange-500',
  error: 'bg-rose-500',
  cancelled: 'bg-zinc-400',
  neutral: 'bg-muted-foreground/60',
  readonly: 'bg-indigo-500',
}

export function mapEstadoToTone(estado: string | null | undefined): OperationalTone {
  const norm = (estado || '').toUpperCase().trim()
  if (['OK', 'ACTIVO', 'LIBRE', 'COMPLETADO', 'RESUELTO', 'PUBLICADO', 'EXITOSO'].includes(norm)) return 'ok'
  if (['EJECUTANDO', 'EN_PROCESO', 'PROCESANDO', 'OCUPADO', 'RUNNING'].includes(norm)) return 'running'
  if (['PENDIENTE', 'EN_COLA', 'QUEUED', 'DEGRADADO'].includes(norm)) return 'pending'
  if (['PARCIAL', 'ADVERTENCIA', 'INCOMPLETO', 'ESTIMADO'].includes(norm)) return 'warning'
  if (['ERROR', 'FALLIDO', 'TIMEOUT', 'LOCK_VENCIDO', 'NO_LISTO', 'CONTROL_PLANE_ERROR', 'RECHAZADO'].includes(norm)) return 'error'
  if (['CANCELADO', 'DESCARTADO'].includes(norm)) return 'cancelled'
  return 'neutral'
}

interface StatusBadgeProps {
  label: string
  tone?: OperationalTone
  showDot?: boolean
  className?: string
}

export function StatusBadge({ label, tone, showDot = true, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? mapEstadoToTone(label)
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-tight',
        TONE_CLASSES[resolvedTone],
        className,
      )}
    >
      {showDot && <span className={cn('size-1.5 rounded-full', DOT_CLASSES[resolvedTone])} />}
      {label}
    </Badge>
  )
}
