import { cn } from '@/lib/utils'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { classifyAsertividad } from '../operariosUtils'

const BAR_COLOR_BY_LEVEL = {
  ok: 'bg-emerald-500',
  warning: 'bg-orange-500',
  error: 'bg-rose-500',
  sin_medicion: 'bg-muted-foreground/30',
} as const

interface AsertividadMeterProps {
  value: number | null | undefined
  compact?: boolean
  className?: string
}

export function AsertividadMeter({
  value,
  compact = false,
  className,
}: AsertividadMeterProps) {
  const clasif = classifyAsertividad(value)

  if (clasif.nivel === 'sin_medicion' || clasif.progressValue === null) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <StatusBadge label="Sin medición" tone="neutral" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        compact ? 'min-w-[168px]' : 'w-full',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="metric-value font-mono text-xs font-semibold text-foreground">
          {clasif.formattedPct}
        </span>
        <StatusBadge
          label={clasif.label}
          tone={clasif.tone}
          className="h-5 px-1.5 text-[10px]"
        />
      </div>
      <div
        role="progressbar"
        aria-label={`Asertividad ${clasif.formattedPct}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clasif.progressValue * 10) / 10}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            BAR_COLOR_BY_LEVEL[clasif.nivel],
          )}
          style={{ width: `${clasif.progressValue}%` }}
        />
      </div>
    </div>
  )
}
