import { z } from 'zod'
import type {
  CreateDimVariedadPayload,
  GeografiaQueryParams,
  MaestrosTab,
} from './types'

export const VARIEDAD_NOMBRE_MIN = 2
export const VARIEDAD_NOMBRE_MAX = 150
export const VARIEDAD_BREEDER_MAX = 100

export const MAX_GEOGRAFIA_PAGE_SIZE = 200
export const DEFAULT_GEOGRAFIA_PAGE_SIZE = 50
export const GEOGRAFIA_PAGE_SIZES = [25, 50, 100, 200] as const
export const GEOGRAFIA_FILTER_MAX_LEN = 80

export const createVarietyFormSchema = z.object({
  nombre_variedad: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(
          VARIEDAD_NOMBRE_MIN,
          `El nombre de la variedad debe tener al menos ${VARIEDAD_NOMBRE_MIN} caracteres.`,
        )
        .max(
          VARIEDAD_NOMBRE_MAX,
          `El nombre de la variedad no puede exceder ${VARIEDAD_NOMBRE_MAX} caracteres.`,
        ),
    ),
  breeder: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .max(
          VARIEDAD_BREEDER_MAX,
          `El breeder no puede exceder ${VARIEDAD_BREEDER_MAX} caracteres.`,
        ),
    ),
})

export type CreateVarietyFormValues = z.infer<typeof createVarietyFormSchema>

export function toCreateVarietyPayload(
  values: CreateVarietyFormValues,
): CreateDimVariedadPayload {
  const breederTrimmed = values.breeder.trim()
  return {
    nombre_variedad: values.nombre_variedad.trim(),
    breeder: breederTrimmed.length > 0 ? breederTrimmed : null,
  }
}

export function parseMaestrosTab(raw: string | null | undefined): MaestrosTab {
  if (raw === 'mdm' || raw === 'geografia' || raw === 'variedades') {
    return raw
  }
  return 'variedades'
}

export function normalizeGeografiaPage(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 1) return 1
  return Math.floor(num)
}

/**
 * Normaliza el tamaño de página para GET /api/v1/catalogos/geografia.
 * El backend impone `tamano <= 200` (HTTP 422 si supera el tope).
 */
export function normalizeGeografiaPageSize(
  value: unknown,
  fallback = DEFAULT_GEOGRAFIA_PAGE_SIZE,
): number {
  const safeFallback = Math.min(
    MAX_GEOGRAFIA_PAGE_SIZE,
    Math.max(1, Math.floor(fallback)),
  )
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 1) return safeFallback
  return Math.min(MAX_GEOGRAFIA_PAGE_SIZE, Math.floor(num))
}

function normalizeGeoFilter(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, GEOGRAFIA_FILTER_MAX_LEN)
}

export interface RawGeografiaFilterInput {
  pagina?: unknown
  tamano?: unknown
  texto?: string | null
  fundo?: string | null
  sector?: string | null
}

/**
 * Construye parámetros normalizados y seguros para /api/v1/catalogos/geografia:
 * - `pagina >= 1`
 * - `1 <= tamano <= 200`
 * - `texto`, `fundo`, `sector` recortados a 80 chars y omitidos si están vacíos
 */
export function buildGeografiaQueryParams(
  input: RawGeografiaFilterInput,
): GeografiaQueryParams {
  const params: GeografiaQueryParams = {
    pagina: normalizeGeografiaPage(input.pagina),
    tamano: normalizeGeografiaPageSize(input.tamano),
  }

  const texto = normalizeGeoFilter(input.texto)
  const fundo = normalizeGeoFilter(input.fundo)
  const sector = normalizeGeoFilter(input.sector)

  if (texto) params.texto = texto
  if (fundo) params.fundo = fundo
  if (sector) params.sector = sector

  return params
}
