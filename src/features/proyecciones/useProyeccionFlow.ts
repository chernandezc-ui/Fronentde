import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { isEndpointNotImplementedError } from '@/shared/api/endpoints'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import {
  isMatrizBackendVacia,
  normalizarMatrizCompleta,
  serializeMatrizPayload,
} from '@/features/configuracion/matrizUtils'
import { DEFAULT_BIOLOGIA_CONSTANTES } from '@/features/configuracion/schemas'
import {
  useBiologiaConstantesQuery,
  useMatrizBiologica,
} from '@/features/configuracion/useConfiguracionQueries'
import {
  DEFAULT_MARGEN_OPTIMISTA,
  DEFAULT_MARGEN_PESIMISTA,
  buildOpcionesCascada,
  margenesEscenarioSchema,
  parseModuloParam,
  parseProyeccionesSearchParams,
  serializeProyeccionesSearchParams,
} from './proyeccionesUtils'
import {
  applyWorkflowParams,
  buildSnapshotLabel,
  computeInputFingerprint,
  computeStepStates,
  deriveDisplayLifecycle,
  isRunStale,
  parseInspeccionSubTab,
  parseProyeccionStepParam,
} from './proyeccionesWorkflow'
import {
  proyeccionesQueryKeys,
  useCombinacionesProyeccion,
  useEjecutarProyeccionMutation,
  useFechasProyeccion,
  useIntegridadProyeccion,
} from './useProyeccionesQueries'
import type {
  CombinacionProyeccion,
  EscenarioSnapshot,
  FiltrosProyeccionUrl,
  InspeccionSubTab,
  OrigenMatrizProyeccion,
  PeticionEjecutarProyeccion,
  ProyeccionStepId,
} from './types'

const EMPTY_FECHAS: number[] = []
const EMPTY_COMBINACIONES: CombinacionProyeccion[] = []
const MAX_SNAPSHOTS = 5

