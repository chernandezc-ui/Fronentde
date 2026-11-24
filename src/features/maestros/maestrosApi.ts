import { apiRequest } from '@/shared/api/client'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import { normalizePaginated } from '@/shared/api/normalize'
import { buildGeografiaQueryParams, type RawGeografiaFilterInput } from './schemas'
import type {
  CampanaItem,
  CreateDimVariedadPayload,
  DimVariedad,
  GeografiaItem,
  MdmVariedad,
  OperacionVariedadResponse,
  PaginatedCatalogoResponse,
  UpsertCampanaPayload,
  UpsertGeografiaPayload,
  UpsertMdmVariedadPayload,
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

export function createGeografia(
  payload: UpsertGeografiaPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.geografiaBase, {
    method: 'POST',
    body: payload,
  })
}

export function updateGeografia(
  id: string,
  payload: UpsertGeografiaPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.geografiaItem(id), {
    method: 'PATCH',
    body: payload,
  })
}

export function toggleGeografiaVigencia(
  id: string,
  esVigente: boolean,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.geografiaVigencia(id), {
    method: 'PATCH',
    body: { es_vigente: esVigente },
  })
}

export function createMdmVariedad(
  payload: UpsertMdmVariedadPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.mdmVariedadesBase, {
    method: 'POST',
    body: payload,
  })
}

export function updateMdmVariedad(
  nombreActual: string,
  payload: UpsertMdmVariedadPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(
    API_ENDPOINTS.maestros.mdmVariedadItem(nombreActual),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export function toggleMdmVariedadEstado(
  nombreCanonico: string,
  esActiva: boolean,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(
    API_ENDPOINTS.maestros.mdmVariedadEstado(nombreCanonico),
    {
      method: 'PATCH',
      body: { es_activa: esActiva },
    },
  )
}

export async function fetchCampanas(
  pagina = 1,
  tamano = 50,
): Promise<PaginatedCatalogoResponse<CampanaItem>> {
  const raw = await apiRequest<unknown>(API_ENDPOINTS.maestros.campanasBase, {
    query: { pagina, tamano },
  })
  return normalizePaginated<CampanaItem>(raw, pagina, tamano)
}

export function createCampana(
  payload: UpsertCampanaPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.campanasBase, {
    method: 'POST',
    body: payload,
  })
}

export function updateCampana(
  idCampana: number,
  payload: UpsertCampanaPayload,
): Promise<OperacionVariedadResponse> {
  return apiRequest<OperacionVariedadResponse>(API_ENDPOINTS.maestros.campanaItem(idCampana), {
    method: 'PATCH',
    body: payload,
  })
}

export function toggleCampanaEstado(
  idCampana: number,
  activar: boolean,
): Promise<OperacionVariedadResponse> {
  const endpoint = activar
    ? API_ENDPOINTS.maestros.campanaActivar(idCampana)
    : API_ENDPOINTS.maestros.campanaCerrar(idCampana)
  return apiRequest<OperacionVariedadResponse>(endpoint, {
    method: 'PATCH',
  })
}
