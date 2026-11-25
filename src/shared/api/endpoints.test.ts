import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/client'
import { API_ENDPOINTS, isEndpointNotImplementedError } from './endpoints'

describe('endpoints & stage 2 error detection', () => {
  it('exposes centralized Stage 2 endpoints across all domain modules', () => {
    expect(API_ENDPOINTS.health.calidadStream).toBe('/health/calidad/stream')
    expect(API_ENDPOINTS.cuarentena.resolverLote).toBe('/api/v1/cuarentena/resolver-lote')
    expect(API_ENDPOINTS.cuarentena.rechazarLote).toBe('/api/v1/cuarentena/rechazar-lote')
    expect(API_ENDPOINTS.maestros.campanasBase).toBe('/api/v1/catalogos/campanas')
    expect(API_ENDPOINTS.maestros.campanaActivar(42)).toBe('/api/v1/catalogos/campanas/42/activar')
    expect(API_ENDPOINTS.operarios.personalIncidencias('0745 1234')).toBe(
      '/api/v1/catalogos/personal/0745%201234/incidencias',
    )
    expect(API_ENDPOINTS.configuracion.reglasBase).toBe('/api/v1/config/reglas')
    expect(API_ENDPOINTS.configuracion.biologiaConstantes).toBe('/api/v1/proyecciones/constantes')
    expect(API_ENDPOINTS.configuracion.usuarioResetClave('admin.acp')).toBe(
      '/auth/usuarios/admin.acp/reset-clave',
    )
    expect(API_ENDPOINTS.ingesta.excelSubir).toBe('/api/v1/ingesta/excel/subir')
    expect(API_ENDPOINTS.auditoria.accesos).toBe('/api/v1/auditoria/accesos')
    expect(API_ENDPOINTS.proyecciones.fechas).toBe('/api/v1/proyecciones/fechas')
    expect(API_ENDPOINTS.proyecciones.combinaciones(20261123)).toBe(
      '/api/v1/proyecciones/combinaciones/20261123',
    )
    expect(API_ENDPOINTS.proyecciones.integridad(20261123)).toBe(
      '/api/v1/proyecciones/integridad/20261123',
    )
    expect(API_ENDPOINTS.proyecciones.ejecutar).toBe('/api/v1/proyecciones/ejecutar')
    expect(API_ENDPOINTS.proyecciones.simular).toBe('/api/v1/proyecciones/simular')
  })

  it('detects 404, 405 and 501 ApiError instances as not implemented', () => {
    expect(isEndpointNotImplementedError(new ApiError('Not found', 404, null))).toBe(true)
    expect(isEndpointNotImplementedError(new ApiError('Method not allowed', 405, null))).toBe(true)
    expect(isEndpointNotImplementedError(new ApiError('Not implemented', 501, null))).toBe(true)
  })

  it('does not flag 400, 403, 500 or generic errors as not implemented', () => {
    expect(isEndpointNotImplementedError(new ApiError('Bad request', 400, null))).toBe(false)
    expect(isEndpointNotImplementedError(new ApiError('Forbidden', 403, null))).toBe(false)
    expect(isEndpointNotImplementedError(new ApiError('Server error', 500, null))).toBe(false)
    expect(isEndpointNotImplementedError(new Error('HTTP 404'))).toBe(false)
    expect(isEndpointNotImplementedError(null)).toBe(false)
  })
})
