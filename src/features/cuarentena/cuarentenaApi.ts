import { apiRequest } from '@/shared/api/client'
import { buildRechazarPath, buildResolverPath } from './cuarentenaUtils'
import type {
  CuarentenaResumen,
  EstadoCuarentenaFiltro,
  PeticionRechazarCuarentena,
  PeticionResolverCuarentena,
  RespuestaAccionCuarentena,
  RespuestaCandidatosReinyeccion,
  RespuestaCuarentenaPaginada,
  RespuestaReinyeccion,
} from './types'

export interface ListarCuarentenaParams {
  pagina: number
  tamano: number
  estado_filtro: EstadoCuarentenaFiltro
  tabla_filtro?: string
}

export function fetchCuarentenaResumen(): Promise<CuarentenaResumen> {
  return apiRequest<CuarentenaResumen>('/api/v1/cuarentena/resumen')
}

export function fetchCuarentenaList(
  params: ListarCuarentenaParams,
): Promise<RespuestaCuarentenaPaginada> {
  const tabla = params.tabla_filtro?.trim()
  return apiRequest<RespuestaCuarentenaPaginada>('/api/v1/cuarentena', {
    query: {
      pagina: params.pagina,
      tamano: params.tamano,
      estado_filtro: params.estado_filtro,
      tabla_filtro: tabla ? tabla : undefined,
    },
  })
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

export function fetchReinyeccionCandidatos(
  tabla?: string,
): Promise<RespuestaCandidatosReinyeccion> {
  const cleanTabla = tabla?.trim()
  return apiRequest<RespuestaCandidatosReinyeccion>('/api/v1/reinyeccion/candidatos', {
    query: {
      tabla: cleanTabla ? cleanTabla : undefined,
    },
  })
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
