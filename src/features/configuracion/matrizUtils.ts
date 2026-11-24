import type {
  EstadoBiologico,
  MatrizBiologicaCompleta,
  MatrizBiologicaRaw,
  MatrizCerradaRow,
  ReporteValidacionMatriz,
  SemanaSixWeek,
  SemanaSixWeekKey,
} from './types'

export const ESTADOS_BIOLOGICOS_ORDEN: readonly EstadoBiologico[] = [
  'cosechable',
  'maduras',
  'cremas',
  'fase_2',
  'fase_1',
  'verdes',
  'pequena',
] as const

export const SEMANAS_SIXWEEK: readonly SemanaSixWeek[] = [1, 2, 3, 4, 5, 6] as const

export const SEMANAS_SIXWEEK_KEYS: readonly SemanaSixWeekKey[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
] as const

export const TOLERANCIA_SUMA_MATRIZ = 1e-6

/** Constantes fijas del dominio backend (`dominio/proyecciones.py`). Solo lectura en Etapa 1. */
export const PLANTAS_POR_PUNTO = 10

export const DECAY_FACTOR: Readonly<Record<SemanaSixWeek, number>> = {
  1: 1.0,
  2: 1.0,
  3: 0.8,
  4: 0.8,
  5: 0.8,
  6: 0.8,
}

export const DELTA_PRODUCTIVAS: Readonly<Record<SemanaSixWeek, number>> = {
  1: 0.0,
  2: 0.02,
  3: 0.0,
  4: -0.03,
  5: 0.01,
  6: 0.01,
}

export const ID_ESTADO_MAP: Readonly<Record<number, EstadoBiologico>> = {
  9: 'cosechable',
  8: 'maduras',
  7: 'cremas',
  6: 'fase_2',
  5: 'fase_1',
  4: 'verdes',
  3: 'pequena',
}

export interface EstadoBiologicoMeta {
  key: EstadoBiologico
  idEstado: number
  label: string
  descripcion: string
  dotClass: string
}

export const ESTADO_BIOLOGICO_META: Readonly<Record<EstadoBiologico, EstadoBiologicoMeta>> = {
  cosechable: {
    key: 'cosechable',
    idEstado: 9,
    label: 'Cosechable',
    descripcion: 'Fruta lista para cosecha inmediata',
    dotClass: 'bg-indigo-600 dark:bg-indigo-400',
  },
  maduras: {
    key: 'maduras',
    idEstado: 8,
    label: 'Maduras',
    descripcion: 'Coloración completa próxima a corte',
    dotClass: 'bg-violet-600 dark:bg-violet-400',
  },
  cremas: {
    key: 'cremas',
    idEstado: 7,
    label: 'Cremas',
    descripcion: 'En transición final de maduración',
    dotClass: 'bg-amber-500',
  },
  fase_2: {
    key: 'fase_2',
    idEstado: 6,
    label: 'Fase 2',
    descripcion: 'Fruto desarrollado con maduración escalonada',
    dotClass: 'bg-orange-500',
  },
  fase_1: {
    key: 'fase_1',
    idEstado: 5,
    label: 'Fase 1',
    descripcion: 'Fruto intermedio con cosecha hacia W3–W5',
    dotClass: 'bg-lime-600 dark:bg-lime-400',
  },
  verdes: {
    key: 'verdes',
    idEstado: 4,
    label: 'Verdes',
    descripcion: 'Fruto verde; parte madura fuera del corte W1–W6',
    dotClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  pequena: {
    key: 'pequena',
    idEstado: 3,
    label: 'Pequeña',
    descripcion: 'Cuaje inicial fuera de la ventana de 6 semanas',
    dotClass: 'bg-teal-500',
  },
}

/**
 * Defaults exactos de `dominio/proyecciones.py` (`MATRIZ_INPUTS_DEFAULT`).
 * Las semanas omitidas se tratan como `null` (cierre residual automático).
 */
export const MATRIZ_INPUTS_DEFAULT: Readonly<
  Record<EstadoBiologico, Readonly<Partial<Record<SemanaSixWeekKey, number | null>>>>
> = {
  cosechable: { '1': 1.0, '2': null },
  maduras: { '1': 1.0, '2': null },
  cremas: { '1': 1.0, '2': null },
  fase_2: { '1': 0.14, '2': 0.4, '3': null },
  fase_1: { '1': 0.0, '2': 0.0, '3': 0.1, '4': 0.6, '5': null, '6': null },
  verdes: { '1': 0.0, '2': 0.0, '3': 0.0, '4': 0.0, '5': 0.16, '6': 0.17 },
  pequena: { '1': 0.0, '2': 0.0, '3': 0.0, '4': 0.0, '5': 0.0, '6': 0.0 },
}

function leerSemanaRaw(
  semanas: Record<string | number, number | null | undefined> | undefined,
  w: SemanaSixWeek,
): number | null {
  if (!semanas) return null
  const key = String(w)
  if (Object.prototype.hasOwnProperty.call(semanas, key)) {
    const raw = semanas[key]
    return raw === undefined ? null : raw
  }
  return null
}

function round10(value: number): number {
  return Number(value.toFixed(10))
}

function sumExact(values: readonly number[]): number {
  let acc = 0
  for (const v of values) {
    acc += v
  }
  return round10(acc)
}

export function isMatrizBackendVacia(raw: MatrizBiologicaRaw | undefined | null): boolean {
  if (!raw || typeof raw !== 'object') return true
  return Object.keys(raw).length === 0
}

function parsearCeldaNumerica(val: unknown): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'boolean') return Number.NaN
  if (typeof val === 'string') {
    if (val.trim() === '') return Number.NaN
    return Number(val)
  }
  if (typeof val === 'number') return val
  return Number.NaN
}

