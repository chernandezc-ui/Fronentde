import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  API_ENDPOINTS,
  isEndpointNotImplementedError,
  notifyStage2MutationError,
} from '@/shared/api/endpoints'
import {
  createOperario,
  fetchCuarentenaSnapshot,
  fetchOperarioIncidencias,
  fetchPersonal,
  toggleOperarioEstado,
  updateOperario,
} from './operariosApi'
import type { UpsertOperarioPayload } from './types'

export const operariosQueryKeys = {
  all: ['operarios'] as const,
  personalAll: () => [...operariosQueryKeys.all, 'personal'] as const,
  personal: (pagina: number, tamano: number) =>
    [...operariosQueryKeys.personalAll(), pagina, tamano] as const,
  cuarentenaSnapshot: (tamano: number) =>
    [...operariosQueryKeys.all, 'cuarentena-snapshot', tamano] as const,
  incidenciasAll: () => [...operariosQueryKeys.all, 'incidencias'] as const,
  incidencias: (dni: string, pagina = 1, tamano = 50) =>
    [...operariosQueryKeys.incidenciasAll(), dni, pagina, tamano] as const,
}

export function usePersonal(pagina: number, tamano: number) {
  return useQuery({
    queryKey: operariosQueryKeys.personal(pagina, tamano),
    queryFn: () => fetchPersonal(pagina, tamano),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useCuarentenaSnapshot(enabled: boolean, tamano = 200) {
  return useQuery({
    queryKey: operariosQueryKeys.cuarentenaSnapshot(tamano),
    queryFn: () => fetchCuarentenaSnapshot(tamano),
    enabled,
    staleTime: 60_000,
  })
}

export function useOperarioIncidencias(dni: string | null | undefined, enabled = true) {
  const cleanDni = (dni ?? '').trim()
  return useQuery({
    queryKey: operariosQueryKeys.incidencias(cleanDni),
    queryFn: () => fetchOperarioIncidencias(cleanDni),
    enabled: enabled && cleanDni.length > 0,
    staleTime: 30_000,
    retry: (count, err) => !isEndpointNotImplementedError(err) && count < 1,
  })
}

export function useCreateOperarioMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertOperarioPayload) => createOperario(payload),
    onSuccess: (res) => {
      toast.success('Operario registrado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: operariosQueryKeys.personalAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.operarios.personalBase,
        'No se pudo registrar el operario',
      )
    },
  })
}

export function useUpdateOperarioMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dni, payload }: { dni: string; payload: UpsertOperarioPayload }) =>
      updateOperario(dni, payload),
    onSuccess: (res) => {
      toast.success('Operario actualizado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: operariosQueryKeys.personalAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.operarios.personalItem(vars.dni),
        'No se pudo actualizar el operario',
      )
    },
  })
}

export function useToggleOperarioEstadoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dni, activar }: { dni: string; activar: boolean }) =>
      toggleOperarioEstado(dni, activar),
    onSuccess: (res) => {
      toast.success('Estado del operario actualizado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: operariosQueryKeys.personalAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        vars.activar
          ? API_ENDPOINTS.operarios.personalReactivar(vars.dni)
          : API_ENDPOINTS.operarios.personalDesactivar(vars.dni),
        'No se pudo actualizar el estado del operario',
      )
    },
  })
}
