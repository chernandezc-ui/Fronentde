import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/shared/auth/authStore'
import {
  downloadTableCsv,
  fetchBitacora,
  fetchBitacoraResumen,
  fetchLogDetail,
  validateCsvFileApi,
} from './auditoriaApi'
import {
  buildAccesosPath,
  buildBitacoraPath,
  buildExportCsvPath,
  buildBitacoraQueryString,
  clampBitacoraPagina,
  clampBitacoraTamano,
  DEFAULT_BITACORA_FILTERS,
  extractCatalogTables,
  isDateRangeInverted,
  isValidTableName,
  MAX_CSV_FILE_BYTES,
  MAX_EXCEL_FILE_BYTES,
  parseAuditoriaTab,
  parseBitacoraSearchParams,
  parseContentDispositionFilename,
  serializeAuditoriaSearchParams,
  toDateTimeLocalInputValue,
  toIsoDateTimeParam,
  validateCsvFile,
  validateExcelFile,
} from './auditoriaUtils'

describe('auditoriaUtils — querystring multi-estado, clamping y fechas', () => {
  it('construye querystring con múltiples estados repetidos y tamano clamped <= 200', () => {
    const qs = buildBitacoraQueryString({
      pagina: 2,
      tamano: 500,
      estados: ['OK', 'ERROR', 'ok', 'ESTADO_INVALIDO'],
      tabla_destino: '  Silver.Fact_Cosecha  ',
      id_corrida: '  123e4567-e89b-12d3-a456-426614174000  ',
    })

    const parsed = new URLSearchParams(qs)
    expect(parsed.get('pagina')).toBe('2')
    expect(parsed.get('tamano')).toBe('200')
    expect(parsed.getAll('estado')).toEqual(['OK', 'ERROR'])
    expect(parsed.get('tabla_destino')).toBe('Silver.Fact_Cosecha')
    expect(parsed.get('id_corrida')).toBe('123e4567-e89b-12d3-a456-426614174000')
    expect(qs).toContain('estado=OK&estado=ERROR')
    expect(qs).toContain('tamano=200')
  })

  it('aplica clamping seguro en pagina (>= 1) y tamano (1..200)', () => {
    expect(clampBitacoraTamano(undefined)).toBe(50)
    expect(clampBitacoraTamano(Number.NaN)).toBe(50)
    expect(clampBitacoraTamano(0)).toBe(1)
    expect(clampBitacoraTamano(-25)).toBe(1)
    expect(clampBitacoraTamano(25)).toBe(25)
    expect(clampBitacoraTamano(200)).toBe(200)
    expect(clampBitacoraTamano(201)).toBe(200)
    expect(clampBitacoraTamano(9999)).toBe(200)

    expect(clampBitacoraPagina(undefined)).toBe(1)
    expect(clampBitacoraPagina(0)).toBe(1)
    expect(clampBitacoraPagina(-3)).toBe(1)
    expect(clampBitacoraPagina(4.9)).toBe(4)
  })

  it('convierte fechas desde/hasta desde datetime-local e ISO 8601 limpiamente', () => {
    const localInput = '2026-11-22T08:30'
    const iso = toIsoDateTimeParam(localInput)
    expect(iso).not.toBeNull()
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(toDateTimeLocalInputValue(iso)).toBe(localInput)

    expect(toIsoDateTimeParam('2026-11-22T15:00:00Z')).toBe('2026-11-22T15:00:00.000Z')
    expect(toIsoDateTimeParam('')).toBeNull()
    expect(toIsoDateTimeParam('   ')).toBeNull()
    expect(toIsoDateTimeParam('fecha-invalida')).toBeNull()

    const path = buildBitacoraPath({
      pagina: 1,
      tamano: 50,
      desde: '2026-11-01T00:00:00Z',
      hasta: '2026-11-22T23:59:59Z',
    })
    const url = new URL(`http://localhost${path}`)
    expect(url.pathname).toBe('/api/v1/auditoria/bitacora')
    expect(url.searchParams.get('desde')).toBe('2026-11-01T00:00:00.000Z')
    expect(url.searchParams.get('hasta')).toBe('2026-11-22T23:59:59.000Z')
  })

  it('detecta correctamente rangos de fecha invertidos', () => {
    expect(isDateRangeInverted('2026-11-22T10:00:00Z', '2026-11-21T10:00:00Z')).toBe(true)
    expect(isDateRangeInverted('2026-11-21T10:00:00Z', '2026-11-22T10:00:00Z')).toBe(false)
    expect(isDateRangeInverted('2026-11-21T10:00:00Z', '')).toBe(false)
  })

  it('serializa y parsea URL search params con round-trip exacto (tab, multi-estado, ventana)', () => {
    const filters = {
      pagina: 3,
      tamano: 100,
      estados: ['ERROR', 'TIMEOUT'] as const,
      tabla_destino: 'Silver.Fact_Tareo',
      desde: '2026-11-10T00:00:00.000Z',
      hasta: '2026-11-22T23:59:00.000Z',
      id_corrida: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      ventana_dias: 30 as const,
    }

    const serialized = serializeAuditoriaSearchParams('bitacora', {
      ...filters,
      estados: [...filters.estados],
    })
    expect(parseAuditoriaTab(serialized)).toBe('bitacora')
    expect(serialized.getAll('estado')).toEqual(['ERROR', 'TIMEOUT'])
    expect(parseBitacoraSearchParams(serialized)).toEqual({
      ...filters,
      estados: [...filters.estados],
    })

    const ingestaParams = serializeAuditoriaSearchParams('ingesta', DEFAULT_BITACORA_FILTERS)
    expect(parseAuditoriaTab(ingestaParams)).toBe('ingesta')
    expect(parseBitacoraSearchParams(new URLSearchParams())).toEqual(DEFAULT_BITACORA_FILTERS)
  })
})

