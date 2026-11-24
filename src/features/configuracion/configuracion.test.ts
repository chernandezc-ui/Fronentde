import { describe, expect, it } from 'vitest'
import {
  ESTADOS_BIOLOGICOS_ORDEN,
  MATRIZ_INPUTS_DEFAULT,
  SEMANAS_SIXWEEK_KEYS,
  areMatricesEqual,
  cerrarMatriz,
  createDefaultMatrizCompleta,
  isMatrizBackendVacia,
  normalizarMatrizCompleta,
  resumirValidacionMatriz,
  serializeMatrizPayload,
  validarMatriz,
} from './matrizUtils'
import {
  PARAMETRO_VALOR_MAX,
  USUARIO_CLAVE_MIN,
  USUARIO_NOMBRE_MIN,
  clasificarGrupoParametro,
  createUsuarioFormSchema,
  createUsuarioSchema,
  parametroValorSchema,
  parseConfiguracionTab,
  toCreateUsuarioPayload,
} from './schemas'

describe('configuracion — matriz biológica Six-Week', () => {
  describe('cerrarMatriz', () => {
    it('calculates exact sequential residual closure for MATRIZ_INPUTS_DEFAULT', () => {
      const cerrada = cerrarMatriz(MATRIZ_INPUTS_DEFAULT)

      expect(cerrada.cosechable).toEqual([1, 0, 0, 0, 0, 0])
      expect(cerrada.maduras).toEqual([1, 0, 0, 0, 0, 0])
      expect(cerrada.cremas).toEqual([1, 0, 0, 0, 0, 0])
      expect(cerrada.fase_2).toEqual([0.14, 0.4, 0.46, 0, 0, 0])
      expect(cerrada.fase_1).toEqual([0, 0, 0.1, 0.6, 0.3, 0])
      expect(cerrada.verdes).toEqual([0, 0, 0, 0, 0.16, 0.17])
      expect(cerrada.pequena).toEqual([0, 0, 0, 0, 0, 0])
    })

    it('closes sequential nulls to 0 once previous weeks reach 1.0', () => {
      const cerrada = cerrarMatriz({
        fase_2: { 1: 0.25, 2: null, 3: null, 4: null, 5: null, 6: null },
      })
      expect(cerrada.fase_2).toEqual([0.25, 0.75, 0, 0, 0, 0])
    })
  })

  describe('validarMatriz', () => {
    it('blocks saving when explicit sum exceeds 100% (critical case: fase_2 {1: 0.8, 2: 0.8})', () => {
      const reporte = validarMatriz({
        fase_2: { 1: 0.8, 2: 0.8 },
      })
      const resumen = resumirValidacionMatriz(reporte)

      expect(reporte.fase_2.suma).toBeCloseTo(1.6, 6)
      expect(reporte.fase_2.errores.length).toBeGreaterThan(0)
      expect(reporte.fase_2.errores[0]).toContain('1.600 > 1.00')
      expect(resumen.bloqueado).toBe(true)
      expect(resumen.estadosConError).toContain('fase_2')
    })

    it('blocks saving when sequential residual closure exceeds 100%', () => {
      const reporte = validarMatriz({
        fase_2: { 1: 0.2, 2: null, 3: 0.3, 4: 0, 5: 0, 6: 0 },
      })
      const resumen = resumirValidacionMatriz(reporte)

      expect(reporte.fase_2.suma).toBeCloseTo(0.5, 6)
      expect(reporte.fase_2.sumaCierre).toBeCloseTo(1.3, 6)
      expect(reporte.fase_2.errores).toContain(
        'El cierre residual excede el 100%.',
      )
      expect(resumen.bloqueado).toBe(true)
    })

    it('blocks saving on values outside [0, 1] or non-finite numbers', () => {
      const reporte = validarMatriz({
        cosechable: { 1: -0.05, 2: 1.25, 3: Number.NaN, 4: 0, 5: 0, 6: 0 },
      })
      const resumen = resumirValidacionMatriz(reporte)

      expect(reporte.cosechable.errores).toEqual([
        'W1: fuera del rango [0, 1].',
        'W2: fuera del rango [0, 1].',
        'W3: debe ser un número finito.',
      ])
      expect(resumen.bloqueado).toBe(true)
    })

    it('emits non-blocking warnings when no null cells exist and sum < 1', () => {
      const reporte = validarMatriz({
        verdes: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0.16, 6: 0.17 },
      })
      const resumen = resumirValidacionMatriz(reporte)

      expect(reporte.verdes.tieneNones).toBe(false)
      expect(reporte.verdes.errores).toEqual([])
      expect(reporte.verdes.advertencias.length).toBe(1)
      expect(reporte.verdes.advertencias[0]).toContain('W1–W6')
      expect(resumen.bloqueado).toBe(false)
      expect(resumen.totalAdvertencias).toBe(1)
    })

    it('validates MATRIZ_INPUTS_DEFAULT with 0 blocking errors and 2 biological warnings', () => {
      const defaults = createDefaultMatrizCompleta()
      const reporte = validarMatriz(defaults)
      const resumen = resumirValidacionMatriz(reporte)

      expect(resumen.bloqueado).toBe(false)
      expect(resumen.totalErrores).toBe(0)
      expect(resumen.estadosConAdvertencia).toEqual(['verdes', 'pequena'])
    })
  })

  describe('normalization & serialization', () => {
    it('detects empty backend payload {} and falls back cleanly to defaults', () => {
      expect(isMatrizBackendVacia({})).toBe(true)
      expect(isMatrizBackendVacia(null)).toBe(true)
      expect(isMatrizBackendVacia({ cosechable: { 1: 1 } })).toBe(false)

      const normalized = normalizarMatrizCompleta({})
      const defaults = createDefaultMatrizCompleta()
      expect(areMatricesEqual(normalized, defaults)).toBe(true)
    })

    it('serializes all 7 states x 6 weeks as 0..1 decimals or null', () => {
      const defaults = createDefaultMatrizCompleta()
      const payload = serializeMatrizPayload(defaults)

      expect(Object.keys(payload)).toEqual([...ESTADOS_BIOLOGICOS_ORDEN])
      for (const estado of ESTADOS_BIOLOGICOS_ORDEN) {
        expect(Object.keys(payload[estado])).toEqual([...SEMANAS_SIXWEEK_KEYS])
      }
      expect(payload.fase_2['1']).toBe(0.14)
      expect(payload.fase_2['2']).toBe(0.4)
      expect(payload.fase_2['3']).toBeNull()
    })
  })
})

