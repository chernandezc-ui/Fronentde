import { apiRequest } from '@/shared/api/client'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import { normalizePaginated } from '@/shared/api/normalize'
import type {
  CuarentenaIncidencia,
  OperarioMutationResponse,
  OperarioPersonal,
  PaginatedCuarentenaResponse,
  PaginatedPersonalResponse,
  UpsertOperarioPayload,
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

export async function fetchOperarioIncidencias(
  dni: string,
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCuarentenaResponse> {
  const raw = await apiRequest<unknown>(API_ENDPOINTS.operarios.personalIncidencias(dni), {
    query: { pagina, tamano },
  })
  return normalizePaginated<CuarentenaIncidencia>(raw, pagina, tamano)
}

export function createOperario(
  payload: UpsertOperarioPayload,
): Promise<OperarioMutationResponse> {
  return apiRequest<OperarioMutationResponse>(API_ENDPOINTS.operarios.personalBase, {
    method: 'POST',
    body: payload,
  })
}

export function updateOperario(
  dni: string,
  payload: UpsertOperarioPayload,
): Promise<OperarioMutationResponse> {
  return apiRequest<OperarioMutationResponse>(API_ENDPOINTS.operarios.personalItem(dni), {
    method: 'PATCH',
    body: payload,
  })
}

export function toggleOperarioEstado(
  dni: string,
  activar: boolean,
): Promise<OperarioMutationResponse> {
  const endpoint = activar
    ? API_ENDPOINTS.operarios.personalReactivar(dni)
    : API_ENDPOINTS.operarios.personalDesactivar(dni)
  return apiRequest<OperarioMutationResponse>(endpoint, {
    method: 'PATCH',
  })
}
