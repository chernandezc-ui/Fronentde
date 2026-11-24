import { apiRequest } from '@/shared/api/client'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import { asFiniteNumber, asRecord, normalizePaginated } from '@/shared/api/normalize'
import { buildRechazarPath, buildResolverPath } from './cuarentenaUtils'
import type {
  CuarentenaResumen,
  EstadoCuarentenaFiltro,
  PeticionRechazarCuarentena,
  PeticionRechazarLote,
  PeticionResolverCuarentena,
  PeticionResolverLote,
  RegistroCuarentena,
  RespuestaAccionCuarentena,
  RespuestaCandidatosReinyeccion,
  RespuestaCuarentenaPaginada,
  RespuestaLoteCuarentena,
  RespuestaReinyeccion,
} from './types'

export interface ListarCuarentenaParams {
  pagina: number
  tamano: number
  estado_filtro: EstadoCuarentenaFiltro
  tabla_filtro?: string
  q?: string
  columna?: string
}

export async function fetchCuarentenaResumen(): Promise<CuarentenaResumen> {
  const raw = asRecord(await apiRequest<unknown>('/api/v1/cuarentena/resumen'))
  return {
    total: asFiniteNumber(raw.total, 0),
    pendientes: asFiniteNumber(raw.pendientes, 0),
    resueltos: asFiniteNumber(raw.resueltos, 0),
    descartados: asFiniteNumber(raw.descartados, 0),
  }
}

export async function fetchCuarentenaList(
  params: ListarCuarentenaParams,
): Promise<RespuestaCuarentenaPaginada> {
  const tabla = params.tabla_filtro?.trim()
  const q = params.q?.trim()
  const columna = params.columna?.trim()
  const raw = await apiRequest<unknown>(API_ENDPOINTS.cuarentena.listar, {
    query: {
      pagina: params.pagina,
      tamano: params.tamano,
      estado_filtro: params.estado_filtro,
      tabla_filtro: tabla ? tabla : undefined,
      q: q ? q : undefined,
      columna: columna ? columna : undefined,
    },
  })
  return normalizePaginated<RegistroCuarentena>(raw, params.pagina, params.tamano)
}

export function resolverCuarentenaRecord(
  tablaOrigen: string,
  idRegistro: string,
  payload: PeticionResolverCuarentena,
): Promise<RespuestaAccionCuarentena> {
  return apiRequest<RespuestaAccionCuarentena>(buildResolverPath(tablaOrigen, idRegistro), {
    method: 'PATCH',
    body: payload,
  })
}

export function rechazarCuarentenaRecord(
  tablaOrigen: string,
  idRegistro: string,
  payload: PeticionRechazarCuarentena,
): Promise<RespuestaAccionCuarentena> {
  return apiRequest<RespuestaAccionCuarentena>(buildRechazarPath(tablaOrigen, idRegistro), {
    method: 'PATCH',
    body: payload,
  })
}

export async function fetchReinyeccionCandidatos(
  tabla?: string,
): Promise<RespuestaCandidatosReinyeccion> {
  const cleanTabla = tabla?.trim()
  const raw = asRecord(
    await apiRequest<unknown>('/api/v1/reinyeccion/candidatos', {
      query: {
        tabla: cleanTabla ? cleanTabla : undefined,
      },
    }),
  )
  return {
    candidatos: asFiniteNumber(raw.candidatos, 0),
  }
}

export function ejecutarReinyeccionMdm(tabla?: string): Promise<RespuestaReinyeccion> {
  const cleanTabla = tabla?.trim()
  return apiRequest<RespuestaReinyeccion>('/api/v1/reinyeccion/ejecutar', {
    method: 'POST',
    query: {
      tabla: cleanTabla ? cleanTabla : undefined,
    },
  })
}

export function resolverCuarentenaLote(
  payload: PeticionResolverLote,
): Promise<RespuestaLoteCuarentena> {
  return apiRequest<RespuestaLoteCuarentena>(API_ENDPOINTS.cuarentena.resolverLote, {
    method: 'POST',
    body: payload,
  })
}

export function rechazarCuarentenaLote(
  payload: PeticionRechazarLote,
): Promise<RespuestaLoteCuarentena> {
  return apiRequest<RespuestaLoteCuarentena>(API_ENDPOINTS.cuarentena.rechazarLote, {
    method: 'POST',
    body: payload,
  })
}
