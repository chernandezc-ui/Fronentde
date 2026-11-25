import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import {
  buildDetalleProyeccionCsv,
  computeCoberturaCenso,
  formatIdTiempo,
  formatKg,
  formatTons,
} from '../proyeccionesUtils'
import { formatMarginPctDelta, isCoberturaDisponible } from '../proyeccionesWorkflow'
import type { EscenarioSnapshot, FiltrosProyeccionUrl, OrigenMatrizProyeccion } from '../types'

interface StepPublicarVersionProps {
  activeRun: EscenarioSnapshot | null
  effectiveFecha: number | null
  filters: FiltrosProyeccionUrl
  margenPesimista: number
  margenOptimista: number
  origenMatriz: OrigenMatrizProyeccion
  isStale: boolean
  isPending: boolean
  canExecute: boolean
  onBack: () => void
  onRecalculate: () => void
  onRequestPublish: () => void
  onStartNew: () => void
}

export function StepPublicarVersion({
  activeRun,
  effectiveFecha,
  filters,
  margenPesimista,
  margenOptimista,
  origenMatriz,
  isStale,
  isPending,
  canExecute,
  onBack,
  onRecalculate,
  onRequestPublish,
  onStartNew,
}: StepPublicarVersionProps) {
  const isPublished = Boolean(activeRun && activeRun.meta.modo === 'ejecutar' && !isStale)
  const kpis = activeRun?.result.kpis
  const coberturaDisponible = kpis ? isCoberturaDisponible(kpis) : false
  const cobertura = kpis ? computeCoberturaCenso(kpis) : null

  const alcanceLabel =
    [
      filters.fundo || 'Todos los fundos',
      filters.modulo ? `Módulo ${filters.modulo}` : null,
      filters.variedad || null,
      filters.condicion || null,
    ]
      .filter(Boolean)
      .join(' · ')

  function handleDownloadPublishedCsv() {
    if (!activeRun || activeRun.result.df_detalle.length === 0) return
    const csv = buildDetalleProyeccionCsv(activeRun.result.df_detalle)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proyeccion_oficial_${activeRun.meta.id_tiempo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('CSV de proyección exportado')
  }

  return (
    <section
      aria-label="Paso 4: Publicar versión oficial"
      className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border"
    >
      {/* Cabecera */}
      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {isPublished
                ? 'Versión oficial publicada correctamente'
                : 'Revisión final antes de publicar'}
            </h2>
            <StatusBadge
              label={isPublished ? 'Publicada' : isStale ? 'Desactualizada' : 'Lista para publicar'}
              tone={isPublished ? 'ok' : isStale ? 'warning' : 'running'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublished
              ? `Guardada el ${formatDateTime(activeRun?.meta.ejecutado_en)} y disponible para los reportes operativos.`
              : 'Al confirmar, esta proyección quedará registrada como la versión oficial vigente para la fecha y alcance seleccionados.'}
          </p>
        </div>
      </div>

      {/* Comprobante o ficha de revisión */}
      <div className="space-y-4 px-5 py-4">
        {isPublished && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-3 text-xs text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold">Publicación completada sin errores</p>
              <p className="mt-0.5 opacity-90">
                Se registraron {formatNumber(activeRun?.result.df_detalle.length)} filas para el corte{' '}
                {formatIdTiempo(activeRun?.meta.id_tiempo, true)}.
              </p>
            </div>
          </div>
        )}

        {coberturaDisponible && cobertura?.tieneFallback && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Atención de cobertura:</strong> {cobertura.estimadasFallback} de{' '}
              {cobertura.totales} unidades no tienen censo real y usan estimación de respaldo (1,500 plantas · 80% productivas).
            </span>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-xs sm:grid-cols-2">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Fecha de evaluación</dt>
            <dd className="min-w-0 truncate font-mono font-medium text-foreground">
              {formatIdTiempo(effectiveFecha, true)}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Alcance agrícola</dt>
            <dd className="min-w-0 truncate font-medium text-foreground" title={alcanceLabel}>
              {alcanceLabel}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Volumen base (6 semanas)</dt>
            <dd className="metric-value font-mono font-semibold text-foreground">
              {kpis?.total_base !== null && kpis?.total_base !== undefined
                ? `${formatTons(kpis.total_base)} t (${formatKg(kpis.total_base, 0)} kg)`
                : 'Se calculará al publicar'}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2">
            <dt className="text-muted-foreground">Bandas aplicadas</dt>
            <dd className="metric-value font-mono text-foreground">
              {formatMarginPctDelta(margenPesimista)} / {formatMarginPctDelta(margenOptimista)}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 border-b border-border/60 pb-2 sm:border-b-0 sm:pb-0">
            <dt className="text-muted-foreground">Supuestos biológicos</dt>
            <dd className="font-medium text-foreground">
              {origenMatriz === 'backend' ? 'Matriz oficial vigente' : 'Matriz estándar'}
            </dd>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <dt className="text-muted-foreground">Cobertura de censo</dt>
            <dd className="metric-value font-mono text-foreground">
              {coberturaDisponible && cobertura
                ? `${cobertura.porcentaje}% (${cobertura.cubiertas}/${cobertura.totales} u.)`
                : 'No disponible'}
            </dd>
          </div>
        </dl>

        {/* Detalle técnico colapsable para MDM / TI */}
        <details className="rounded-lg border border-border/70 bg-muted/15 px-3.5 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Detalle técnico de publicación (MDM / TI)
          </summary>
          <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
            <p>Endpoint: POST /api/v1/proyecciones/ejecutar (transacción única atómica)</p>
            <p>Destino SQL: Silver.Fact_Proyecciones · ID_Escenario = 4 · ID_Tiempo = {effectiveFecha ?? '—'}</p>
            <p>Factores exactos: pesimista={margenPesimista} · optimista={margenOptimista}</p>
          </div>
        </details>
      </div>

      {/* Pie de paso */}
      <div className="flex flex-col-reverse gap-2 bg-muted/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={isPending}>
            <ArrowLeft className="size-3.5" />
            Volver a inspección
          </Button>
          {isPublished && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPublishedCsv}
                disabled={!activeRun || activeRun.result.df_detalle.length === 0}
              >
                <Download className="size-3.5" />
                Exportar CSV
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onStartNew}>
                <RotateCcw className="size-3.5" />
                Nueva proyección
              </Button>
            </>
          )}
        </div>

        {!isPublished && canExecute && (
          isStale ? (
            <Button type="button" size="sm" onClick={onRecalculate} disabled={isPending}>
              Recalcular simulación primero
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onRequestPublish} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Publicando…
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Publicar versión oficial
                </>
              )}
            </Button>
          )
        )}
      </div>
    </section>
  )
}
