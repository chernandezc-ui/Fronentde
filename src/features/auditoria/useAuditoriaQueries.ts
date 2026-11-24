import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  API_ENDPOINTS,
  isEndpointNotImplementedError,
  notifyStage2MutationError,
} from '@/shared/api/endpoints'
import { notifyApiError } from '@/shared/lib/format'
import {
  deleteExcelIngestaFile,
  downloadTableCsv,
  fetchAuditoriaAccesos,
  fetchBitacora,
  fetchBitacoraResumen,
  fetchEtlCatalogFacts,
  fetchExcelIngestaArchivos,
  fetchLogDetail,
  uploadExcelIngestaFile,
  validateCsvFileApi,
} from './auditoriaApi'
import { buildAccesosQueryString, buildBitacoraQueryString } from './auditoriaUtils'
import type {
  AccesosQueryParams,
  BitacoraQueryParams,
  EstadoCarpetaExcel,
  VentanaResumenDias,
} from './types'

export const auditoriaQueryKeys = {
  all: ['auditoria'] as const,
  bitacoraAll: () => ['auditoria', 'bitacora'] as const,
  bitacora: (params: BitacoraQueryParams) =>
    ['auditoria', 'bitacora', buildBitacoraQueryString(params)] as const,
  resumenAll: () => ['auditoria', 'resumen'] as const,
  resumen: (ventanaDias: VentanaResumenDias) => ['auditoria', 'resumen', ventanaDias] as const,
  detail: (idLog: number | null) => ['auditoria', 'detail', idLog] as const,
  etlFacts: () => ['etl', 'facts'] as const,
  excelFilesAll: () => ['auditoria', 'ingesta', 'excel'] as const,
  excelFiles: (estado: EstadoCarpetaExcel) =>
    ['auditoria', 'ingesta', 'excel', estado] as const,
  accesosAll: () => ['auditoria', 'accesos'] as const,
  accesos: (params: AccesosQueryParams) =>
    ['auditoria', 'accesos', buildAccesosQueryString(params)] as const,
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

export function useExcelIngestaArchivosQuery(estado: EstadoCarpetaExcel, enabled = true) {
  return useQuery({
    queryKey: auditoriaQueryKeys.excelFiles(estado),
    queryFn: () => fetchExcelIngestaArchivos(estado),
    enabled,
    staleTime: 10_000,
    retry: (failureCount, err) => !isEndpointNotImplementedError(err) && failureCount < 1,
  })
}

export function useUploadExcelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadExcelIngestaFile,
    onSuccess: (res) => {
      toast.success('Archivo Excel subido correctamente', {
        description: res.mensaje || `${res.nombre} → ${res.carpeta}`,
      })
      void queryClient.invalidateQueries({ queryKey: auditoriaQueryKeys.excelFilesAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.ingesta.excelSubir,
        'No se pudo subir el archivo Excel',
      )
    },
  })
}

export function useDeleteExcelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ carpeta, nombre }: { carpeta: string; nombre: string }) =>
      deleteExcelIngestaFile(carpeta, nombre),
    onSuccess: (res) => {
      toast.success('Archivo Excel eliminado', {
        description: res.mensaje,
      })
      void queryClient.invalidateQueries({ queryKey: auditoriaQueryKeys.excelFilesAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'DELETE',
        API_ENDPOINTS.ingesta.excelEliminar,
        'No se pudo eliminar el archivo Excel',
      )
    },
  })
}

export function useAuditoriaAccesosQuery(
  params: AccesosQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: auditoriaQueryKeys.accesos(params),
    queryFn: () => fetchAuditoriaAccesos(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    retry: (failureCount, err) =>
      !isEndpointNotImplementedError(err) && failureCount < 1,
    enabled,
  })
}
