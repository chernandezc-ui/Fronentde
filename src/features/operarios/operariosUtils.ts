import type {
  AsertividadClasificacion,
  CuarentenaIncidencia,
  OperarioIncidenciaMatch,
  OperarioPersonal,
  OperariosKpiSummary,
} from './types'

export const ASERTIVIDAD_OK_MIN = 90
export const ASERTIVIDAD_WARNING_MIN = 75
export const ASERTIVIDAD_ALERT_THRESHOLD = 85

const PERSONAL_COLUMN_PATTERN =
  /dni|personal|operario|trabajador|evaluador|responsable|planilla|empleado|documento|colaborador/i

function stripAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normaliza un DNI / documento eliminando espacios, guiones y puntos.
 * Mantiene ceros iniciales en la forma canónica; usa `getDniVariants` para cruce tolerante.
 */
export function normalizeDni(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim().toUpperCase().replace(/[\s.-]+/g, '')
}

/**
 * Retorna variantes seguras de un DNI para cruzar con valores crudos en cuarentena
 * (ej. Excel a veces quita el cero inicial de un DNI peruano de 8 dígitos: "07451234" ↔ "7451234").
 */
export function getDniVariants(dni: string | null | undefined): string[] {
  const norm = normalizeDni(dni)
  if (norm.length < 6) return []

  const variants = new Set<string>([norm])
  if (/^\d{7,8}$/.test(norm)) {
    const withoutLeadingZeros = norm.replace(/^0+/, '')
    if (withoutLeadingZeros.length >= 6) {
      variants.add(withoutLeadingZeros)
    }
    if (norm.length === 7) {
      variants.add(`0${norm}`)
    }
  }
  return Array.from(variants)
}

export function isPersonalRelatedColumn(
  columnaOrigen: string | null | undefined,
): boolean {
  if (!columnaOrigen) return false
  return PERSONAL_COLUMN_PATTERN.test(columnaOrigen)
}

/**
 * Clasifica `pct_asertividad` distinguiendo estrictamente `null` / `undefined` ("Sin medición")
 * de una medición real de `0%`.
 *
 * Reglas semánticas:
 * - `null` / `undefined` / `NaN` → `sin_medicion` (`neutral`, `isAlert: false`)
 * - `>= 90` → `ok` (`isAlert: false`)
 * - `75..89.999` → `warning` (`isAlert: pct < 85`)
 * - `< 75` (incluye `0`) → `error` (`isAlert: true`)
 */
export function classifyAsertividad(
  pct: number | null | undefined,
): AsertividadClasificacion {
  if (pct === null || pct === undefined || typeof pct !== 'number' || !Number.isFinite(pct)) {
    return {
      nivel: 'sin_medicion',
      tone: 'neutral',
      label: 'Sin medición',
      formattedPct: 'Sin medición',
      progressValue: null,
      isAlert: false,
    }
  }

  const clampedProgress = Math.max(0, Math.min(100, pct))
  const formattedPct = `${pct.toFixed(1)}%`

  if (pct >= ASERTIVIDAD_OK_MIN) {
    return {
      nivel: 'ok',
      tone: 'ok',
      label: 'Óptima',
      formattedPct,
      progressValue: clampedProgress,
      isAlert: false,
    }
  }

  if (pct >= ASERTIVIDAD_WARNING_MIN) {
    return {
      nivel: 'warning',
      tone: 'warning',
      label: pct < ASERTIVIDAD_ALERT_THRESHOLD ? 'Alerta (<85%)' : 'Atención',
      formattedPct,
      progressValue: clampedProgress,
      isAlert: pct < ASERTIVIDAD_ALERT_THRESHOLD,
    }
  }

  return {
    nivel: 'error',
    tone: 'error',
    label: 'Crítica',
    formattedPct,
    progressValue: clampedProgress,
    isAlert: true,
  }
}

export function isAlertAsertividad(pct: number | null | undefined): boolean {
  return classifyAsertividad(pct).isAlert
}

/**
 * Calcula los 4 KPIs sobre los registros cargados sin contaminar promedios ni alertas con `null`.
 */
