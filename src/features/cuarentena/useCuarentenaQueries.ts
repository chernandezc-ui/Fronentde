import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS, notifyStage2MutationError } from '@/shared/api/endpoints'
import { notifyApiError } from '@/shared/lib/format'
import {
  ejecutarReinyeccionMdm,
  fetchCuarentenaList,
  fetchCuarentenaResumen,
  fetchReinyeccionCandidatos,
  rechazarCuarentenaLote,
  rechazarCuarentenaRecord,
  resolverCuarentenaLote,
  resolverCuarentenaRecord,
} from './cuarentenaApi'
import type {
  CuarentenaFiltrosUrl,
  PeticionRechazarCuarentena,
  PeticionRechazarLote,
  PeticionResolverCuarentena,
  PeticionResolverLote,
} from './types'

export const cuarentenaQueryKeys = {
  all: ['cuarentena'] as const,
  // Alineado con DashboardPage (['cuarentena', 'resumen']) para compartir e invalidar caché
  resumen: () => ['cuarentena', 'resumen'] as const,
  listAll: () => ['cuarentena', 'list'] as const,
  list: (filters: CuarentenaFiltrosUrl) =>
    [
      'cuarentena',
      'list',
      {
        pagina: filters.pagina,
        tamano: filters.tamano,
        estado: filters.estado,
        tabla: filters.tabla.trim(),
        q: (filters.q ?? '').trim(),
        columna: (filters.columna ?? '').trim(),
      },
    ] as const,
  reinyeccionAll: () => ['cuarentena', 'reinyeccion'] as const,
  candidatos: (tabla = '') => ['cuarentena', 'reinyeccion', 'candidatos', tabla.trim()] as const,
}

export function useCuarentenaResumen() {
  return useQuery({
    queryKey: cuarentenaQueryKeys.resumen(),
    queryFn: fetchCuarentenaResumen,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useCuarentenaList(filters: CuarentenaFiltrosUrl) {
  return useQuery({
    queryKey: cuarentenaQueryKeys.list(filters),
    queryFn: () =>
      fetchCuarentenaList({
        pagina: filters.pagina,
        tamano: filters.tamano,
        estado_filtro: filters.estado,
        tabla_filtro: filters.tabla,
        q: filters.q,
        columna: filters.columna,
      }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}

export function useReinyeccionCandidatos(tabla = '', enabled = true) {
  return useQuery({
    queryKey: cuarentenaQueryKeys.candidatos(tabla),
    queryFn: () => fetchReinyeccionCandidatos(tabla),
    enabled,
    staleTime: 10_000,
  })
}

export interface ResolverMutationInput {
  tablaOrigen: string
  idRegistro: string
  payload: PeticionResolverCuarentena
}

export function useResolverCuarentenaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tablaOrigen, idRegistro, payload }: ResolverMutationInput) =>
      resolverCuarentenaRecord(tablaOrigen, idRegistro, payload),
    onSuccess: (res) => {
      toast.success('Registro homologado y resuelto', {
        description: res.mensaje,
      })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.resumen() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.listAll() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.reinyeccionAll() })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo resolver el registro en cuarentena')
    },
  })
}

export interface RechazarMutationInput {
  tablaOrigen: string
  idRegistro: string
  payload: PeticionRechazarCuarentena
}

export function useRechazarCuarentenaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tablaOrigen, idRegistro, payload }: RechazarMutationInput) =>
      rechazarCuarentenaRecord(tablaOrigen, idRegistro, payload),
    onSuccess: (res) => {
      toast.success('Registro descartado', {
        description: res.mensaje,
      })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.resumen() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.listAll() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.reinyeccionAll() })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo descartar el registro en cuarentena')
    },
  })
}

export function useEjecutarReinyeccionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tabla?: string) => ejecutarReinyeccionMdm(tabla),
    onSuccess: (res) => {
      if (res.reinyectados > 0) {
        toast.success('Reinyección ejecutada', {
          description: res.mensaje,
        })
      } else {
        toast.info('Reinyección completada sin reactivaciones', {
          description: res.mensaje,
        })
      }
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.resumen() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.listAll() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.reinyeccionAll() })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo ejecutar la reinyección MDM')
    },
  })
}

export function useResolverLoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PeticionResolverLote) => resolverCuarentenaLote(payload),
    onSuccess: (res) => {
      toast.success('Lote homologado y resuelto', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.resumen() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.listAll() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.reinyeccionAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.cuarentena.resolverLote,
        'No se pudo resolver el lote en cuarentena',
      )
    },
  })
}

export function useRechazarLoteMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PeticionRechazarLote) => rechazarCuarentenaLote(payload),
    onSuccess: (res) => {
      toast.success('Lote descartado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.resumen() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.listAll() })
      void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.reinyeccionAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.cuarentena.rechazarLote,
        'No se pudo descartar el lote en cuarentena',
      )
    },
  })
}