describe('auditoriaUtils — validación de nombres de tabla y archivos .csv', () => {
  it('acepta solo nombres de tabla válidos bajo ^[a-zA-Z0-9_.]+$', () => {
    expect(isValidTableName('Silver.Fact_Cosecha')).toBe(true)
    expect(isValidTableName('Bronce.Peladas')).toBe(true)
    expect(isValidTableName('Gold.Mart_Finanzas_2026')).toBe(true)
    expect(isValidTableName('  Silver.Dim_Personal  ')).toBe(true)

    expect(isValidTableName('')).toBe(false)
    expect(isValidTableName('   ')).toBe(false)
    expect(isValidTableName('Silver.Fact Cosecha')).toBe(false)
    expect(isValidTableName('Silver.Fact;DROP TABLE Users')).toBe(false)
    expect(isValidTableName('Silver/Fact_Cosecha')).toBe(false)
    expect(isValidTableName('Silver.Fact-1')).toBe(false)
    expect(isValidTableName('A'.repeat(121))).toBe(false)
  })

  it('valida extensión .csv (case-insensitive) y tamaño razonable antes de subir', () => {
    expect(validateCsvFile({ name: 'proyecciones.csv', size: 1024 })).toEqual({
      valid: true,
      error: null,
    })
    expect(validateCsvFile({ name: 'REPORTE_2026.CSV', size: 512 })).toEqual({
      valid: true,
      error: null,
    })

    expect(validateCsvFile(null).valid).toBe(false)
    expect(validateCsvFile({ name: 'layout_bronce.xlsx', size: 4096 }).valid).toBe(false)
    expect(validateCsvFile({ name: 'datos.xls', size: 4096 }).valid).toBe(false)
    expect(validateCsvFile({ name: 'notas.txt', size: 120 }).valid).toBe(false)
    expect(validateCsvFile({ name: 'vacio.csv', size: 0 }).valid).toBe(false)
    expect(
      validateCsvFile({ name: 'enorme.csv', size: MAX_CSV_FILE_BYTES + 1 }).valid,
    ).toBe(false)
  })

  it('extrae correctamente filename de Content-Disposition y catálogo ETL sin duplicados', () => {
    expect(
      parseContentDispositionFilename(
        'attachment; filename=Silver.Fact_Cosecha_export.csv',
        'fallback.csv',
      ),
    ).toBe('Silver.Fact_Cosecha_export.csv')
    expect(
      parseContentDispositionFilename(
        'attachment; filename="Bronce.Peladas_export.csv"',
        'fallback.csv',
      ),
    ).toBe('Bronce.Peladas_export.csv')
    expect(
      parseContentDispositionFilename(
        "attachment; filename*=UTF-8''Reporte%20Exportado.csv",
        'fallback.csv',
      ),
    ).toBe('Reporte Exportado.csv')
    expect(parseContentDispositionFilename(null, 'fallback.csv')).toBe('fallback.csv')

    const tables = extractCatalogTables([
      {
        nombre_fact: 'cosecha',
        orden: 1,
        tabla_destino: 'Silver.Fact_Cosecha',
        fuentes_bronce: ['Bronce.Reporte_Cosecha', 'Bronce.Peladas'],
        dependencias: [],
        marts: ['Gold.Mart_Cosecha'],
        releer_bronce_por_estado: true,
        estrategia_rerun: 'COMPLETA',
      },
      {
        nombre_fact: 'peladas',
        orden: 2,
        tabla_destino: 'Silver.Fact_Peladas',
        fuentes_bronce: ['bronce.peladas'],
        dependencias: [],
        marts: ['Gold.Mart_Cosecha'],
        releer_bronce_por_estado: true,
        estrategia_rerun: 'COMPLETA',
      },
    ])

    expect(tables.map((t) => `${t.capa}:${t.nombre}`)).toEqual([
      'Silver:Silver.Fact_Cosecha',
      'Silver:Silver.Fact_Peladas',
      'Bronce:Bronce.Reporte_Cosecha',
      'Bronce:Bronce.Peladas',
      'Gold:Gold.Mart_Cosecha',
    ])

    expect(buildExportCsvPath('Silver.Fact_Cosecha')).toBe(
      '/api/v1/ingesta/descargar/Silver.Fact_Cosecha',
    )
  })
})

