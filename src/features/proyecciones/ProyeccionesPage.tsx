import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { computeCoberturaCenso } from './proyeccionesUtils'
import { isCoberturaDisponible } from './proyeccionesWorkflow'
import { useProyeccionFlow } from './useProyeccionFlow'
import { ConfirmExecuteDialog } from './components/ConfirmExecuteDialog'
import { MatrizBiologicaSheet } from './components/MatrizBiologicaSheet'
import { ProyeccionContextStrip } from './components/ProyeccionContextStrip'
import { ProyeccionStepper } from './components/ProyeccionStepper'
import { StepCorteCobertura } from './components/StepCorteCobertura'
import { StepInspeccionComparacion } from './components/StepInspeccionComparacion'
import { StepPublicarVersion } from './components/StepPublicarVersion'
import { StepSupuestosSimulacion } from './components/StepSupuestosSimulacion'

export function ProyeccionesPage() {
  const reduceMotion = useReducedMotion()
  const flow = useProyeccionFlow()

  const activeKpis = flow.activeRun?.result.kpis
  const coberturaFallback =
    activeKpis && isCoberturaDisponible(activeKpis)
      ? computeCoberturaCenso(activeKpis)
      : null

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Anuncio accesible de cambio de paso */}
      <div className="sr-only" aria-live="polite">
        Paso actual: {flow.stepStates.find((s) => s.active)?.titulo}
      </div>

      {/* Cabecera minimalista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Proyecciones Six-Week</h1>
            {!flow.canExecute && <StatusBadge label="Solo lectura" tone="readonly" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Estima la cosecha de las próximas 6 semanas, revisa cobertura y publica versiones oficiales tras validar el resultado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => flow.setMatrizSheetOpen(true)}
          >
            <SlidersHorizontal className="size-3.5" />
            Matriz biológica
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={flow.handleRefreshAll}
            disabled={flow.isRefreshingAny}
          >
            <RefreshCw className={cn('size-3.5', flow.isRefreshingAny && 'animate-spin')} />
            Actualizar datos
          </Button>
        </div>
      </div>

      {/* Errores de red/API */}
      {flow.fechasQuery.isError && (
        <ApiErrorBanner
          error={flow.fechasQuery.error}
          title="No se pudieron cargar las fechas de evaluación disponibles"
          onRetry={() => void flow.fechasQuery.refetch()}
        />
      )}

      {flow.combinacionesQuery.isError && (
        <ApiErrorBanner
          error={flow.combinacionesQuery.error}
          title="No se pudieron cargar las combinaciones del corte seleccionado"
          onRetry={() => void flow.combinacionesQuery.refetch()}
        />
      )}

      {/* Stepper de 4 etapas del flujo definido */}
      <ProyeccionStepper
        steps={flow.stepStates}
        onSelectStep={(step) => flow.setStep(step)}
      />

      {/* Franja persistente de contexto en pasos 2, 3 y 4 */}
      {flow.activeStep !== 'corte' && (
        <ProyeccionContextStrip
          effectiveFecha={flow.effectiveFecha}
          filters={flow.filters}
          integridad={flow.integridadQuery.data}
          margenPesimista={
            flow.parsedMargenes.success ? flow.parsedMargenes.data.margen_pesimista : null
          }
          margenOptimista={
            flow.parsedMargenes.success ? flow.parsedMargenes.data.margen_optimista : null
          }
          lifecycle={flow.lifecycle}
          isStale={flow.isStale}
          canExecute={flow.canExecute}
          isRunning={flow.isRunning}
          onNavigateStep={(step) => flow.setStep(step)}
          onRecalculate={() => flow.runProjection('simular')}
        />
      )}

      {/* Área de trabajo enfocada: SOLO el paso activo */}
      {flow.activeStep === 'corte' && (
        <StepCorteCobertura
          fechas={flow.fechas}
          isLoadingFechas={flow.fechasQuery.isLoading}
          effectiveFecha={flow.effectiveFecha}
          filters={flow.filters}
          opciones={flow.opciones}
          isLoadingCombinaciones={flow.combinacionesQuery.isLoading}
          combinacionesCount={flow.combinaciones.length}
          integridad={flow.integridadQuery.data}
          isLoadingIntegridad={flow.integridadQuery.isLoading}
          isErrorIntegridad={flow.integridadQuery.isError}
          onFechaChange={flow.handleFechaChange}
          onFundoChange={flow.handleFundoChange}
          onModuloChange={flow.handleModuloChange}
          onVariedadChange={flow.handleVariedadChange}
          onCondicionChange={flow.handleCondicionChange}
          onResetFilters={flow.handleResetFilters}
          onContinue={() => flow.setStep('supuestos')}
        />
      )}

      {flow.activeStep === 'supuestos' && (
        <StepSupuestosSimulacion
          margenPesimistaStr={flow.margenPesimistaStr}
          margenOptimistaStr={flow.margenOptimistaStr}
          margenError={flow.margenError}
          onMargenPesimistaChange={flow.setMargenPesimistaStr}
          onMargenOptimistaChange={flow.setMargenOptimistaStr}
          onApplyPreset={flow.handleApplyPreset}
          constantesActivas={flow.constantesActivas}
          origenMatriz={flow.origenMatriz}
          isLoadingMatriz={flow.matrizQuery.isLoading}
          canExecute={flow.canExecute}
          canRunNow={flow.canRunNow}
          isRunning={flow.isRunning && flow.runningMode === 'simular'}
          simularEndpointPending={flow.simularEndpointPending}
          onBack={() => flow.setStep('corte')}
          onOpenMatrizSheet={() => flow.setMatrizSheetOpen(true)}
          onSimulate={() => flow.runProjection('simular')}
          onFallbackPublish={() => flow.setStep('publicar')}
        />
      )}

      {flow.activeStep === 'inspeccion' && flow.activeRun && (
        <StepInspeccionComparacion
          activeRun={flow.activeRun}
          snapshots={flow.snapshots}
          compareBaselineId={flow.compareBaselineId}
          activeTab={flow.inspeccionTab}
          isStale={flow.isStale}
          canExecute={flow.canExecute}
          onSelectRunId={flow.setActiveRunId}
          onChangeBaselineId={flow.setCompareBaselineId}
          onTabChange={flow.setInspeccionTab}
          onBackToSupuestos={() => flow.setStep('supuestos')}
          onOpenMatrizSheet={() => flow.setMatrizSheetOpen(true)}
          onContinueToPublish={() => flow.setStep('publicar')}
          onRecalculate={() => flow.runProjection('simular')}
        />
      )}

      {flow.activeStep === 'publicar' && flow.parsedMargenes.success && (
        <StepPublicarVersion
          activeRun={flow.activeRun}
          effectiveFecha={flow.effectiveFecha}
          filters={flow.filters}
          margenPesimista={flow.parsedMargenes.data.margen_pesimista}
          margenOptimista={flow.parsedMargenes.data.margen_optimista}
          origenMatriz={flow.origenMatriz}
          isStale={flow.isStale}
          isPending={flow.isRunning && flow.runningMode === 'ejecutar'}
          canExecute={flow.canExecute}
          onBack={() => flow.setStep(flow.activeRun ? 'inspeccion' : 'supuestos')}
          onRecalculate={() => flow.runProjection('simular')}
          onRequestPublish={() => flow.setConfirmOpen(true)}
          onStartNew={flow.handleStartNew}
        />
      )}

      {/* Sheet lateral de Matriz Biológica y Constantes (bajo demanda) */}
      <MatrizBiologicaSheet
        open={flow.matrizSheetOpen}
        onOpenChange={flow.setMatrizSheetOpen}
        matrizActiva={flow.matrizActiva}
        constantesActivas={flow.constantesActivas}
        origenMatriz={flow.origenMatriz}
      />

      {/* Diálogo de confirmación explícita para publicación oficial */}
      {flow.canExecute && flow.parsedMargenes.success && (
        <ConfirmExecuteDialog
          open={flow.confirmOpen}
          onOpenChange={flow.setConfirmOpen}
          idTiempo={flow.effectiveFecha}
          fundo={flow.filters.fundo}
          modulo={flow.filters.modulo}
          variedad={flow.filters.variedad}
          condicion={flow.filters.condicion}
          margenPesimista={flow.parsedMargenes.data.margen_pesimista}
          margenOptimista={flow.parsedMargenes.data.margen_optimista}
          origenMatriz={flow.origenMatriz}
          estimadasFallback={coberturaFallback?.estimadasFallback ?? 0}
          unidadesTotales={coberturaFallback?.totales ?? 0}
          isPending={flow.isRunning && flow.runningMode === 'ejecutar'}
          onConfirm={() => flow.runProjection('ejecutar')}
        />
      )}
    </motion.div>
  )
}
