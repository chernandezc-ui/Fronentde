import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  API_ENDPOINTS,
  isEndpointNotImplementedError,
  notifyStage2MutationError,
} from '@/shared/api/endpoints'
import { notifyApiError } from '@/shared/lib/format'
import {
  createCampana,
  createDimVariedad,
  createGeografia,
  createMdmVariedad,
  desactivarDimVariedad,
  fetchCampanas,
  fetchDimVariedades,
  fetchGeografia,
  fetchMdmVariedades,
  reactivarDimVariedad,
  toggleCampanaEstado,
  toggleGeografiaVigencia,
  toggleMdmVariedadEstado,
  updateCampana,
  updateGeografia,
  updateMdmVariedad,
} from './maestrosApi'
import { buildGeografiaQueryParams, type RawGeografiaFilterInput } from './schemas'
import type {
  CreateDimVariedadPayload,
  UpsertCampanaPayload,
  UpsertGeografiaPayload,
  UpsertMdmVariedadPayload,
} from './types'

export const maestrosQueryKeys = {
  all: ['maestros'] as const,
  dimVariedadesAll: () => [...maestrosQueryKeys.all, 'dim-variedades'] as const,
  dimVariedades: (pagina: number, tamano: number) =>
    [...maestrosQueryKeys.dimVariedadesAll(), pagina, tamano] as const,
  mdmVariedadesAll: () => [...maestrosQueryKeys.all, 'mdm-variedades'] as const,
  mdmVariedades: (pagina: number, tamano: number) =>
    [...maestrosQueryKeys.mdmVariedadesAll(), pagina, tamano] as const,
  geografiaAll: () => [...maestrosQueryKeys.all, 'geografia'] as const,
  geografia: (params: RawGeografiaFilterInput) =>
    [...maestrosQueryKeys.geografiaAll(), buildGeografiaQueryParams(params)] as const,
  campanasAll: () => [...maestrosQueryKeys.all, 'campanas'] as const,
  campanas: (pagina: number, tamano: number) =>
    [...maestrosQueryKeys.campanasAll(), pagina, tamano] as const,
}

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function useDimVariedades(pagina: number, tamano: number) {
  return useQuery({
    queryKey: maestrosQueryKeys.dimVariedades(pagina, tamano),
    queryFn: () => fetchDimVariedades(pagina, tamano),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useMdmVariedades(pagina: number, tamano: number, enabled = true) {
  return useQuery({
    queryKey: maestrosQueryKeys.mdmVariedades(pagina, tamano),
    queryFn: () => fetchMdmVariedades(pagina, tamano),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}

export function useGeografia(params: RawGeografiaFilterInput, enabled = true) {
  const normalized = buildGeografiaQueryParams(params)
  return useQuery({
    queryKey: maestrosQueryKeys.geografia(normalized),
    queryFn: () => fetchGeografia(normalized),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}

export function useCreateDimVariedadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDimVariedadPayload) => createDimVariedad(payload),
    onSuccess: (res) => {
      toast.success('Variedad registrada en DWH', {
        description: res.mensaje,
      })
      void queryClient.invalidateQueries({
        queryKey: maestrosQueryKeys.dimVariedadesAll(),
      })
      void queryClient.invalidateQueries({
        queryKey: maestrosQueryKeys.mdmVariedadesAll(),
      })
    },
  })
}

export function useToggleDimVariedadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      idVariedad,
      activar,
    }: {
      idVariedad: number
      activar: boolean
    }) =>
      activar
        ? reactivarDimVariedad(idVariedad)
        : desactivarDimVariedad(idVariedad),
    onSuccess: (res, variables) => {
      toast.success(
        variables.activar ? 'Variedad reactivada' : 'Variedad desactivada',
        {
          description: res.mensaje,
        },
      )
      void queryClient.invalidateQueries({
        queryKey: maestrosQueryKeys.dimVariedadesAll(),
      })
    },
    onError: (err, variables) => {
      notifyApiError(
        err,
        variables.activar
          ? 'No se pudo reactivar la variedad'
          : 'No se pudo desactivar la variedad',
      )
    },
  })
}