describe('configuracion — clasificación de parámetros y tabs', () => {
  it('classifies pipeline parameters into Campaña, Biología / Proyección, Calidad / ETL and General', () => {
    expect(clasificarGrupoParametro('CAMPANA_VIGENTE')).toBe('campana')
    expect(clasificarGrupoParametro('FECHA_INICIO_TEMPORADA')).toBe('campana')

    expect(clasificarGrupoParametro('PROY_SIXWEEK_MATRIZ_INPUTS')).toBe(
      'biologia',
    )
    expect(clasificarGrupoParametro('MARGEN_OPTIMISTA_BAYA')).toBe('biologia')

    expect(clasificarGrupoParametro('UMBRAL_ASERTIVIDAD_MIN')).toBe(
      'calidad_etl',
    )
    expect(clasificarGrupoParametro('ETL_TIMEOUT_SEGUNDOS')).toBe('calidad_etl')
    expect(clasificarGrupoParametro('DQ_MAX_CUARENTENA')).toBe('calidad_etl')

    expect(clasificarGrupoParametro('NOMBRE_ENTORNO')).toBe('general')
    expect(
      clasificarGrupoParametro(
        'PARAM_X',
        'Controla el lote de carga en Silver',
      ),
    ).toBe('calidad_etl')
  })

  it('parses valid ?tab values and defaults unknown values to parametros', () => {
    expect(parseConfiguracionTab('parametros')).toBe('parametros')
    expect(parseConfiguracionTab('biologia')).toBe('biologia')
    expect(parseConfiguracionTab('reglas')).toBe('reglas')
    expect(parseConfiguracionTab('usuarios')).toBe('usuarios')
    expect(parseConfiguracionTab('desconocido')).toBe('parametros')
    expect(parseConfiguracionTab(null)).toBe('parametros')
  })

  it('enforces parameter value length between 1 and 500 characters', () => {
    expect(parametroValorSchema.safeParse('').success).toBe(false)
    expect(parametroValorSchema.safeParse('2026-2027').success).toBe(true)
    expect(
      parametroValorSchema.safeParse('X'.repeat(PARAMETRO_VALOR_MAX + 1))
        .success,
    ).toBe(false)
  })
})

