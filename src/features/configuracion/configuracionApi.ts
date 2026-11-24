import { apiRequest } from '@/shared/api/client'
import { API_ENDPOINTS } from '@/shared/api/endpoints'
import {
  asArray,
  asFiniteNumber,
  asRecord,
  normalizePaginated,
} from '@/shared/api/normalize'
import { DEFAULT_BIOLOGIA_CONSTANTES } from './schemas'
import type {
  BatchParametroItem,
  BiologiaConstantes,
  CreateUsuarioPayload,
  MatrizBiologicaRaw,
  ParametroPipeline,
  ReglaValidacion,
  ResetClavePayload,
  ResetClaveResponse,
  RespuestaPaginadaParametros,
  RespuestaPaginadaReglas,
  SaveMatrizResponse,
  SemanaSixWeekKey,
  UpdateParametroResponse,
  UpdateParametrosBatchResponse,
  UpdateUsuarioPayload,
  UpsertReglaPayload,
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

// ── 2. Reglas de Validación (lectura + Etapa 2 CRUD) ──────────────────────────

export async function fetchReglas(
  pagina = 1,
  tamano = 50,
): Promise<RespuestaPaginadaReglas> {
  const raw = await apiRequest<unknown>(API_ENDPOINTS.configuracion.reglasBase, {
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

export function createRegla(
  payload: UpsertReglaPayload,
): Promise<ReglaValidacion> {
  return apiRequest<ReglaValidacion>(API_ENDPOINTS.configuracion.reglasBase, {
    method: 'POST',
    body: payload,
  })
}

export function updateRegla(
  clave: string,
  payload: Partial<UpsertReglaPayload>,
): Promise<ReglaValidacion> {
  return apiRequest<ReglaValidacion>(
    API_ENDPOINTS.configuracion.reglaItem(clave),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

// ── 3. Matriz Biológica Six-Week + Constantes del Motor ───────────────────────

const WEEK_KEYS: readonly SemanaSixWeekKey[] = ['1', '2', '3', '4', '5', '6']

export function normalizeBiologiaConstantes(raw: unknown): BiologiaConstantes {
  const rec = asRecord(raw)
  const rawDecay = asRecord(rec.decay_factor)
  const rawDelta = asRecord(rec.delta_productivas)

  const decay_factor = { ...DEFAULT_BIOLOGIA_CONSTANTES.decay_factor }
  const delta_productivas = { ...DEFAULT_BIOLOGIA_CONSTANTES.delta_productivas }

  for (const key of WEEK_KEYS) {
    decay_factor[key] = asFiniteNumber(
      rawDecay[key],
      DEFAULT_BIOLOGIA_CONSTANTES.decay_factor[key],
    )
    delta_productivas[key] = asFiniteNumber(
      rawDelta[key],
      DEFAULT_BIOLOGIA_CONSTANTES.delta_productivas[key],
    )
  }

  return {
    plantas_por_punto: asFiniteNumber(
      rec.plantas_por_punto,
      DEFAULT_BIOLOGIA_CONSTANTES.plantas_por_punto,
    ),
    decay_factor,
    delta_productivas,
    fecha_modificacion:
      typeof rec.fecha_modificacion === 'string' ? rec.fecha_modificacion : null,
  }
}

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

export async function fetchBiologiaConstantes(): Promise<BiologiaConstantes> {
  const raw = await apiRequest<unknown>(
    API_ENDPOINTS.configuracion.biologiaConstantes,
  )
  return normalizeBiologiaConstantes(raw)
}

export async function saveBiologiaConstantes(
  payload: BiologiaConstantes,
): Promise<BiologiaConstantes> {
  const raw = await apiRequest<unknown>(
    API_ENDPOINTS.configuracion.biologiaConstantes,
    {
      method: 'PUT',
      body: payload,
    },
  )
  return normalizeBiologiaConstantes(raw)
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

export function updateUsuario(
  nombreUsuario: string,
  payload: UpdateUsuarioPayload,
): Promise<UsuarioAdmin> {
  return apiRequest<UsuarioAdmin>(
    API_ENDPOINTS.configuracion.usuarioItem(nombreUsuario),
    {
      method: 'PATCH',
      body: payload,
    },
  )
}

export function resetUsuarioPassword(
  nombreUsuario: string,
  payload: ResetClavePayload,
): Promise<ResetClaveResponse> {
  return apiRequest<ResetClaveResponse>(
    API_ENDPOINTS.configuracion.usuarioResetClave(nombreUsuario),
    {
      method: 'POST',
      body: payload,
    },
  )
}
