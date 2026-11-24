import { apiRequest } from '@/shared/api/client'
import { normalizePaginated } from '@/shared/api/normalize'
import type {
  CuarentenaIncidencia,
  OperarioPersonal,
  PaginatedCuarentenaResponse,
  PaginatedPersonalResponse,
} from './types'

export async function fetchPersonal(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedPersonalResponse> {
  const raw = await apiRequest<unknown>('/api/v1/catalogos/personal', {
    query: { pagina, tamano },
  })
  return normalizePaginated<OperarioPersonal>(raw, pagina, tamano)
}

export async function fetchCuarentenaSnapshot(
  tamano = 200,
): Promise<PaginatedCuarentenaResponse> {
  const raw = await apiRequest<unknown>('/api/v1/cuarentena', {
    query: {
      pagina: 1,
      tamano,
      estado_filtro: 'all',
    },
  })
  return normalizePaginated<CuarentenaIncidencia>(raw, 1, tamano)
}
