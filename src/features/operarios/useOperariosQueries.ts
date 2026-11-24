import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchCuarentenaSnapshot, fetchPersonal } from './operariosApi'

export const operariosQueryKeys = {
  all: ['operarios'] as const,
  personalAll: () => [...operariosQueryKeys.all, 'personal'] as const,
  personal: (pagina: number, tamano: number) =>
    [...operariosQueryKeys.personalAll(), pagina, tamano] as const,
  cuarentenaSnapshot: (tamano: number) =>
    [...operariosQueryKeys.all, 'cuarentena-snapshot', tamano] as const,
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
