import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '@/shared/api/client'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import {
  cerrarMatriz,
  normalizarMatrizCompleta,
  validarMatriz,
} from '@/features/configuracion/matrizUtils'
import {
  buildRechazarPath,
  buildResolverPath,
  parseCuarentenaSearchParams,
  rechazarCuarentenaSchema,
  resolverCuarentenaSchema,
} from '@/features/cuarentena/cuarentenaUtils'
import {
  buildGeografiaQueryParams,
  createVarietyFormSchema,
} from '@/features/maestros/schemas'
import {
  classifyAsertividad,
  computeOperariosKpis,
  matchOperarioIncidencias,
} from '@/features/operarios/operariosUtils'
import {
  buildBitacoraQueryString,
  isValidTableName,
  validateCsvFile,
} from '@/features/auditoria/auditoriaUtils'
import type { CuarentenaIncidencia, OperarioPersonal } from '@/features/operarios/types'

describe('Chaos & Adversarial Resilience — Unit Fuzz Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().logout()
  })

  describe('1. matrizUtils — valores hostiles, IEEE-754 y tipos corruptos', () => {
    it('rechaza booleanos y strings vacíos en celdas de matriz igual que dominio/proyecciones.py', () => {
      // El backend Python rechaza `bool` explícitamente porque isinstance(True, int) es True.
      // Si el frontend hace Number(true) -> 1 o Number("") -> 0, acepta silenciosamente basura.
      const hostileRaw = {
        cosechable: { '1': true as unknown as number, '2': '' as unknown as number },
      }
      const normalized = normalizarMatrizCompleta(hostileRaw)
      const report = validarMatriz(normalized)
      expect(
        report.cosechable.errores.length,
        'DEBILIDAD: normalizarMatrizCompleta convirtió boolean/"" en números válidos (1 y 0)',
      ).toBeGreaterThan(0)
    })

    it('detecta NaN, Infinity, -Infinity y negativos microscópicos (-1e-9)', () => {
      const report = validarMatriz({
        fase_2: { '1': Number.NaN, '2': Number.POSITIVE_INFINITY, '3': -1e-9 },
      })
      expect(report.fase_2.errores.length).toBeGreaterThanOrEqual(3)
    })

    it('detecta suma > 100% por encima de tolerancia (1.00001) y permite 0.1+0.2+0.7 exacto', () => {
      const ok = validarMatriz({
        fase_1: { '1': 0.1, '2': 0.2, '3': 0.7, '4': 0, '5': 0, '6': 0 },
      })
      expect(ok.fase_1.errores).toHaveLength(0)

      const over = validarMatriz({
        fase_1: { '1': 0.5, '2': 0.50001, '3': 0, '4': 0, '5': 0, '6': 0 },
      })
      expect(over.fase_1.errores.length).toBeGreaterThan(0)
    })

    it('no falla ni contamina Object.prototype con claves __proto__ / constructor', () => {
      const poisoned = JSON.parse('{"__proto__":{"polluted":true},"cosechable":{"1":0.5}}')
      const normalized = normalizarMatrizCompleta(poisoned)
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      expect(Object.keys(normalized)).toHaveLength(7)
      const closed = cerrarMatriz(normalized)
      expect(closed.cosechable.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    })
  })

  describe('2. apiRequest — respuestas corruptas, 502 HTML, 401 y errores 422 FastAPI', () => {
    it('maneja 502 Bad Gateway con cuerpo HTML (proxy nginx/IIS) sin romper JSON.parse', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html', 'X-Request-ID': 'req-502-html' },
        }),
      )
      await expect(apiRequest('/api/v1/etl/resumen')).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        requestId: 'req-502-html',
      })
    })

    it('maneja 200 OK con Content-Type JSON pero cuerpo JSON truncado/corrupto', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{"total": 5, "datos": [', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      // Si el backend/proxy corta el JSON en un 200, devolver `null` silenciosamente
      // hace explotar componentes que esperan un objeto/array.
      const result = await apiRequest('/api/v1/cuarentena').catch((err) => err)
      expect(
        result instanceof Error,
        'DEBILIDAD: apiRequest devuelve null silenciosamente en HTTP 200 con JSON truncado en vez de lanzar ApiError',
      ).toBe(true)
    })

    it('cierra sesión automáticamente ante HTTP 401 y extrae detail array de FastAPI 422', async () => {
      useAuthStore.getState().setSession('tok-valid', {
        nombre_usuario: 'u1',
        nombre_display: 'U1',
        rol: 'admin',
        email: null,
      })

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Token expirado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError)
      expect(useAuthStore.getState().token).toBeNull()

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: [{ loc: ['body', 'valor'], msg: 'Field required' }] }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      )

      await expect(apiRequest('/api/v1/config/parametros/x', { skipAuth: true })).rejects.toMatchObject({
        status: 422,
        detail: 'Field required',
      })
    })
  })

  describe('3. RBAC, Cuarentena, Maestros, Operarios y Auditoría — entradas hostiles', () => {
    it('rechaza roles manipulados o desconocidos en rolCumpleNivel', () => {
      expect(rolCumpleNivel('superadmin', 'viewer')).toBe(false)
      expect(rolCumpleNivel('__proto__', 'viewer')).toBe(false)
      expect(rolCumpleNivel('constructor', 'viewer')).toBe(false)
      expect(rolCumpleNivel('', 'viewer')).toBe(false)
      expect(rolCumpleNivel(undefined, 'viewer')).toBe(false)
    })

    it('codifica path traversal y metacaracteres en rutas de cuarentena', () => {
      const path = buildResolverPath('../../Bronce/Tabla?a=1#frag', 'id/with space&%20')
      expect(path).not.toContain('../../')
      expect(path).toContain(encodeURIComponent('../../Bronce/Tabla?a=1#frag'))
      expect(buildRechazarPath('Bronce.X', '../99')).toContain(encodeURIComponent('../99'))
    })

    it('bloquea payloads vacíos o excedidos en schemas de cuarentena y variedades', () => {
      expect(resolverCuarentenaSchema.safeParse({ valor_canonico: '   ', comentario: '' }).success).toBe(false)
      expect(resolverCuarentenaSchema.safeParse({ valor_canonico: 'x'.repeat(201), comentario: '' }).success).toBe(false)
      expect(rechazarCuarentenaSchema.safeParse({ motivo: '\n\t  ' }).success).toBe(false)
      expect(createVarietyFormSchema.safeParse({ nombre_variedad: ' ', breeder: '' }).success).toBe(false)
    })

    it('resiste parámetros URL maliciosos en cuarentena y geografía', () => {
      const q = parseCuarentenaSearchParams(
        new URLSearchParams('pagina=-999&tamano=999999&estado=DROP TABLE&tabla=  abc  '),
      )
      expect(q.pagina).toBe(1)
      expect(q.tamano).toBe(20)
      expect(q.estado).toBe('PENDIENTE')

      const geo = buildGeografiaQueryParams({
        pagina: Number.POSITIVE_INFINITY,
        tamano: 1000000,
        texto: 'A'.repeat(500),
      })
      expect(geo.pagina).toBe(1)
      expect(geo.tamano).toBe(200)
      expect(geo.texto?.length).toBe(80)
    })

    it('operariosUtils maneja Infinity, negativos y metacaracteres regex sin explotar', () => {
      expect(classifyAsertividad(Number.POSITIVE_INFINITY).nivel).not.toBe('ok')
      expect(classifyAsertividad(-50).progressValue).toBe(0)

      const op: OperarioPersonal = {
        dni: '07451234',
        nombre_completo: 'Juan (Test) [C++] .*+?^${}|\\',
        rol: 'Evaluador',
        sexo: 'M',
        id_planilla: 'PL(1)+*',
        pct_asertividad: Number.POSITIVE_INFINITY,
        dias_ausentismo: -3,
      }
      const inc: CuarentenaIncidencia[] = [
        {
          tabla_origen: 'Bronce.Tareo',
          id_registro: '1',
          columna_origen: 'DNI_Operario',
          valor_raw: '7451234',
          nombre_archivo: null,
          fecha_ingreso: null,
          estado: 'PENDIENTE',
          motivo: 'Error (test) [1]',
          valor_corregido: null,
          id_registro_origen: 1,
        },
      ]
      expect(() => matchOperarioIncidencias(op, inc)).not.toThrow()
      const kpis = computeOperariosKpis([op], 1)
      expect(
        kpis.promedioAsertividad === null || Number.isFinite(kpis.promedioAsertividad),
        'DEBILIDAD: computeOperariosKpis dejó pasar Infinity en promedioAsertividad',
      ).toBe(true)
    })

    it('auditoriaUtils bloquea SQL injection en tabla de exportación y archivos falsos .csv.exe', () => {
      expect(isValidTableName('Silver.Fact; DROP TABLE Users;--')).toBe(false)
      expect(isValidTableName('../Seguridad.Usuarios')).toBe(false)
      expect(isValidTableName('')).toBe(false)

      const fakeExe = new File(['a,b\n1,2'], 'malicious.csv.exe', { type: 'text/csv' })
      expect(validateCsvFile(fakeExe).valid).toBe(false)

      const hugeFile = { name: 'giant.csv', size: 30 * 1024 * 1024 } as File
      expect(validateCsvFile(hugeFile).valid).toBe(false)

      const qs = buildBitacoraQueryString({
        pagina: -5,
        tamano: 99999,
        estados: ['OK', 'INVALID' as never, 'ERROR', 'OK'],
        desde: 'not-a-date',
        hasta: '2026-11-23T10:00',
      })
      expect(qs).toContain('pagina=1')
      expect(qs).toContain('tamano=200')
      expect(qs).not.toContain('INVALID')
      expect(qs).not.toContain('desde=')
    })
  })
})
