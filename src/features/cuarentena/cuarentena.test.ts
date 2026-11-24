import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ejecutarReinyeccionMdm,
  fetchCuarentenaList,
  fetchCuarentenaResumen,
  fetchReinyeccionCandidatos,
  rechazarCuarentenaRecord,
  resolverCuarentenaRecord,
} from './cuarentenaApi'
import {
  buildRechazarPath,
  buildResolverPath,
  DEFAULT_CUARENTENA_FILTERS,
  isRecordPending,
  mapCuarentenaEstadoTone,
  normalizeEstadoFiltro,
  parseCuarentenaSearchParams,
  rechazarCuarentenaSchema,
  resolverCuarentenaSchema,
  serializeCuarentenaSearchParams,
  toRechazarPayload,
  toResolverPayload,
} from './cuarentenaUtils'

describe('cuarentenaUtils — validadores Zod', () => {
  describe('resolverCuarentenaSchema', () => {
    it('acepta valor_canonico válido (1..200) y comentario vacío o válido (<=500)', () => {
      const parsed = resolverCuarentenaSchema.safeParse({
        valor_canonico: '  FUNDO SAN CARLOS  ',
        comentario: '  Homologado contra catálogo maestro  ',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.valor_canonico).toBe('FUNDO SAN CARLOS')
        expect(parsed.data.comentario).toBe('Homologado contra catálogo maestro')
      }

      const boundary = resolverCuarentenaSchema.safeParse({
        valor_canonico: 'A'.repeat(200),
        comentario: 'C'.repeat(500),
      })
      expect(boundary.success).toBe(true)
    })

    it('rechaza valor_canonico vacío o solo espacios', () => {
      expect(
        resolverCuarentenaSchema.safeParse({ valor_canonico: '', comentario: '' }).success,
      ).toBe(false)
      expect(
        resolverCuarentenaSchema.safeParse({ valor_canonico: '     ', comentario: '' }).success,
      ).toBe(false)
    })

    it('rechaza valor_canonico > 200 caracteres y comentario > 500 caracteres', () => {
      const longValue = resolverCuarentenaSchema.safeParse({
        valor_canonico: 'X'.repeat(201),
        comentario: '',
      })
      expect(longValue.success).toBe(false)

      const longComment = resolverCuarentenaSchema.safeParse({
        valor_canonico: 'VALIDO',
        comentario: 'Y'.repeat(501),
      })
      expect(longComment.success).toBe(false)
    })

    it('convierte comentario vacío a null en toResolverPayload', () => {
      expect(
        toResolverPayload({ valor_canonico: '  CANONICO ', comentario: '   ' }),
      ).toEqual({
        valor_canonico: 'CANONICO',
        comentario: null,
      })

      expect(
        toResolverPayload({ valor_canonico: 'CANONICO', comentario: '  Nota MDM ' }),
      ).toEqual({
        valor_canonico: 'CANONICO',
        comentario: 'Nota MDM',
      })
    })
  })

  describe('rechazarCuarentenaSchema', () => {
    it('acepta motivo válido entre 1 y 500 caracteres', () => {
      const ok = rechazarCuarentenaSchema.safeParse({ motivo: '  Duplicado en archivo fuente  ' })
      expect(ok.success).toBe(true)
      if (ok.success) {
        expect(ok.data.motivo).toBe('Duplicado en archivo fuente')
      }

      expect(rechazarCuarentenaSchema.safeParse({ motivo: 'M'.repeat(500) }).success).toBe(true)
    })

    it('rechaza motivo vacío, solo espacios o superior a 500 caracteres', () => {
      expect(rechazarCuarentenaSchema.safeParse({ motivo: '' }).success).toBe(false)
      expect(rechazarCuarentenaSchema.safeParse({ motivo: '   \n\t  ' }).success).toBe(false)
      expect(rechazarCuarentenaSchema.safeParse({ motivo: 'M'.repeat(501) }).success).toBe(false)
    })

    it('limpia espacios en toRechazarPayload', () => {
      expect(toRechazarPayload({ motivo: '  Registro de prueba  ' })).toEqual({
        motivo: 'Registro de prueba',
      })
    })
  })
})

