import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyApiError } from '@/shared/lib/format'
import {
  createDimVariedad,
  desactivarDimVariedad,
  fetchDimVariedades,
  fetchGeografia,
  fetchMdmVariedades,
  reactivarDimVariedad,
} from './maestrosApi'
import { buildGeografiaQueryParams, type RawGeografiaFilterInput } from './schemas'
import type { CreateDimVariedadPayload } from './types'

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
