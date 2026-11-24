import { apiRequest } from '@/shared/api/client'
import type {
  BatchParametroItem,
  CreateUsuarioPayload,
  MatrizBiologicaRaw,
  RespuestaPaginadaParametros,
  RespuestaPaginadaReglas,
  SaveMatrizResponse,
  UpdateParametroResponse,
  UpdateParametrosBatchResponse,
  UsuarioAdmin,
  UsuarioMensajeResponse,
} from './types'

// ── 1. Parámetros del Pipeline ────────────────────────────────────────────────

export function fetchParametros(
  pagina = 1,
  tamano = 200,
): Promise<RespuestaPaginadaParametros> {
  return apiRequest<RespuestaPaginadaParametros>('/api/v1/config/parametros', {
    query: { pagina, tamano },
  })
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

export function fetchReglas(
  pagina = 1,
  tamano = 50,
): Promise<RespuestaPaginadaReglas> {
  return apiRequest<RespuestaPaginadaReglas>('/api/v1/config/reglas', {
    query: { pagina, tamano },
  })
}

// ── 3. Matriz Biológica Six-Week ──────────────────────────────────────────────

export function fetchMatrizBiologica(): Promise<MatrizBiologicaRaw> {
  return apiRequest<MatrizBiologicaRaw>('/api/v1/proyecciones/matriz')
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

export function fetchUsuarios(): Promise<UsuarioAdmin[]> {
  return apiRequest<UsuarioAdmin[]>('/auth/usuarios')
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