export function computeOperariosKpis(
  rows: OperarioPersonal[],
  totalPadron: number,
): OperariosKpiSummary {
  let conMedicion = 0
  let sinMedicion = 0
  let sumaAsertividad = 0
  let bajo85 = 0
  let diasAusentismoAcumulados = 0
  let conAusentismoRegistrado = 0

  for (const row of rows) {
    const pct = row.pct_asertividad
    if (pct === null || pct === undefined || typeof pct !== 'number' || !Number.isFinite(pct)) {
      sinMedicion += 1
    } else {
      conMedicion += 1
      sumaAsertividad += pct
      if (pct < ASERTIVIDAD_ALERT_THRESHOLD) {
        bajo85 += 1
      }
    }

    if (
      row.dias_ausentismo !== null &&
      row.dias_ausentismo !== undefined &&
      typeof row.dias_ausentismo === 'number' &&
      Number.isFinite(row.dias_ausentismo)
    ) {
      diasAusentismoAcumulados += row.dias_ausentismo
      conAusentismoRegistrado += 1
    }
  }

  return {
    totalPadron,
    enPagina: rows.length,
    conMedicion,
    sinMedicion,
    promedioAsertividad:
      conMedicion > 0 ? sumaAsertividad / conMedicion : null,
    bajo85,
    diasAusentismoAcumulados,
    conAusentismoRegistrado,
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsToken(haystack: string, token: string): boolean {
  if (!haystack || !token) return false
  const regex = new RegExp(`(^|[^A-Z0-9])${escapeRegExp(token)}([^A-Z0-9]|$)`)
  return regex.test(haystack)
}

/**
 * Cruce local honesto (Etapa 1) entre un operario de Silver.Dim_Personal y la muestra
 * obtenida de GET /api/v1/cuarentena?pagina=1&tamano=200&estado_filtro=all.
 *
 * Prioridad de coincidencia:
 * 1. DNI normalizado (exacto o tolerante al cero inicial en DNIs de 7–8 dígitos)
 * 2. ID Planilla (en columnas de personal o coincidencia exacta en valor_raw)
 * 3. Nombre completo (insensible a acentos/mayúsculas, en columnas de personal o coincidencia en valor_raw)
 */
export function matchOperarioIncidencias(
  operario: OperarioPersonal,
  cuarentenaRows: CuarentenaIncidencia[],
): OperarioIncidenciaMatch[] {
  const dniVariants = getDniVariants(operario.dni)
  const planillaNorm = normalizeDni(operario.id_planilla)
  const nombreNorm = operario.nombre_completo
    ? stripAccents(operario.nombre_completo).trim().toLowerCase().replace(/\s+/g, ' ')
    : ''
  const nombreTokens = nombreNorm
    .split(' ')
    .filter((part) => part.length >= 3)

  const matches: OperarioIncidenciaMatch[] = []

  for (const row of cuarentenaRows) {
    const isPersonalCol = isPersonalRelatedColumn(row.columna_origen)
    const rawNormUpper = normalizeDni(row.valor_raw)
    const correctedNormUpper = normalizeDni(row.valor_corregido)
    const idNormUpper = normalizeDni(row.id_registro)
    const motivoUpper = (row.motivo ?? '').toUpperCase()
    const rawUpper = (row.valor_raw ?? '').toUpperCase()
    const correctedUpper = (row.valor_corregido ?? '').toUpperCase()

    // 1. Coincidencia por DNI
    if (dniVariants.length > 0) {
      const matchedByDni = dniVariants.some(
        (variant) =>
          rawNormUpper === variant ||
          correctedNormUpper === variant ||
          idNormUpper === variant ||
          containsToken(rawUpper, variant) ||
          containsToken(correctedUpper, variant) ||
          containsToken(motivoUpper, variant),
      )

      if (matchedByDni) {
        matches.push({
          incidencia: row,
          matchReason: 'dni',
          matchLabel: isPersonalCol
            ? 'Coincidencia por DNI (columna de personal)'
            : 'Coincidencia por DNI',
          isPersonalColumn: isPersonalCol,
        })
        continue
      }
    }

    // 2. Coincidencia por ID Planilla (mínimo 4 caracteres para evitar falsos positivos)
    if (planillaNorm.length >= 4) {
      const matchedByPlanilla =
        rawNormUpper === planillaNorm ||
        correctedNormUpper === planillaNorm ||
        (isPersonalCol &&
          (containsToken(rawUpper, planillaNorm) ||
            containsToken(idNormUpper, planillaNorm)))

      if (matchedByPlanilla) {
        matches.push({
          incidencia: row,
          matchReason: 'planilla',
          matchLabel: 'Coincidencia por ID Planilla',
          isPersonalColumn: isPersonalCol,
        })
        continue
      }
    }

    // 3. Coincidencia por nombre completo (accent-insensitive)
    if (nombreNorm.length >= 6) {
      const rawName = stripAccents(row.valor_raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
      const correctedName = stripAccents(row.valor_corregido ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')

      const exactNameMatch =
        rawName === nombreNorm ||
        correctedName === nombreNorm ||
        (rawName.length >= 6 && rawName.includes(nombreNorm)) ||
        (correctedName.length >= 6 && correctedName.includes(nombreNorm))

      const tokenNameMatch =
        isPersonalCol &&
        nombreTokens.length >= 2 &&
        nombreTokens.every((token) => rawName.includes(token))

      if (exactNameMatch || tokenNameMatch) {
        matches.push({
          incidencia: row,
          matchReason: 'nombre',
          matchLabel: 'Coincidencia por nombre',
          isPersonalColumn: isPersonalCol,
        })
      }
    }
  }

  return matches
}

export function countPersonalColumnIncidencias(
  cuarentenaRows: CuarentenaIncidencia[],
): number {
  return cuarentenaRows.filter((row) =>
    isPersonalRelatedColumn(row.columna_origen),
  ).length
}

export function formatSexoLabel(sexo: string | null | undefined): string {
  if (!sexo) return 'No registrado'
  const norm = sexo.trim().toUpperCase()
  if (norm === 'M' || norm === 'MASCULINO') return 'Masculino (M)'
  if (norm === 'F' || norm === 'FEMENINO') return 'Femenino (F)'
  return sexo.trim()
}
