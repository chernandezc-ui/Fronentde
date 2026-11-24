import { apiRequest } from '@/shared/api/client'
import { asArray, asFiniteNumber, asRecord, normalizePaginated } from '@/shared/api/normalize'
import type {
  BatchParametroItem,
  CreateUsuarioPayload,
  MatrizBiologicaRaw,
  ParametroPipeline,
  ReglaValidacion,
  RespuestaPaginadaParametros,
  RespuestaPaginadaReglas,
  SaveMatrizResponse,
  UpdateParametroResponse,
  UpdateParametrosBatchResponse,
  UsuarioAdmin,
  UsuarioMensajeResponse,
} from './types'

// ── 1. Parámetros del Pipeline ────────────────────────────────────────────────

export async function fetchParametros(
  pagina = 1,
  tamano = 200,
): Promise<RespuestaPaginadaParametros> {
  const raw = await apiRequest<unknown>('/api/v1/config/parametros', {
    query: { pagina, tamano },
  })
  return normalizePaginated<ParametroPipeline>(raw, pagina, tamano)
}

export function updateParametro(
  nombre: string,
  valor: string,
): Promise<UpdateParametroResponse> {
  return apiRequest<UpdateParametroResponse>(
    `/api/v1/config/parametros/${encodeURIComponent(nombre)}`,
    {
      method: 'PATCH',
      body: { valor },
    },
  )
}

export function updateParametrosBatch(
  parametros: BatchParametroItem[],
): Promise<UpdateParametrosBatchResponse> {
  return apiRequest<UpdateParametrosBatchResponse>('/api/v1/config/parametros', {
    method: 'PATCH',
    body: { parametros },
  })
}

// ── 2. Reglas de Validación (solo lectura) ────────────────────────────────────

export async function fetchReglas(
  pagina = 1,
  tamano = 50,
): Promise<RespuestaPaginadaReglas> {
  const raw = await apiRequest<unknown>('/api/v1/config/reglas', {
    query: { pagina, tamano },
  })
  const page = normalizePaginated<ReglaValidacion>(raw, pagina, tamano)
  const rawKpis = asRecord(asRecord(raw).kpis)
  return {
    ...page,
    kpis: {
      total: asFiniteNumber(rawKpis.total, page.total),
      activas: asFiniteNumber(rawKpis.activas, 0),
      inactivas: asFiniteNumber(rawKpis.inactivas, 0),
    },
  }
}

// ── 3. Matriz Biológica Six-Week ──────────────────────────────────────────────

export async function fetchMatrizBiologica(): Promise<MatrizBiologicaRaw> {
  return asRecord(await apiRequest<unknown>('/api/v1/proyecciones/matriz')) as MatrizBiologicaRaw
}

export function saveMatrizBiologica(
  matriz: Record<string, Record<string, number | null>>,
): Promise<SaveMatrizResponse> {
  return apiRequest<SaveMatrizResponse>('/api/v1/proyecciones/matriz', {
    method: 'POST',
    body: matriz,
  })
}

// ── 4. Usuarios y Roles (solo admin) ──────────────────────────────────────────

export async function fetchUsuarios(): Promise<UsuarioAdmin[]> {
  return asArray<UsuarioAdmin>(await apiRequest<unknown>('/auth/usuarios'))
}

export function createUsuario(
  payload: CreateUsuarioPayload,
): Promise<UsuarioAdmin> {
  return apiRequest<UsuarioAdmin>('/auth/usuarios', {
    method: 'POST',
    body: payload,
  })
}

export function desactivarUsuario(
  nombreUsuario: string,
): Promise<UsuarioMensajeResponse> {
  return apiRequest<UsuarioMensajeResponse>(
    `/auth/usuarios/${encodeURIComponent(nombreUsuario)}/desactivar`,
    {
      method: 'POST',
    },
  )
}

export function activarUsuario(
  nombreUsuario: string,
): Promise<UsuarioMensajeResponse> {
  return apiRequest<UsuarioMensajeResponse>(
    `/auth/usuarios/${encodeURIComponent(nombreUsuario)}/activar`,
    {
      method: 'POST',
    },
  )
}
