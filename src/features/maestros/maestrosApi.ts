import { apiRequest } from '@/shared/api/client'
import { buildGeografiaQueryParams, type RawGeografiaFilterInput } from './schemas'
import type {
  CreateDimVariedadPayload,
  DimVariedad,
  GeografiaItem,
  MdmVariedad,
  OperacionVariedadResponse,
  PaginatedCatalogoResponse,
} from './types'

export function fetchDimVariedades(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCatalogoResponse<DimVariedad>> {
  return apiRequest<PaginatedCatalogoResponse<DimVariedad>>(
    '/api/v1/catalogos/variedades/dim',
    {
      query: { pagina, tamano },
    },
  )
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

export function fetchMdmVariedades(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCatalogoResponse<MdmVariedad>> {
  return apiRequest<PaginatedCatalogoResponse<MdmVariedad>>(
    '/api/v1/catalogos/variedades',
    {
      query: { pagina, tamano },
    },
  )
}

export function fetchGeografia(
  input: RawGeografiaFilterInput,
): Promise<PaginatedCatalogoResponse<GeografiaItem>> {
  const normalized = buildGeografiaQueryParams(input)
  return apiRequest<PaginatedCatalogoResponse<GeografiaItem>>(
    '/api/v1/catalogos/geografia',
    {
      query: {
        pagina: normalized.pagina,
        tamano: normalized.tamano,
        texto: normalized.texto,
        fundo: normalized.fundo,
        sector: normalized.sector,
      },
    },
  )
}
