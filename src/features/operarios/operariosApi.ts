import { apiRequest } from '@/shared/api/client'
import type {
  PaginatedCuarentenaResponse,
  PaginatedPersonalResponse,
} from './types'

export function fetchPersonal(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedPersonalResponse> {
  return apiRequest<PaginatedPersonalResponse>(
    '/api/v1/catalogos/personal',
    {
      query: { pagina, tamano },
    },
  )
}

export function fetchCuarentenaSnapshot(
  tamano = 200,
): Promise<PaginatedCuarentenaResponse> {
  return apiRequest<PaginatedCuarentenaResponse>('/api/v1/cuarentena', {
    query: {
      pagina: 1,
      tamano,
      estado_filtro: 'all',
    },
  })
}
