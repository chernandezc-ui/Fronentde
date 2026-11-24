import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyApiError } from '@/shared/lib/format'
import {
  downloadTableCsv,
  fetchBitacora,
  fetchBitacoraResumen,
  fetchEtlCatalogFacts,
  fetchLogDetail,
  validateCsvFileApi,
} from './auditoriaApi'
import { buildBitacoraQueryString } from './auditoriaUtils'
import type { BitacoraQueryParams, VentanaResumenDias } from './types'

export const auditoriaQueryKeys = {
  all: ['auditoria'] as const,
  bitacoraAll: () => ['auditoria', 'bitacora'] as const,
  bitacora: (params: BitacoraQueryParams) =>
    ['auditoria', 'bitacora', buildBitacoraQueryString(params)] as const,
  resumenAll: () => ['auditoria', 'resumen'] as const,
  resumen: (ventanaDias: VentanaResumenDias) => ['auditoria', 'resumen', ventanaDias] as const,
  detail: (idLog: number | null) => ['auditoria', 'detail', idLog] as const,
  etlFacts: () => ['etl', 'facts'] as const,
}

export function useBitacoraQuery(params: BitacoraQueryParams, enabled = true) {
  return useQuery({
    queryKey: auditoriaQueryKeys.bitacora(params),
    queryFn: () => fetchBitacora(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    enabled,
  })
}

export function useBitacoraResumenQuery(ventanaDias: VentanaResumenDias, enabled = true) {
  return useQuery({
    queryKey: auditoriaQueryKeys.resumen(ventanaDias),
    queryFn: () => fetchBitacoraResumen(ventanaDias),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    enabled,
  })
}

export function useLogDetailQuery(idLog: number | null) {
  return useQuery({
    queryKey: auditoriaQueryKeys.detail(idLog),
    queryFn: () => fetchLogDetail(idLog!),
    enabled: idLog !== null,
    staleTime: 30_000,
  })
}

export function useEtlCatalogFactsQuery(enabled = true) {
  return useQuery({
    queryKey: auditoriaQueryKeys.etlFacts(),
    queryFn: fetchEtlCatalogFacts,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export interface ValidateCsvMutationInput {
  file: File
  tablaDestino: string
}

export function useValidateCsvMutation() {
  return useMutation({
    mutationFn: ({ file, tablaDestino }: ValidateCsvMutationInput) =>
      validateCsvFileApi(file, tablaDestino),
    onError: (err) => {
      notifyApiError(err, 'No se pudo validar el archivo CSV')
    },
  })
}

export function useExportTableCsvMutation() {
  return useMutation({
    mutationFn: (tabla: string) => downloadTableCsv(tabla),
    onSuccess: (res) => {
      toast.success('CSV exportado correctamente', {
        description: `${res.filename}`,
      })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo exportar la tabla en CSV')
    },
  })
}
