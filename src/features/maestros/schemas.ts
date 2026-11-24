import { z } from 'zod'
import type {
  CreateDimVariedadPayload,
  GeografiaItem,
  GeografiaQueryParams,
  MaestrosTab,
  UpsertCampanaPayload,
  UpsertGeografiaPayload,
  UpsertMdmVariedadPayload,
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
  if (raw === 'mdm' || raw === 'geografia' || raw === 'campanas' || raw === 'variedades') {
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

export function getGeografiaIdentifier(item: GeografiaItem): string {
  if (item.id_geografia !== null && item.id_geografia !== undefined && String(item.id_geografia).trim()) {
    return String(item.id_geografia).trim()
  }
  if (item.codigo_sap_campo && item.codigo_sap_campo.trim()) {
    return item.codigo_sap_campo.trim()
  }
  return [
    item.fundo ?? '',
    item.sector ?? '',
    item.modulo ?? '',
    item.turno ?? '',
    item.valvula ?? '',
    item.cama ?? '',
  ].join('|')
}

function parseOptionalIntField(val: string, fieldName: string): number | null {
  const trimmed = val.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (!Number.isInteger(num) || num < 0) {
    throw new Error(`${fieldName} inválido`)
  }
  return num
}

export const geografiaFormSchema = z.object({
  fundo: z.string().trim().min(1, 'El fundo es obligatorio.').max(80, 'Máximo 80 caracteres.'),
  sector: z.string().trim().min(1, 'El sector es obligatorio.').max(80, 'Máximo 80 caracteres.'),
  modulo: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 0), 'Módulo debe ser entero >= 0.'),
  turno: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 0), 'Turno debe ser entero >= 0.'),
  valvula: z.string().trim().max(40, 'Máximo 40 caracteres.'),
  cama: z.string().trim().max(40, 'Máximo 40 caracteres.'),
  codigo_sap_campo: z.string().trim().max(60, 'Máximo 60 caracteres.'),
  es_test_block: z.boolean(),
  es_vigente: z.boolean(),
})

export type GeografiaFormValues = z.infer<typeof geografiaFormSchema>

export function toUpsertGeografiaPayload(values: GeografiaFormValues): UpsertGeografiaPayload {
  return {
    fundo: values.fundo.trim(),
    sector: values.sector.trim(),
    modulo: parseOptionalIntField(values.modulo, 'Módulo'),
    turno: parseOptionalIntField(values.turno, 'Turno'),
    valvula: values.valvula.trim() || null,
    cama: values.cama.trim() || null,
    codigo_sap_campo: values.codigo_sap_campo.trim() || null,
    es_test_block: values.es_test_block,
    es_vigente: values.es_vigente,
  }
}

export const mdmVariedadFormSchema = z.object({
  nombre_canonico: z
    .string()
    .trim()
    .min(VARIEDAD_NOMBRE_MIN, `Mínimo ${VARIEDAD_NOMBRE_MIN} caracteres.`)
    .max(VARIEDAD_NOMBRE_MAX, `Máximo ${VARIEDAD_NOMBRE_MAX} caracteres.`),
  breeder: z.string().trim().max(VARIEDAD_BREEDER_MAX, `Máximo ${VARIEDAD_BREEDER_MAX} caracteres.`),
  es_activa: z.boolean(),
})

export type MdmVariedadFormValues = z.infer<typeof mdmVariedadFormSchema>

export function toUpsertMdmVariedadPayload(values: MdmVariedadFormValues): UpsertMdmVariedadPayload {
  const b = values.breeder.trim()
  return {
    nombre_canonico: values.nombre_canonico.trim(),
    breeder: b || null,
    es_activa: values.es_activa,
  }
}

export const campanaFormSchema = z
  .object({
    codigo: z.string().trim().max(30, 'Máximo 30 caracteres.'),
    nombre_campana: z
      .string()
      .trim()
      .min(2, 'Ingresa un nombre válido para la campaña.')
      .max(120, 'Máximo 120 caracteres.'),
    fecha_inicio: z.string().trim().min(1, 'La fecha de inicio es obligatoria.'),
    fecha_fin: z.string().trim().min(1, 'La fecha de cierre es obligatoria.'),
    es_activa: z.boolean(),
    descripcion: z.string().trim().max(300, 'Máximo 300 caracteres.'),
  })
  .refine(
    (data) => {
      if (!data.fecha_inicio || !data.fecha_fin) return true
      return new Date(data.fecha_fin).getTime() >= new Date(data.fecha_inicio).getTime()
    },
    {
      path: ['fecha_fin'],
      message: 'La fecha de cierre debe ser posterior o igual a la fecha de inicio.',
    },
  )

export type CampanaFormValues = z.infer<typeof campanaFormSchema>

export function toUpsertCampanaPayload(values: CampanaFormValues): UpsertCampanaPayload {
  return {
    codigo: values.codigo.trim() || null,
    nombre_campana: values.nombre_campana.trim(),
    fecha_inicio: values.fecha_inicio.trim(),
    fecha_fin: values.fecha_fin.trim(),
    es_activa: values.es_activa,
    descripcion: values.descripcion.trim() || null,
  }
}