describe('configuracion — Zod schemas de creación de usuario', () => {
  it('accepts valid user form values and converts blank email to null payload', () => {
    const parsed = createUsuarioFormSchema.safeParse({
      nombre_usuario: '  m.rodriguez  ',
      nombre_display: '  María Rodríguez  ',
      email: '   ',
      clave: 'Password123!',
      confirmar_clave: 'Password123!',
      rol: 'analista_mdm',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(toCreateUsuarioPayload(parsed.data)).toEqual({
        nombre_usuario: 'm.rodriguez',
        nombre_display: 'María Rodríguez',
        email: null,
        clave: 'Password123!',
        rol: 'analista_mdm',
      })
    }
  })

  it('accepts valid email and preserves it in payload', () => {
    const parsed = createUsuarioSchema.parse({
      nombre_usuario: 'operador01',
      nombre_display: 'Operador ETL',
      email: 'operador@acp.com.pe',
      clave: 'ClaveSegura99',
      rol: 'operador_etl',
    })
    expect(toCreateUsuarioPayload(parsed).email).toBe('operador@acp.com.pe')
  })

  it('rejects username shorter than 3 chars or containing spaces', () => {
    expect(
      createUsuarioSchema.safeParse({
        nombre_usuario: 'ab'.slice(0, USUARIO_NOMBRE_MIN - 1),
        nombre_display: 'Ana',
        email: '',
        clave: 'Password123!',
        rol: 'viewer',
      }).success,
    ).toBe(false)

    expect(
      createUsuarioSchema.safeParse({
        nombre_usuario: 'juan perez',
        nombre_display: 'Juan Pérez',
        email: '',
        clave: 'Password123!',
        rol: 'viewer',
      }).success,
    ).toBe(false)
  })

  it('rejects password shorter than 8 chars or mismatched confirmation', () => {
    expect(
      createUsuarioFormSchema.safeParse({
        nombre_usuario: 'j.silva',
        nombre_display: 'Jorge Silva',
        email: '',
        clave: 'a'.repeat(USUARIO_CLAVE_MIN - 1),
        confirmar_clave: 'a'.repeat(USUARIO_CLAVE_MIN - 1),
        rol: 'viewer',
      }).success,
    ).toBe(false)

    const mismatch = createUsuarioFormSchema.safeParse({
      nombre_usuario: 'j.silva',
      nombre_display: 'Jorge Silva',
      email: '',
      clave: 'Password123!',
      confirmar_clave: 'OtraClave123!',
      rol: 'viewer',
    })
    expect(mismatch.success).toBe(false)
  })

  it('rejects invalid email and unsupported roles', () => {
    expect(
      createUsuarioSchema.safeParse({
        nombre_usuario: 'admin2',
        nombre_display: 'Admin Secundario',
        email: 'correo-invalido',
        clave: 'Password123!',
        rol: 'admin',
      }).success,
    ).toBe(false)

    expect(
      createUsuarioSchema.safeParse({
        nombre_usuario: 'admin2',
        nombre_display: 'Admin Secundario',
        email: '',
        clave: 'Password123!',
        rol: 'superadmin',
      }).success,
    ).toBe(false)
  })
})
