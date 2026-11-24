import { apiFormPost, apiRequest } from '@/shared/api/client'
import type { PerfilUsuario } from '@/shared/auth/authStore'

export interface TokenRespuesta {
  access_token: string
  token_type: string
  usuario: PerfilUsuario
}

export interface CambiarClavePayload {
  clave_actual: string
  clave_nueva: string
}

export interface RespuestaMensaje {
  mensaje: string
  ok?: boolean
}

export interface HealthPublico {
  servicio: string
  version: string
  entorno: string
  estado: 'activo' | 'degradado' | string
  base_datos: {
    conectado: boolean
    base_datos?: string | null
    latencia_ms?: number | null
    error?: string | null
  }
  timestamp: string
}

export function loginRequest(username: string, password: string): Promise<TokenRespuesta> {
  return apiFormPost<TokenRespuesta>('/auth/login', { username, password }, true)
}

export function fetchCurrentUser(): Promise<PerfilUsuario> {
  return apiRequest<PerfilUsuario>('/auth/me')
}

export function cambiarClaveRequest(payload: CambiarClavePayload): Promise<RespuestaMensaje> {
  return apiRequest<RespuestaMensaje>('/auth/cambiar-clave', {
    method: 'POST',
    body: payload,
  })
}

export function fetchPublicHealth(): Promise<HealthPublico> {
  return apiRequest<HealthPublico>('/health', { skipAuth: true })
}