describe('auditoriaApi — contratos HTTP en runtime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().logout()
  })

  it('envía multi-estado en GET /api/v1/auditoria/bitacora y consulta resumen/detalle', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes('/bitacora/resumen')) {
        return new Response(
          JSON.stringify({
            ventana_dias: 7,
            total: 10,
            ok: 9,
            errores: 1,
            en_proceso: 0,
            filas_ok: 1200,
            filas_rechazadas: 4,
            tasa_exito_pct: 90,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      if (input.includes('/bitacora/42')) {
        return new Response(
          JSON.stringify({
            id_log: 42,
            nombre_proceso: 'etl_cosecha',
            tabla_destino: 'Silver.Fact_Cosecha',
            nombre_archivo: null,
            fecha_inicio: '2026-11-22T10:00:00Z',
            fecha_fin: '2026-11-22T10:01:00Z',
            estado: 'ERROR',
            filas_insertadas: 0,
            filas_rechazadas: 0,
            duracion_segundos: 60,
            mensaje_error: 'Traceback completo sin truncar',
            id_corrida: null,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ items: [], total: 0, pagina: 1, tamano: 200 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchBitacora({
      pagina: 1,
      tamano: 300,
      estados: ['OK', 'ERROR'],
      tabla_destino: 'Silver.Fact',
    })
    await fetchBitacoraResumen(7)
    const detail = await fetchLogDetail(42)

    const listUrl = new URL((fetchMock.mock.calls[0] as [string])[0])
    expect(listUrl.pathname).toBe('/api/v1/auditoria/bitacora')
    expect(listUrl.searchParams.getAll('estado')).toEqual(['OK', 'ERROR'])
    expect(listUrl.searchParams.get('tamano')).toBe('200')
    expect(listUrl.searchParams.get('tabla_destino')).toBe('Silver.Fact')

    const resumenUrl = new URL((fetchMock.mock.calls[1] as [string])[0])
    expect(resumenUrl.pathname).toBe('/api/v1/auditoria/bitacora/resumen')
    expect(resumenUrl.searchParams.get('ventana_dias')).toBe('7')

    expect(detail.mensaje_error).toBe('Traceback completo sin truncar')
  })

  it('envía FormData en POST /api/v1/ingesta/validar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          valido: true,
          total_filas: 2,
          columnas: ['Monto'],
          filas_validas: [{ fila_id: 1, datos: { Monto: 100 } }],
          filas_con_errores: [
            { fila_id: 2, datos: { Monto: -5 }, errores: ['El campo Monto no puede ser negativo.'] },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const csvFile = new File(['Monto\n100\n-5\n'], 'proyecciones.csv', { type: 'text/csv' })
    const res = await validateCsvFileApi(csvFile, 'Silver.Fact_Proyecciones')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/ingesta/validar')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    const formData = init.body as FormData
    expect(formData.get('tabla_destino')).toBe('Silver.Fact_Proyecciones')
    expect(formData.get('archivo')).toBeInstanceOf(File)
    expect(res.filas_con_errores).toHaveLength(1)
  })

  it('descarga CSV con Bearer token, respeta Content-Disposition y mapea HTTP 403/401 a ApiError', async () => {
    useAuthStore.getState().setSession('tok-secret-123', {
      nombre_usuario: 'analista1',
      nombre_display: 'Analista MDM',
      rol: 'analista_mdm',
      email: null,
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('col1,col2\n1,2\n', {
          status: 200,
          headers: {
            'content-type': 'text/csv',
            'Content-Disposition': 'attachment; filename=Silver.Fact_Cosecha_export.csv',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'La tabla no está disponible para exportación.' }), {
          status: 403,
          headers: {
            'content-type': 'application/json',
            'X-Request-ID': 'req-403-xyz',
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Token expirado' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-csv-url')
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const ok = await downloadTableCsv('Silver.Fact_Cosecha')
    expect(ok.filename).toBe('Silver.Fact_Cosecha_export.csv')
    expect(ok.sizeBytes).toBeGreaterThan(0)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toBeDefined()

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(firstUrl).toContain('/api/v1/ingesta/descargar/Silver.Fact_Cosecha')
    expect(new Headers(firstInit.headers).get('Authorization')).toBe('Bearer tok-secret-123')

    await expect(downloadTableCsv('Seguridad.Usuarios')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      requestId: 'req-403-xyz',
    } satisfies Partial<ApiError>)

    await expect(downloadTableCsv('Silver.Fact_Cosecha')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('valida libros .xlsx de ingesta Excel y parsea tab accesos en URL', () => {
    expect(validateExcelFile({ name: 'cosecha_sem47.xlsx', size: 10240 }).valid).toBe(true)
    expect(validateExcelFile({ name: '~$cosecha_sem47.xlsx', size: 1024 }).valid).toBe(false)
    expect(validateExcelFile({ name: 'payload.exe', size: 1024 }).valid).toBe(false)
    expect(validateExcelFile({ name: 'macro.exe.xlsx', size: 1024 }).valid).toBe(false)
    expect(
      validateExcelFile({ name: 'gigante.xlsx', size: MAX_EXCEL_FILE_BYTES + 1 }).valid,
    ).toBe(false)

    expect(parseAuditoriaTab(new URLSearchParams('tab=accesos'))).toBe('accesos')
    expect(buildAccesosPath({ pagina: 2, tamano: 20, usuario: 'admin.acp', accion: 'LOGIN_OK' })).toBe(
      '/api/v1/auditoria/accesos?pagina=2&tamano=20&usuario=admin.acp&accion=LOGIN_OK',
    )
  })
})