export function useCreateGeografiaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertGeografiaPayload) => createGeografia(payload),
    onSuccess: (res) => {
      toast.success('Unidad geográfica registrada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.geografiaAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.maestros.geografiaBase,
        'No se pudo crear la unidad geográfica',
      )
    },
  })
}

export function useUpdateGeografiaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertGeografiaPayload }) =>
      updateGeografia(id, payload),
    onSuccess: (res) => {
      toast.success('Geografía actualizada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.geografiaAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.maestros.geografiaItem(vars.id),
        'No se pudo actualizar la unidad geográfica',
      )
    },
  })
}

export function useToggleGeografiaVigenciaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, esVigente }: { id: string; esVigente: boolean }) =>
      toggleGeografiaVigencia(id, esVigente),
    onSuccess: (res) => {
      toast.success('Vigencia actualizada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.geografiaAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.maestros.geografiaVigencia(vars.id),
        'No se pudo cambiar la vigencia geográfica',
      )
    },
  })
}

export function useCreateMdmVariedadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertMdmVariedadPayload) => createMdmVariedad(payload),
    onSuccess: (res) => {
      toast.success('Variedad MDM creada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.mdmVariedadesAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.maestros.mdmVariedadesBase,
        'No se pudo crear la variedad MDM',
      )
    },
  })
}

export function useUpdateMdmVariedadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      nombreActual,
      payload,
    }: {
      nombreActual: string
      payload: UpsertMdmVariedadPayload
    }) => updateMdmVariedad(nombreActual, payload),
    onSuccess: (res) => {
      toast.success('Variedad MDM actualizada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.mdmVariedadesAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.maestros.mdmVariedadItem(vars.nombreActual),
        'No se pudo actualizar la variedad MDM',
      )
    },
  })
}

export function useToggleMdmVariedadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nombreCanonico, esActiva }: { nombreCanonico: string; esActiva: boolean }) =>
      toggleMdmVariedadEstado(nombreCanonico, esActiva),
    onSuccess: (res) => {
      toast.success('Estado de variedad MDM actualizado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.mdmVariedadesAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.maestros.mdmVariedadEstado(vars.nombreCanonico),
        'No se pudo cambiar el estado MDM',
      )
    },
  })
}

export function useCampanas(pagina: number, tamano: number, enabled = true) {
  return useQuery({
    queryKey: maestrosQueryKeys.campanas(pagina, tamano),
    queryFn: () => fetchCampanas(pagina, tamano),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
    retry: (count, err) => !isEndpointNotImplementedError(err) && count < 1,
  })
}

export function useCreateCampanaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertCampanaPayload) => createCampana(payload),
    onSuccess: (res) => {
      toast.success('Campaña creada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.campanasAll() })
    },
    onError: (err) => {
      notifyStage2MutationError(
        err,
        'POST',
        API_ENDPOINTS.maestros.campanasBase,
        'No se pudo crear la campaña',
      )
    },
  })
}

export function useUpdateCampanaMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idCampana, payload }: { idCampana: number; payload: UpsertCampanaPayload }) =>
      updateCampana(idCampana, payload),
    onSuccess: (res) => {
      toast.success('Campaña actualizada', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.campanasAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        API_ENDPOINTS.maestros.campanaItem(vars.idCampana),
        'No se pudo actualizar la campaña',
      )
    },
  })
}

export function useToggleCampanaEstadoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idCampana, activar }: { idCampana: number; activar: boolean }) =>
      toggleCampanaEstado(idCampana, activar),
    onSuccess: (res) => {
      toast.success('Estado de campaña actualizado', { description: res.mensaje })
      void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.campanasAll() })
    },
    onError: (err, vars) => {
      notifyStage2MutationError(
        err,
        'PATCH',
        vars.activar
          ? API_ENDPOINTS.maestros.campanaActivar(vars.idCampana)
          : API_ENDPOINTS.maestros.campanaCerrar(vars.idCampana),
        'No se pudo cambiar el estado de la campaña',
      )
    },
  })
}