/**
 * Normaliza una matriz (parcial o `{}` desde el backend) a la grilla completa 7x6.
 * Si un estado no viene en `raw`, se inicializa desde `MATRIZ_INPUTS_DEFAULT`.
 * Dentro de un estado presente, cualquier semana faltante equivale a `null` (Auto / Residual).
 */
export function normalizarMatrizCompleta(
  raw?: MatrizBiologicaRaw | null,
): MatrizBiologicaCompleta {
  const resultado = {} as MatrizBiologicaCompleta

  for (const estado of ESTADOS_BIOLOGICOS_ORDEN) {
    const origen =
      raw && Object.prototype.hasOwnProperty.call(raw, estado)
        ? raw[estado]
        : MATRIZ_INPUTS_DEFAULT[estado]

    const fila = {} as Record<SemanaSixWeekKey, number | null>
    for (const w of SEMANAS_SIXWEEK) {
      const key = String(w) as SemanaSixWeekKey
      const val = leerSemanaRaw(origen, w)
      fila[key] = parsearCeldaNumerica(val)
    }
    resultado[estado] = fila
  }

  return resultado
}

export function createDefaultMatrizCompleta(): MatrizBiologicaCompleta {
  return normalizarMatrizCompleta(MATRIZ_INPUTS_DEFAULT)
}

/**
 * Espejo exacto de `cerrar_matriz` en `backend/dominio/proyecciones.py`.
 * Recorre w = 1..6 secuencialmente; si `val === null`, asigna
 * `Math.max(0, Number((1 - sumaAnteriores).toFixed(10)))`.
 */
export function cerrarMatriz(
  inputs: MatrizBiologicaRaw,
): Record<string, MatrizCerradaRow> {
  const matrizCerrada: Record<string, MatrizCerradaRow> = {}

  for (const [estado, semanas] of Object.entries(inputs)) {
    const valores: Record<SemanaSixWeek, number | null> = {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null,
    }

    for (const w of SEMANAS_SIXWEEK) {
      const rawVal = leerSemanaRaw(semanas, w)
      valores[w] = rawVal === null ? null : Number(rawVal)
    }

    for (const w of SEMANAS_SIXWEEK) {
      if (valores[w] === null) {
        let sumaAnteriores = 0
        for (let s = 1; s < w; s += 1) {
          const prev = valores[s as SemanaSixWeek]
          if (prev !== null) {
            sumaAnteriores += prev
          }
        }
        valores[w] = Math.max(0, round10(1 - sumaAnteriores))
      }
    }

    matrizCerrada[estado] = [
      valores[1] ?? 0,
      valores[2] ?? 0,
      valores[3] ?? 0,
      valores[4] ?? 0,
      valores[5] ?? 0,
      valores[6] ?? 0,
    ]
  }

  return matrizCerrada
}

/**
 * Espejo exacto de `validar_matriz_inputs` en `backend/dominio/proyecciones.py`.
 * - Valores explícitos deben ser finitos en [0, 1] (error bloqueante).
 * - Suma explícita > 1 + 1e-6 (error bloqueante).
 * - Cierre residual > 1 + 1e-6 (error bloqueante, p.ej. explícito tras celda Auto).
 * - Sin celdas `null` y suma < 1 - 1e-6 (advertencia no bloqueante: fuera del corte W1–W6).
 */
