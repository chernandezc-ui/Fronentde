import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyApiError } from '@/shared/lib/format'
import {
  cancelEtlRun,
  fetchActiveRuns,
  fetchEtlSummary,
  fetchFactsCatalog,
  fetchRecentFailures,
  fetchRunDetail,
  fetchRunHistory,
  fetchRunSteps,
  fetchTablePreview,
  startEtlRun,
} from './etlApi'
import { isRunActiveEstado, type PeticionIniciarCorrida } from './types'

export const etlQueryKeys = {
  all: ['etl'] as const,
  facts: () => [...etlQueryKeys.all, 'facts'] as const,
  summary: () => [...etlQueryKeys.all, 'summary'] as const,
  failures: (horas: number) => [...etlQueryKeys.all, 'failures', horas] as const,
  activeRuns: (limite: number) => [...etlQueryKeys.all, 'active-runs', limite] as const,
  history: (limite: number) => [...etlQueryKeys.all, 'history', limite] as const,
  detail: (idCorrida: string) => [...etlQueryKeys.all, 'detail', idCorrida] as const,
  steps: (idCorrida: string) => [...etlQueryKeys.all, 'steps', idCorrida] as const,
  preview: (tabla: string) => [...etlQueryKeys.all, 'preview', tabla] as const,
}

export function useFactsCatalog() {
  return useQuery({
    queryKey: etlQueryKeys.facts(),
    queryFn: fetchFactsCatalog,
    staleTime: 5 * 60_000,
  })
}

export function useEtlSummary() {
  return useQuery({
    queryKey: etlQueryKeys.summary(),
    queryFn: fetchEtlSummary,
    refetchInterval: 5_000,
  })
}

export function useRecentFailures(horas = 24) {
  return useQuery({
    queryKey: etlQueryKeys.failures(horas),
    queryFn: () => fetchRecentFailures(horas),
    refetchInterval: 30_000,
  })
}

export function useActiveRuns(limite = 50) {
  return useQuery({
    queryKey: etlQueryKeys.activeRuns(limite),
    queryFn: () => fetchActiveRuns(limite),
    refetchInterval: 5_000,
  })
}

export function useRunHistory(limite = 50) {
  return useQuery({
    queryKey: etlQueryKeys.history(limite),
    queryFn: () => fetchRunHistory(limite),
    refetchInterval: 15_000,
  })
}

export function useRunDetail(idCorrida: string | null) {
  return useQuery({
    queryKey: etlQueryKeys.detail(idCorrida ?? ''),
    queryFn: () => fetchRunDetail(idCorrida!),
    enabled: Boolean(idCorrida),
    refetchInterval: (query) => {
      const estado = query.state.data?.estado
      return isRunActiveEstado(estado) ? 4_000 : false
    },
  })
}

export function useRunSteps(idCorrida: string | null, isActive = false) {
  return useQuery({
    queryKey: etlQueryKeys.steps(idCorrida ?? ''),
    queryFn: () => fetchRunSteps(idCorrida!),
    enabled: Boolean(idCorrida),
    refetchInterval: isActive ? 4_000 : false,
  })
}

export function useTablePreview(tabla: string | null) {
  return useQuery({
    queryKey: etlQueryKeys.preview(tabla ?? ''),
    queryFn: () => fetchTablePreview(tabla!),
    enabled: Boolean(tabla),
    staleTime: 30_000,
  })
}

export function useStartRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PeticionIniciarCorrida) => startEtlRun(payload),
    onSuccess: (data) => {
      toast.success('Corrida ETL encolada', {
        description: `ID: ${data.id_corrida.slice(0, 8)} · Estado: ${data.estado}`,
      })
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.summary() })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'active-runs'] })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'history'] })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo iniciar la corrida ETL')
    },
  })
}

export function useCancelRunMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (idCorrida: string) => cancelEtlRun(idCorrida),
    onSuccess: (res, idCorrida) => {
      if (res.cancelado) {
        toast.success('Cancelación solicitada', { description: res.mensaje })
      } else {
        toast.info('Sin cambios', { description: res.mensaje })
      }
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.summary() })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'active-runs'] })
      void queryClient.invalidateQueries({ queryKey: [...etlQueryKeys.all, 'history'] })
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.detail(idCorrida) })
      void queryClient.invalidateQueries({ queryKey: etlQueryKeys.steps(idCorrida) })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo cancelar la corrida ETL')
    },
  })
}
