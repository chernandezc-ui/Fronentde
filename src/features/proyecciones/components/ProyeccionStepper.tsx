import { useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ProyeccionStepId, StepVisualState } from '../types'

interface ProyeccionStepperProps {
  steps: StepVisualState[]
  onSelectStep: (step: ProyeccionStepId) => void
}

export function ProyeccionStepper({ steps, onSelectStep }: ProyeccionStepperProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.active),
  )
  const activeStep = steps[activeIndex] ?? steps[0]
  const progressPct = Math.round(((activeIndex + 1) / Math.max(1, steps.length)) * 100)

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const direction = e.key === 'ArrowRight' ? 1 : -1
    let cursor = idx + direction
    while (cursor >= 0 && cursor < steps.length) {
      const candidate = steps[cursor]
      if (candidate.enabled) {
        onSelectStep(candidate.id)
        const el = document.getElementById(`proy-step-btn-${candidate.id}`)
        el?.focus()
        return
      }
      cursor += direction
    }
  }

  return (
    <nav
      aria-label="Pasos del flujo de proyección Six-Week"
      className="rounded-xl border border-border bg-card"
    >
      {/* Vista móvil (< md): resumen compacto + barra de progreso + desplegable */}
      <div className="space-y-2.5 p-3.5 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium text-muted-foreground">
              Paso {activeStep.numero} de {steps.length}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {activeStep.titulo}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
          >
            Pasos
            <ChevronDown
              className={cn('size-3.5 transition-transform', mobileMenuOpen && 'rotate-180')}
            />
          </Button>
        </div>

        <Progress value={progressPct} className="h-1.5" />

        {mobileMenuOpen && (
          <ol className="space-y-1 border-t pt-2.5">
            {steps.map((step) => (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={!step.enabled}
                  aria-current={step.active ? 'step' : undefined}
                  title={step.disabledReason}
                  onClick={() => {
                    if (!step.enabled) return
                    onSelectStep(step.id)
                    setMobileMenuOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                    step.active
                      ? 'bg-muted font-semibold text-foreground'
                      : step.enabled
                        ? 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        : 'cursor-not-allowed text-muted-foreground/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold',
                      step.active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : step.completed
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {step.completed ? <Check className="size-3" /> : step.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{step.titulo}</p>
                    <p className="truncate text-[11px] font-normal text-muted-foreground">
                      {step.disabledReason ?? step.descripcionCorta}
                    </p>
                  </div>
                  {!step.enabled && <Lock className="size-3.5 shrink-0 opacity-60" />}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Vista tablet/escritorio (>= md): 4 columnas limpias con divisores */}
      <ol className="hidden grid-cols-4 divide-x divide-border md:grid">
        {steps.map((step, idx) => (
          <li key={step.id} className="min-w-0">
            <button
              id={`proy-step-btn-${step.id}`}
              type="button"
              disabled={!step.enabled}
              aria-current={step.active ? 'step' : undefined}
              title={step.disabledReason ?? step.descripcionCorta}
              onClick={() => {
                if (step.enabled) onSelectStep(step.id)
              }}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'relative flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                step.active
                  ? 'bg-muted/45 text-foreground'
                  : step.enabled
                    ? 'text-muted-foreground hover:bg-muted/25 hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/45',
              )}
            >
              {step.active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                />
              )}
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold',
                  step.active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : step.completed
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-border bg-background text-muted-foreground',
                )}
              >
                {step.completed ? <Check className="size-3" /> : step.numero}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'truncate text-xs font-semibold',
                      step.active ? 'text-foreground' : 'text-inherit',
                    )}
                  >
                    {step.titulo}
                  </span>
                  {!step.enabled && <Lock className="size-3 shrink-0 opacity-60" />}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {step.descripcionCorta}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