export function validarMatriz(inputs: MatrizBiologicaRaw): ReporteValidacionMatriz {
  const reporte: ReporteValidacionMatriz = {}

  for (const [estado, semanas] of Object.entries(inputs)) {
    const valores: number[] = []
    let tieneNones = false
    const errores: string[] = []
    const advertencias: string[] = []

    for (const w of SEMANAS_SIXWEEK) {
      const valor = leerSemanaRaw(semanas, w)
      if (valor === null) {
        tieneNones = true
        continue
      }

      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        errores.push(`W${w}: debe ser un número finito.`)
        continue
      }

      if (valor < 0 || valor > 1) {
        errores.push(`W${w}: fuera del rango [0, 1].`)
        continue
      }

      valores.push(valor)
    }

    const suma = sumExact(valores)
    if (suma > 1 + TOLERANCIA_SUMA_MATRIZ) {
      errores.push(
        `Suma de inputs = ${suma.toFixed(3)} > 1.00 (excede el 100%).`,
      )
    }

    let sumaCierre = suma
    if (errores.length === 0) {
      const cierre = cerrarMatriz({ [estado]: semanas })[estado]
      sumaCierre = sumExact(cierre)
      if (sumaCierre > 1 + TOLERANCIA_SUMA_MATRIZ) {
        errores.push('El cierre residual excede el 100%.')
      }
    }

    if (!tieneNones && suma < 1 - TOLERANCIA_SUMA_MATRIZ) {
      advertencias.push(
        `Suma = ${suma.toFixed(3)} < 1.00 — queda fuera del corte W1–W6.`,
      )
    }

    reporte[estado] = {
      suma: Number(suma.toFixed(6)),
      sumaCierre: Number(sumaCierre.toFixed(6)),
      tieneNones,
      errores,
      advertencias,
    }
  }

  return reporte
}

export interface ResumenValidacionMatriz {
  bloqueado: boolean
  totalErrores: number
  totalAdvertencias: number
  estadosConError: string[]
  estadosConAdvertencia: string[]
}

export function resumirValidacionMatriz(
  reporte: ReporteValidacionMatriz,
): ResumenValidacionMatriz {
  let totalErrores = 0
  let totalAdvertencias = 0
  const estadosConError: string[] = []
  const estadosConAdvertencia: string[] = []

  for (const [estado, info] of Object.entries(reporte)) {
    if (info.errores.length > 0) {
      totalErrores += info.errores.length
      estadosConError.push(estado)
    }
    if (info.advertencias.length > 0) {
      totalAdvertencias += info.advertencias.length
      estadosConAdvertencia.push(estado)
    }
  }

  return {
    bloqueado: totalErrores > 0,
    totalErrores,
    totalAdvertencias,
    estadosConError,
    estadosConAdvertencia,
  }
}

export function areMatricesEqual(
  a: MatrizBiologicaCompleta,
  b: MatrizBiologicaCompleta,
): boolean {
  for (const estado of ESTADOS_BIOLOGICOS_ORDEN) {
    for (const key of SEMANAS_SIXWEEK_KEYS) {
      const va = a[estado][key]
      const vb = b[estado][key]
      if (va === null && vb === null) continue
      if (va === null || vb === null) return false
      if (Math.abs(va - vb) > 1e-9) return false
    }
  }
  return true
}

export function serializeMatrizPayload(
  matriz: MatrizBiologicaCompleta,
): Record<string, Record<string, number | null>> {
  const payload: Record<string, Record<string, number | null>> = {}
  for (const estado of ESTADOS_BIOLOGICOS_ORDEN) {
    const fila: Record<string, number | null> = {}
    for (const key of SEMANAS_SIXWEEK_KEYS) {
      const val = matriz[estado][key]
      fila[key] = val === null ? null : Number(val.toFixed(6))
    }
    payload[estado] = fila
  }
  return payload
}

/** Formatea decimal `0..1` como porcentaje legible (`0.14` -> `"14%"`, `0.165` -> `"16.5%"`). */
export function formatPctDecimal(value: number): string {
  const pct = Number((value * 100).toFixed(2))
  return `${pct}%`
}

/** Convierte porcentaje ingresado en UI (`0..100`) a decimal (`0..1`) con 6 decimales. */
export function pctInputToDecimal(pct: number): number {
  return Number((pct / 100).toFixed(6))
}

/** Convierte decimal (`0..1`) a string editable de porcentaje (`0.14` -> `"14"`). */
export function decimalToPctInputString(decimal: number): string {
  if (!Number.isFinite(decimal)) return ''
  return String(Number((decimal * 100).toFixed(2)))
}
