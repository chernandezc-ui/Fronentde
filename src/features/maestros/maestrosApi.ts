import { apiRequest } from '@/shared/api/client'
import { normalizePaginated } from '@/shared/api/normalize'
import { buildGeografiaQueryParams, type RawGeografiaFilterInput } from './schemas'
import type {
  CreateDimVariedadPayload,
  DimVariedad,
  GeografiaItem,
  MdmVariedad,
  OperacionVariedadResponse,
  PaginatedCatalogoResponse,
} from './types'

export async function fetchDimVariedades(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCatalogoResponse<DimVariedad>> {
  const raw = await apiRequest<unknown>('/api/v1/catalogos/variedades/dim', {
    query: { pagina, tamano },
  })
  return normalizePaginated<DimVariedad>(raw, pagina, tamano)
}

export function createDimVariedad(
  payload: CreateDimVariedadPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(
    '/api/v1/catalogos/variedades/dim',
    {
      method: 'POST',
      body: payload,
    },
  )
}

export function desactivarDimVariedad(
  idVariedad: number,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(
    `/api/v1/catalogos/variedades/dim/${idVariedad}/desactivar`,
    {
      method: 'PATCH',
    },
  )
}

export function reactivarDimVariedad(
  idVariedad: number,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(
    `/api/v1/catalogos/variedades/dim/${idVariedad}/reactivar`,
    {
      method: 'PATCH',
    },
  )
}

export async function fetchMdmVariedades(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCatalogoResponse<MdmVariedad>> {
  const raw = await apiRequest<unknown>('/api/v1/catalogos/variedades', {
    query: { pagina, tamano },
  })
  return normalizePaginated<MdmVariedad>(raw, pagina, tamano)
}

export async function fetchGeografia(
  input: RawGeografiaFilterInput,
): Promise<PaginatedCatalogoResponse<GeografiaItem>> {
  const normalized = buildGeografiaQueryParams(input)
  const raw = await apiRequest<unknown>('/api/v1/catalogos/geografia', {
    query: {
      pagina: normalized.pagina,
      tamano: normalized.tamano,
      texto: normalized.texto,
      fundo: normalized.fundo,
      sector: normalized.sector,
    },
  })
  return normalizePaginated<GeografiaItem>(raw, normalized.pagina, normalized.tamano)
}
