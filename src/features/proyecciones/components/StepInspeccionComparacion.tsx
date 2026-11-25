import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FlaskConical,
  GitCompareArrows,
  SlidersHorizontal,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import { formatIdTiempo } from '../proyeccionesUtils'
import type { EscenarioSnapshot, InspeccionSubTab } from '../types'
import { ProyeccionDetailTable } from './ProyeccionDetailTable'
import { ProyeccionKpiGrid } from './ProyeccionKpiGrid'
import { ProyeccionWeeklyChart } from './ProyeccionWeeklyChart'
import { ScenarioCompareView } from './ScenarioCompareView'

interface StepInspeccionComparacionProps {
  activeRun: EscenarioSnapshot
  snapshots: EscenarioSnapshot[]
  compareBaselineId: string | null
  activeTab: InspeccionSubTab
  isStale: boolean
  canExecute: boolean
  onSelectRunId: (id: string) => void
  onChangeBaselineId: (id: string) => void
  onTabChange: (tab: InspeccionSubTab) => void
  onBackToSupuestos: () => void
  onOpenMatrizSheet: () => void
  onContinueToPublish: () => void
  onRecalculate: () => void
}

export function StepInspeccionComparacion({
  activeRun,
  snapshots,
  compareBaselineId,
  activeTab,
  isStale,
  canExecute,
  onSelectRunId,
  onChangeBaselineId,
  onTabChange,
  onBackToSupuestos,
  onOpenMatrizSheet,
  onContinueToPublish,
  onRecalculate,
}: StepInspeccionComparacionProps) {
  const isPublished = activeRun.meta.modo === 'ejecutar' && !isStale
  const hasRows = activeRun.result.df_semanal.length > 0

  return (
    <section
      aria-label="Paso 3: Inspección de resultados y comparación"
      className="space-y-4"
    >
      {/* Banner inequívoco Borrador vs Publicada */}
      <div
        className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${
          isPublished
            ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
            : isStale
              ? 'border-amber-500/35 bg-amber-500/[0.07]'
              : 'border-dashed border-sky-500/35 bg-sky-500/[0.06]'
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={
                isPublished
                  ? 'Versión publicada'
                  : isStale
                    ? 'Resultado desactualizado'
                    : 'Borrador · Vista previa sin guardar'
              }
              tone={isPublished ? 'ok' : isStale ? 'warning' : 'running'}
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              {formatIdTiempo(activeRun.meta.id_tiempo, true)} ·{' '}
              {formatDateTime(activeRun.meta.ejecutado_en)}
            </span>
          </div>
          <p className="text-muted-foreground">
            {isPublished
              ? 'Esta proyección ya está guardada como versión oficial vigente para los reportes.'
              : isStale
                ? 'Cambiaste filtros o bandas después de este cálculo. Recalcula para actualizar la vista previa.'
                : 'Estos números son solo una simulación en tu pantalla y no alteran los reportes oficiales hasta que publiques.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {snapshots.length > 1 && (
            <Select
              value={activeRun.id}
              onValueChange={(v) => {
                if (v) onSelectRunId(v)
              }}
            >
              <SelectTrigger
                aria-label="Seleccionar escenario simulado"
                size="sm"
                className="min-w-[200px] bg-background text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {snapshots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="button" variant="outline" size="xs" onClick={onOpenMatrizSheet}>
            Supuestos usados
          </Button>
        </div>
      </div>

      {!hasRows ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center">
          <FlaskConical className="mb-2 size-7 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            No hay lotes con datos para proyectar en este corte
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            El cálculo no encontró unidades con conteo fenológico para{' '}
            {formatIdTiempo(activeRun.meta.id_tiempo)}. Vuelve al Paso 1 para elegir otra fecha o ampliar los filtros.
          </p>
        </div>
      ) : (
        <>
          {/* Franja unificada de 4 KPIs */}
          <ProyeccionKpiGrid
            kpis={activeRun.result.kpis}
            semanas={activeRun.result.df_semanal}
            margenPesimista={activeRun.meta.margen_pesimista}
            margenOptimista={activeRun.meta.margen_optimista}
          />

          {/* 3 Tabs enfocados: Curva | Detalle | Comparar */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              if (val === 'curva' || val === 'detalle' || val === 'comparar') {
                onTabChange(val)
              }
            }}
            className="space-y-4"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
              <TabsTrigger value="curva" className="gap-1.5 px-3">
                <BarChart3 className="size-3.5" />
                Curva semanal (W1–W6)
              </TabsTrigger>
              <TabsTrigger value="detalle" className="gap-1.5 px-3">
                <Table2 className="size-3.5" />
                Detalle ({activeRun.result.df_detalle.length})
              </TabsTrigger>
              <TabsTrigger value="comparar" className="gap-1.5 px-3">
                <GitCompareArrows className="size-3.5" />
                Comparar escenarios
                {snapshots.length > 1 && (
                  <span className="ml-0.5 rounded bg-muted px-1.5 font-mono text-[10px]">
                    {snapshots.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curva">
              <ProyeccionWeeklyChart semanas={activeRun.result.df_semanal} />
            </TabsContent>

            <TabsContent value="detalle">
              <ProyeccionDetailTable
                detalle={activeRun.result.df_detalle}
                idTiempo={activeRun.meta.id_tiempo}
              />
            </TabsContent>

            <TabsContent value="comparar">
              <ScenarioCompareView
                snapshots={snapshots}
                activeRun={activeRun}
                compareBaselineId={compareBaselineId}
                onChangeBaselineId={onChangeBaselineId}
                onSimulateVariant={onBackToSupuestos}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Barra de navegación inferior del Paso 3 */}
      <div className="flex flex-col-reverse gap-2 rounded-xl border border-border bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBackToSupuestos}>
            <ArrowLeft className="size-3.5" />
            Ajustar supuestos
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onBackToSupuestos}>
            <SlidersHorizontal className="size-3.5" />
            Simular variante
          </Button>
        </div>

        {canExecute && hasRows && (
          isStale ? (
            <Button type="button" size="sm" onClick={onRecalculate}>
              Recalcular con cambios actuales
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onContinueToPublish}>
              Continuar a publicación
              <ArrowRight className="size-3.5" />
            </Button>
          )
        )}
      </div>
    </section>
  )
}
