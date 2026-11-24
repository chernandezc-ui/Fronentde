import { API_BASE_URL, ApiError, apiRequest } from '@/shared/api/client'
import { asArray, asFiniteNumber, asRecord, normalizePaginated } from '@/shared/api/normalize'
import { useAuthStore } from '@/shared/auth/authStore'
import {
  buildBitacoraPath,
  buildExportCsvPath,
  parseContentDispositionFilename,
} from './auditoriaUtils'
import type {
  BitacoraQueryParams,
  CsvDownloadResult,
  EtlFactCatalogItem,
  LogCargaItem,
  RespuestaBitacoraPagina,
  RespuestaResumenBitacora,
  RespuestaValidacionCsv,
  VentanaResumenDias,
} from './types'

export async function fetchBitacora(params: BitacoraQueryParams): Promise<RespuestaBitacoraPagina> {
  const raw = await apiRequest<unknown>(buildBitacoraPath(params))
  const page = normalizePaginated<LogCargaItem>(raw, params.pagina ?? 1, params.tamano ?? 50)
  return {
    items: page.datos,
    total: page.total,
    pagina: page.pagina,
    tamano: page.tamano,
  }
}

export async function fetchBitacoraResumen(
  ventanaDias: VentanaResumenDias,
): Promise<RespuestaResumenBitacora> {
  const raw = asRecord(
    await apiRequest<unknown>('/api/v1/auditoria/bitacora/resumen', {
      query: { ventana_dias: ventanaDias },
    }),
  )
  return {
    ventana_dias: asFiniteNumber(raw.ventana_dias, ventanaDias),
    total: asFiniteNumber(raw.total, 0),
    ok: asFiniteNumber(raw.ok, 0),
    errores: asFiniteNumber(raw.errores, 0),
    en_proceso: asFiniteNumber(raw.en_proceso, 0),
    filas_ok: asFiniteNumber(raw.filas_ok, 0),
    filas_rechazadas: asFiniteNumber(raw.filas_rechazadas, 0),
    tasa_exito_pct: asFiniteNumber(raw.tasa_exito_pct, 0),
  }
}

export function fetchLogDetail(idLog: number): Promise<LogCargaItem> {
  return apiRequest<LogCargaItem>(`/api/v1/auditoria/bitacora/${encodeURIComponent(String(idLog))}`)
}

export async function fetchEtlCatalogFacts(): Promise<EtlFactCatalogItem[]> {
  return asArray<EtlFactCatalogItem>(await apiRequest<unknown>('/api/v1/etl/facts'))
}

export function validateCsvFileApi(
  file: File,
  tablaDestino: string,
): Promise<RespuestaValidacionCsv> {
  const formData = new FormData()
  formData.append('archivo', file)
  formData.append('tabla_destino', tablaDestino.trim())

  return apiRequest<RespuestaValidacionCsv>('/api/v1/ingesta/validar', {
    method: 'POST',
    body: formData,
  })
}

function extractApiErrorDetail(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload.trim()
  }
  if (!payload || typeof payload !== 'object') return fallback
  const obj = payload as Record<string, unknown>
  if (typeof obj.detail === 'string') return obj.detail
  if (typeof obj.mensaje === 'string') return obj.mensaje
  if (typeof obj.error === 'string') return obj.error
  if (Array.isArray(obj.detail) && obj.detail.length > 0) {
    const first = obj.detail[0] as Record<string, unknown>
    if (typeof first?.msg === 'string') return first.msg
  }
  return fallback
}

function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return
  }
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 1_000)
}

/**
 * Descarga una tabla autorizada en CSV (`GET /api/v1/ingesta/descargar/{tabla}`).
 * Usa `fetch` con Bearer token del store, mapea errores HTTP a `ApiError`,
 * respeta `Content-Disposition` y dispara la descarga real en el navegador.
 */
export async function downloadTableCsv(tabla: string): Promise<CsvDownloadResult> {
  const cleanTabla = tabla.trim()
  const token = useAuthStore.getState().token
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${buildExportCsvPath(cleanTabla)}`, {
    method: 'GET',
    headers,
  })

  const requestId = response.headers.get('X-Request-ID')

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    if (response.status === 401) {
      useAuthStore.getState().logout()
    }

    const fallback =
      response.status === 403
        ? 'La tabla no está disponible para exportación.'
        : `Error HTTP ${response.status}`

    throw new ApiError(extractApiErrorDetail(payload, fallback), response.status, requestId, payload)
  }

  const blob = await response.blob()
  const fallbackFilename = `${cleanTabla}_export.csv`
  const filename = parseContentDispositionFilename(
    response.headers.get('Content-Disposition'),
    fallbackFilename,
  )

  triggerBrowserBlobDownload(blob, filename)

  return {
    filename,
    sizeBytes: blob.size,
    tabla: cleanTabla,
  }
}
