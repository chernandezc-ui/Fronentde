/**
 * Defensas de contrato HTTP en tiempo de ejecución.
 * Evitan colapsos de UI si un proxy o respuesta parcial devuelve `null` o tipos inesperados.
 */

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function asFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asOptionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export interface PaginatedContract<T> {
  total: number
  pagina: number
  tamano: number
  datos: T[]
}

export function normalizePaginated<T>(
  raw: unknown,
  defaultPagina = 1,
  defaultTamano = 50,
): PaginatedContract<T> {
  const obj = asRecord(raw)
  const datos = asArray<T>(obj.datos ?? obj.items)
  return {
    total: asFiniteNumber(obj.total, datos.length),
    pagina: Math.max(1, Math.trunc(asFiniteNumber(obj.pagina, defaultPagina))),
    tamano: Math.max(1, Math.trunc(asFiniteNumber(obj.tamano, defaultTamano))),
    datos,
  }
}