describe('cuarentenaUtils — URL Search Params', () => {
  it('retorna valores por defecto cuando no hay parámetros', () => {
    expect(parseCuarentenaSearchParams(new URLSearchParams())).toEqual(DEFAULT_CUARENTENA_FILTERS)
  })

  it('parsea correctamente parámetros válidos y normaliza estado', () => {
    const params = new URLSearchParams({
      pagina: '3',
      tamano: '50',
      estado: 'resuelto',
      tabla: '  Bronce.Peladas  ',
    })
    expect(parseCuarentenaSearchParams(params)).toEqual({
      pagina: 3,
      tamano: 50,
      estado: 'RESUELTO',
      tabla: 'Bronce.Peladas',
    })

    expect(normalizeEstadoFiltro('ALL')).toBe('all')
    expect(normalizeEstadoFiltro('descartado')).toBe('DESCARTADO')
    expect(normalizeEstadoFiltro('DESCONOCIDO')).toBe('PENDIENTE')
  })

  it('recupera valores seguros ante parámetros inválidos o fuera de rango', () => {
    const params = new URLSearchParams({
      pagina: '-5',
      tamano: '999',
      estado: 'INVALIDO',
      tabla: '   ',
    })
    expect(parseCuarentenaSearchParams(params)).toEqual({
      pagina: 1,
      tamano: 20,
      estado: 'PENDIENTE',
      tabla: '',
    })
  })

  it('serializa limpiamente y cumple round-trip exacto', () => {
    const cases = [
      DEFAULT_CUARENTENA_FILTERS,
      { pagina: 2, tamano: 50, estado: 'RESUELTO' as const, tabla: 'Bronce.Peladas' },
      { pagina: 4, tamano: 100, estado: 'all' as const, tabla: 'Consolidado_Tareos' },
      { pagina: 1, tamano: 20, estado: 'DESCARTADO' as const, tabla: '' },
    ]

    for (const filters of cases) {
      const serialized = serializeCuarentenaSearchParams(filters)
      expect(parseCuarentenaSearchParams(serialized)).toEqual(filters)
    }

    const defaultSerialized = serializeCuarentenaSearchParams(DEFAULT_CUARENTENA_FILTERS)
    expect(defaultSerialized.get('estado')).toBe('PENDIENTE')
    expect(defaultSerialized.has('pagina')).toBe(false)
    expect(defaultSerialized.has('tamano')).toBe(false)
    expect(defaultSerialized.has('tabla')).toBe(false)
  })
})

describe('cuarentenaUtils — codificación segura de paths (encodeURIComponent)', () => {
  it('codifica tabla_origen e id_registro estándar y con caracteres reservados', () => {
    expect(buildResolverPath('Bronce.Peladas', '1042')).toBe(
      '/api/v1/cuarentena/Bronce.Peladas/1042/resolver',
    )
    expect(buildRechazarPath('Bronce.Peladas', '1042')).toBe(
      '/api/v1/cuarentena/Bronce.Peladas/1042/rechazar',
    )

    const trickyTable = 'Bronce/Con Espacios#1?x=2%'
    const trickyId = 'ID/99 #A?foo=bar'

    expect(buildResolverPath(trickyTable, trickyId)).toBe(
      `/api/v1/cuarentena/${encodeURIComponent(trickyTable)}/${encodeURIComponent(trickyId)}/resolver`,
    )
    expect(buildRechazarPath(trickyTable, trickyId)).toBe(
      `/api/v1/cuarentena/${encodeURIComponent(trickyTable)}/${encodeURIComponent(trickyId)}/rechazar`,
    )
    // Nunca debe inyectar query strings ni fragmentos sin codificar
    expect(buildResolverPath(trickyTable, trickyId)).not.toContain('?')
    expect(buildResolverPath(trickyTable, trickyId)).not.toContain('#')
    expect(buildRechazarPath(trickyTable, trickyId)).not.toContain(' ')
  })

  it('mapea correctamente tonos y estado pendiente', () => {
    expect(mapCuarentenaEstadoTone('PENDIENTE')).toBe('pending')
    expect(mapCuarentenaEstadoTone('RESUELTO')).toBe('ok')
    expect(mapCuarentenaEstadoTone('DESCARTADO')).toBe('cancelled')
    expect(mapCuarentenaEstadoTone('REINYECTADO')).toBe('readonly')
    expect(isRecordPending('pendiente')).toBe(true)
    expect(isRecordPending('RESUELTO')).toBe(false)
  })
})