export function useProyeccionFlow() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const usuario = useAuthStore((s) => s.usuario)
  const canExecute = rolCumpleNivel(usuario?.rol, 'analista_mdm')

  const filters = useMemo<FiltrosProyeccionUrl>(
    () => parseProyeccionesSearchParams(searchParams),
    [searchParams],
  )
  const requestedStep = useMemo<ProyeccionStepId>(
    () => parseProyeccionStepParam(searchParams),
    [searchParams],
  )
  const inspeccionTab = useMemo<InspeccionSubTab>(
    () => parseInspeccionSubTab(searchParams),
    [searchParams],
  )

  const [margenPesimistaStr, setMargenPesimistaStr] = useState(String(DEFAULT_MARGEN_PESIMISTA))
  const [margenOptimistaStr, setMargenOptimistaStr] = useState(String(DEFAULT_MARGEN_OPTIMISTA))
  const [matrizSheetOpen, setMatrizSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [runningMode, setRunningMode] = useState<'ejecutar' | 'simular' | null>(null)
  const [simularEndpointPending, setSimularEndpointPending] = useState(false)

  const [snapshots, setSnapshots] = useState<EscenarioSnapshot[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [compareBaselineId, setCompareBaselineId] = useState<string | null>(null)

  const fechasQuery = useFechasProyeccion()
  const fechas = fechasQuery.data ?? EMPTY_FECHAS

  const effectiveFecha = useMemo<number | null>(() => {
    if (filters.fecha !== null) return filters.fecha
    return fechas[0] ?? null
  }, [fechas, filters.fecha])

  const combinacionesQuery = useCombinacionesProyeccion(effectiveFecha)
  const combinaciones = combinacionesQuery.data ?? EMPTY_COMBINACIONES

  const integridadQuery = useIntegridadProyeccion(effectiveFecha, {
    modulo: filters.modulo,
    variedad: filters.variedad,
    condicion: filters.condicion,
  })

  const matrizQuery = useMatrizBiologica(true)
  const constantesQuery = useBiologiaConstantesQuery(true)

  const matrizActiva = useMemo(
    () => normalizarMatrizCompleta(matrizQuery.data),
    [matrizQuery.data],
  )
  const constantesActivas = constantesQuery.data ?? DEFAULT_BIOLOGIA_CONSTANTES
  const origenMatriz: OrigenMatrizProyeccion =
    matrizQuery.isSuccess && !isMatrizBackendVacia(matrizQuery.data) ? 'backend' : 'defaults'

  const opciones = useMemo(
    () => buildOpcionesCascada(combinaciones, filters),
    [combinaciones, filters],
  )

  const parsedMargenes = useMemo(() => {
    const pes = Number(margenPesimistaStr.trim().replace(',', '.'))
    const opt = Number(margenOptimistaStr.trim().replace(',', '.'))
    return margenesEscenarioSchema.safeParse({
      margen_pesimista: pes,
      margen_optimista: opt,
    })
  }, [margenOptimistaStr, margenPesimistaStr])

  const margenError = parsedMargenes.success
    ? null
    : (parsedMargenes.error.issues[0]?.message ?? 'Revisa los márgenes ingresados.')

  const activeRun = useMemo<EscenarioSnapshot | null>(() => {
    if (activeRunId) {
      const found = snapshots.find((s) => s.id === activeRunId)
      if (found) return found
    }
    return snapshots[0] ?? null
  }, [activeRunId, snapshots])

  const currentFingerprint = useMemo(
    () =>
      computeInputFingerprint({
        idTiempo: effectiveFecha,
        fundo: filters.fundo,
        modulo: filters.modulo,
        variedad: filters.variedad,
        condicion: filters.condicion,
        margenPesimista: parsedMargenes.success ? parsedMargenes.data.margen_pesimista : Number.NaN,
        margenOptimista: parsedMargenes.success ? parsedMargenes.data.margen_optimista : Number.NaN,
        origenMatriz,
        matriz: matrizActiva,
        constantes: {
          plantas_por_punto: constantesActivas.plantas_por_punto,
          decay_factor: constantesActivas.decay_factor,
          delta_productivas: constantesActivas.delta_productivas,
        },
      }),
    [constantesActivas, effectiveFecha, filters, matrizActiva, origenMatriz, parsedMargenes],
  )

  const stale = isRunStale(activeRun, currentFingerprint)
  const lifecycle = deriveDisplayLifecycle(activeRun, stale)

  // Resolver paso activo seguro (no permite quedarse en inspeccion/publicar sin simulación en memoria)
  const activeStep: ProyeccionStepId = useMemo(() => {
    if (requestedStep === 'inspeccion' && !activeRun) return 'supuestos'
    if (
      requestedStep === 'publicar' &&
      (!canExecute || (!activeRun && !simularEndpointPending))
    ) {
      return activeRun ? 'inspeccion' : 'supuestos'
    }
    if (requestedStep === 'supuestos' && effectiveFecha === null) return 'corte'
    return requestedStep
  }, [activeRun, canExecute, effectiveFecha, requestedStep, simularEndpointPending])

  const stepStates = useMemo(
    () =>
      computeStepStates({
        activeStep,
        hasFecha: effectiveFecha !== null,
        hasMargenError: Boolean(margenError),
        canExecute,
        activeRun,
        isStale: stale,
        simularEndpointPending,
      }),
    [activeRun, activeStep, canExecute, effectiveFecha, margenError, simularEndpointPending, stale],
  )

  const setStep = useCallback(
    (paso: ProyeccionStepId, vista?: InspeccionSubTab) => {
      setSearchParams(
        (prev) => applyWorkflowParams(prev, { paso, vista }),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setInspeccionTab = useCallback(
    (vista: InspeccionSubTab) => {
      setSearchParams(
        (prev) => applyWorkflowParams(prev, { vista }),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const updateFilters = useCallback(
    (patch: Partial<FiltrosProyeccionUrl>) => {
      const next: FiltrosProyeccionUrl = { ...filters, ...patch }
      const serialized = serializeProyeccionesSearchParams(next)
      if (activeStep !== 'corte') serialized.set('paso', activeStep)
      if (inspeccionTab !== 'curva') serialized.set('vista', inspeccionTab)
      setSearchParams(serialized, { replace: true })
    },
    [activeStep, filters, inspeccionTab, setSearchParams],
  )

  const handleFechaChange = useCallback(
    (fecha: number) =>
      updateFilters({ fecha, fundo: '', modulo: '', variedad: '', condicion: '' }),
    [updateFilters],
  )

  const handleFundoChange = useCallback(
    (fundo: string) => updateFilters({ fundo, modulo: '', variedad: '', condicion: '' }),
    [updateFilters],
  )

  const handleModuloChange = useCallback(
    (modulo: string) => updateFilters({ modulo, variedad: '', condicion: '' }),
    [updateFilters],
  )

  const handleVariedadChange = useCallback(
    (variedad: string) => updateFilters({ variedad, condicion: '' }),
    [updateFilters],
  )

  const handleCondicionChange = useCallback(
    (condicion: string) => updateFilters({ condicion }),
    [updateFilters],
  )

  const handleResetFilters = useCallback(
    () => updateFilters({ fundo: '', modulo: '', variedad: '', condicion: '' }),
    [updateFilters],
  )

  const handleApplyPreset = useCallback((pes: number, opt: number) => {
    setMargenPesimistaStr(String(pes))
    setMargenOptimistaStr(String(opt))
  }, [])

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: proyeccionesQueryKeys.all })
    void matrizQuery.refetch()
    void constantesQuery.refetch()
  }, [constantesQuery, matrizQuery, queryClient])

  const executeMutation = useEjecutarProyeccionMutation()

  const buildPayload = useCallback((): PeticionEjecutarProyeccion | null => {
    if (effectiveFecha === null || !parsedMargenes.success) return null
    return {
      id_tiempo: effectiveFecha,
      matriz_inputs: serializeMatrizPayload(matrizActiva),
      margen_pesimista: parsedMargenes.data.margen_pesimista,
      margen_optimista: parsedMargenes.data.margen_optimista,
      modulo: parseModuloParam(filters.modulo),
      variedad: filters.variedad.trim() || null,
      condicion: filters.condicion.trim() || null,
      fundo: filters.fundo.trim() || null,
      constantes: {
        plantas_por_punto: constantesActivas.plantas_por_punto,
        decay_factor: constantesActivas.decay_factor,
        delta_productivas: constantesActivas.delta_productivas,
      },
    }
  }, [constantesActivas, effectiveFecha, filters, matrizActiva, parsedMargenes])

  const runProjection = useCallback(
    (mode: 'simular' | 'ejecutar') => {
      const payload = buildPayload()
      if (!payload) return
      setRunningMode(mode)

      executeMutation.mutate(
        { payload, mode },
        {
          onSuccess: (result) => {
            if (mode === 'simular') setSimularEndpointPending(false)
            const newId = `${mode}-${Date.now()}`
            const nextIndex = snapshots.length + 1
            const snapshot: EscenarioSnapshot = {
              id: newId,
              label: buildSnapshotLabel(
                nextIndex,
                payload.margen_pesimista,
                payload.margen_optimista,
                mode,
              ),
              fingerprint: currentFingerprint,
              meta: {
                id_tiempo: payload.id_tiempo,
                fundo: filters.fundo,
                modulo: filters.modulo,
                variedad: filters.variedad,
                condicion: filters.condicion,
                margen_pesimista: payload.margen_pesimista,
                margen_optimista: payload.margen_optimista,
                origen_matriz: origenMatriz,
                matriz_snapshot: matrizActiva,
                ejecutado_en: new Date().toISOString(),
                modo: mode,
              },
              result,
            }

            setSnapshots((prev) => {
              const previousTop = prev[0]
              if (previousTop && previousTop.fingerprint !== snapshot.fingerprint) {
                setCompareBaselineId(previousTop.id)
              }
              const dedup = prev.filter(
                (item) =>
                  !(item.fingerprint === snapshot.fingerprint && item.meta.modo === mode),
              )
              return [snapshot, ...dedup].slice(0, MAX_SNAPSHOTS)
            })
            setActiveRunId(newId)
            setConfirmOpen(false)
            if (mode === 'simular') {
              setStep('inspeccion', 'curva')
            } else {
              setStep('publicar')
            }
          },
          onError: (err) => {
            if (mode === 'simular' && isEndpointNotImplementedError(err)) {
              setSimularEndpointPending(true)
            }
          },
          onSettled: () => {
            setRunningMode(null)
          },
        },
      )
    },
    [
      buildPayload,
      currentFingerprint,
      executeMutation,
      filters,
      matrizActiva,
      origenMatriz,
      setStep,
      snapshots.length,
    ],
  )

  const handleStartNew = useCallback(() => {
    setStep('corte')
  }, [setStep])

  const canRunNow =
    effectiveFecha !== null &&
    parsedMargenes.success &&
    integridadQuery.data?.conteo !== false

  const isRefreshingAny =
    fechasQuery.isFetching ||
    combinacionesQuery.isFetching ||
    integridadQuery.isFetching ||
    matrizQuery.isFetching ||
    constantesQuery.isFetching

  return {
    canExecute,
    filters,
    effectiveFecha,
    fechas,
    fechasQuery,
    combinaciones,
    combinacionesQuery,
    integridadQuery,
    matrizQuery,
    constantesQuery,
    matrizActiva,
    constantesActivas,
    origenMatriz,
    opciones,
    margenPesimistaStr,
    margenOptimistaStr,
    setMargenPesimistaStr,
    setMargenOptimistaStr,
    parsedMargenes,
    margenError,
    activeStep,
    inspeccionTab,
    stepStates,
    setStep,
    setInspeccionTab,
    lifecycle,
    isStale: stale,
    activeRun,
    snapshots,
    setActiveRunId,
    compareBaselineId,
    setCompareBaselineId,
    simularEndpointPending,
    matrizSheetOpen,
    setMatrizSheetOpen,
    confirmOpen,
    setConfirmOpen,
    runningMode,
    isRunning: executeMutation.isPending,
    canRunNow,
    isRefreshingAny,
    handleFechaChange,
    handleFundoChange,
    handleModuloChange,
    handleVariedadChange,
    handleCondicionChange,
    handleResetFilters,
    handleApplyPreset,
    handleRefreshAll,
    runProjection,
    handleStartNew,
  }
}
