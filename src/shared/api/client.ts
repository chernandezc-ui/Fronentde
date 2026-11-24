import { useAuthStore } from '@/shared/auth/authStore'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8810'
).replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  requestId: string | null
  detail: string
  payload?: unknown

  constructor(message: string, status: number, requestId: string | null, payload?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requestId = requestId
    this.detail = message
    this.payload = payload
  }
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalized}`)
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val))
      }
    }
  }
  return url.toString()
}

function extractErrorMessage(payload: unknown, fallback: string): string {
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

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  skipAuth?: boolean
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipAuth = false, headers: customHeaders, ...rest } = options
  const token = useAuthStore.getState().token
  const headers = new Headers(customHeaders)

  if (!skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let preparedBody: BodyInit | undefined
  if (body instanceof URLSearchParams || body instanceof FormData || typeof body === 'string') {
    preparedBody = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    preparedBody = JSON.stringify(body)
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers,
    body: preparedBody,
  })

  const requestId = response.headers.get('X-Request-ID')
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const rawText = await response.text().catch(() => '')

  let payload: unknown = rawText
  let jsonParseFailed = false
  if (isJson) {
    if (rawText.trim().length === 0) {
      payload = null
    } else {
      try {
        payload = JSON.parse(rawText)
      } catch {
        payload = null
        jsonParseFailed = true
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      useAuthStore.getState().logout()
    }
    const message = extractErrorMessage(payload, `Error HTTP ${response.status}`)
    throw new ApiError(message, response.status, requestId, payload)
  }

  if (jsonParseFailed) {
    throw new ApiError(
      'Respuesta JSON inválida o truncada del servidor.',
      response.status,
      requestId,
      rawText,
    )
  }

  return payload as T
}

export function apiFormPost<T>(path: string, formFields: Record<string, string>, skipAuth = false): Promise<T> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(formFields)) {
    params.set(k, v)
  }
  return apiRequest<T>(path, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    skipAuth,
  })
}