describe('cuarentenaApi — contratos HTTP y encoding en runtime', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockJsonFetch(payload: unknown) {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('envía PATCH con segmentos codificados para resolver y rechazar', async () => {
    const fetchMock = mockJsonFetch({
      id_registro: 'ID/1#A',
      estado_nuevo: 'RESUELTO',
      mensaje: 'OK',
    })

    await resolverCuarentenaRecord('Bronce/Test 1', 'ID/1#A', {
      valor_canonico: 'CANONICO',
      comentario: null,
    })

    const [resolveUrl, resolveInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(resolveUrl).toContain(
      '/api/v1/cuarentena/Bronce%2FTest%201/ID%2F1%23A/resolver',
    )
    expect(resolveInit.method).toBe('PATCH')
    expect(resolveInit.body).toBe(
      JSON.stringify({ valor_canonico: 'CANONICO', comentario: null }),
    )

    await rechazarCuarentenaRecord('Bronce/Test 1', 'ID/1#A', {
      motivo: 'Duplicado',
    })

    const [rejectUrl, rejectInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(rejectUrl).toContain(
      '/api/v1/cuarentena/Bronce%2FTest%201/ID%2F1%23A/rechazar',
    )
    expect(rejectInit.method).toBe('PATCH')
    expect(rejectInit.body).toBe(JSON.stringify({ motivo: 'Duplicado' }))
  })

  it('construye correctamente los query params de listado, resumen y reinyección', async () => {
    const fetchMock = mockJsonFetch({ total: 0, pagina: 2, tamano: 50, datos: [] })

    await fetchCuarentenaResumen()
    await fetchCuarentenaList({
      pagina: 2,
      tamano: 50,
      estado_filtro: 'all',
      tabla_filtro: 'Bronce.Peladas',
    })
    await fetchReinyeccionCandidatos('Bronce.Peladas')
    await ejecutarReinyeccionMdm('Bronce.Peladas')

    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/api\/v1\/cuarentena\/resumen$/)

    const listUrl = new URL((fetchMock.mock.calls[1] as [string])[0])
    expect(listUrl.pathname).toBe('/api/v1/cuarentena')
    expect(listUrl.searchParams.get('pagina')).toBe('2')
    expect(listUrl.searchParams.get('tamano')).toBe('50')
    expect(listUrl.searchParams.get('estado_filtro')).toBe('all')
    expect(listUrl.searchParams.get('tabla_filtro')).toBe('Bronce.Peladas')

    const candUrl = new URL((fetchMock.mock.calls[2] as [string])[0])
    expect(candUrl.pathname).toBe('/api/v1/reinyeccion/candidatos')
    expect(candUrl.searchParams.get('tabla')).toBe('Bronce.Peladas')

    const [execUrlRaw, execInit] = fetchMock.mock.calls[3] as [string, RequestInit]
    const execUrl = new URL(execUrlRaw)
    expect(execUrl.pathname).toBe('/api/v1/reinyeccion/ejecutar')
    expect(execUrl.searchParams.get('tabla')).toBe('Bronce.Peladas')
    expect(execInit.method).toBe('POST')
  })

  it('soporta parámetros server-side q y columna sin alterar defaults cuando faltan', () => {
    expect(parseCuarentenaSearchParams(new URLSearchParams())).toEqual(DEFAULT_CUARENTENA_FILTERS)

    const withSearch = parseCuarentenaSearchParams(
      new URLSearchParams('pagina=2&tamano=50&estado=PENDIENTE&tabla=Bronce.Tareo&q=BILOXI&columna=Variedad'),
    )
    expect(withSearch).toEqual({
      pagina: 2,
      tamano: 50,
      estado: 'PENDIENTE',
      tabla: 'Bronce.Tareo',
      q: 'BILOXI',
      columna: 'Variedad',
    })

    const serialized = serializeCuarentenaSearchParams(withSearch)
    expect(serialized.get('q')).toBe('BILOXI')
    expect(serialized.get('columna')).toBe('Variedad')
  })
})
