import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GEOGRAFIA_PAGE_SIZE,
  GEOGRAFIA_FILTER_MAX_LEN,
  MAX_GEOGRAFIA_PAGE_SIZE,
  VARIEDAD_BREEDER_MAX,
  VARIEDAD_NOMBRE_MAX,
  buildGeografiaQueryParams,
  createVarietyFormSchema,
  normalizeGeografiaPage,
  normalizeGeografiaPageSize,
  parseMaestrosTab,
  toCreateVarietyPayload,
} from './schemas'

describe('maestros schemas & query normalization', () => {
  describe('createVarietyFormSchema', () => {
    it('accepts valid trimmed variety and optional breeder', () => {
      const parsed = createVarietyFormSchema.safeParse({
        nombre_variedad: '  Biloxi  ',
        breeder: '  Fall Creek  ',
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.nombre_variedad).toBe('Biloxi')
        expect(parsed.data.breeder).toBe('Fall Creek')
        expect(toCreateVarietyPayload(parsed.data)).toEqual({
          nombre_variedad: 'Biloxi',
          breeder: 'Fall Creek',
        })
      }
    })

    it('converts blank breeder into null payload', () => {
      const parsed = createVarietyFormSchema.parse({
        nombre_variedad: 'Ventura',
        breeder: '   ',
      })
      expect(toCreateVarietyPayload(parsed)).toEqual({
        nombre_variedad: 'Ventura',
        breeder: null,
      })
    })

    it('rejects nombre_variedad shorter than 2 chars after trimming', () => {
      const res = createVarietyFormSchema.safeParse({
        nombre_variedad: ' A ',
        breeder: '',
      })
      expect(res.success).toBe(false)
    })

    it('rejects nombre_variedad exceeding max length', () => {
      const res = createVarietyFormSchema.safeParse({
        nombre_variedad: 'V'.repeat(VARIEDAD_NOMBRE_MAX + 1),
        breeder: '',
      })
      expect(res.success).toBe(false)
    })

    it('rejects breeder exceeding max length', () => {
      const res = createVarietyFormSchema.safeParse({
        nombre_variedad: 'Emerald',
        breeder: 'B'.repeat(VARIEDAD_BREEDER_MAX + 1),
      })
      expect(res.success).toBe(false)
    })
  })

  describe('parseMaestrosTab', () => {
    it('parses valid tabs and falls back to variedades', () => {
      expect(parseMaestrosTab('variedades')).toBe('variedades')
      expect(parseMaestrosTab('mdm')).toBe('mdm')
      expect(parseMaestrosTab('geografia')).toBe('geografia')
      expect(parseMaestrosTab('invalido')).toBe('variedades')
      expect(parseMaestrosTab(null)).toBe('variedades')
    })
  })

  describe('geografia pagination & filters', () => {
    it('clamps tamano strictly to <= 200', () => {
      expect(normalizeGeografiaPageSize(500)).toBe(MAX_GEOGRAFIA_PAGE_SIZE)
      expect(normalizeGeografiaPageSize('201')).toBe(200)
      expect(normalizeGeografiaPageSize(100)).toBe(100)
      expect(normalizeGeografiaPageSize(0)).toBe(DEFAULT_GEOGRAFIA_PAGE_SIZE)
      expect(normalizeGeografiaPageSize('abc')).toBe(DEFAULT_GEOGRAFIA_PAGE_SIZE)
    })

    it('normalizes pagina to integer >= 1', () => {
      expect(normalizeGeografiaPage('3')).toBe(3)
      expect(normalizeGeografiaPage(2.9)).toBe(2)
      expect(normalizeGeografiaPage(0)).toBe(1)
      expect(normalizeGeografiaPage(-4)).toBe(1)
      expect(normalizeGeografiaPage('nan')).toBe(1)
    })

    it('builds clean query params omitting blank filters and clamping lengths', () => {
      const longText = 'X'.repeat(GEOGRAFIA_FILTER_MAX_LEN + 25)
      const params = buildGeografiaQueryParams({
        pagina: '2',
        tamano: '999',
        texto: `  ${longText}  `,
        fundo: '  ',
        sector: ' Sector Norte ',
      })
      expect(params).toEqual({
        pagina: 2,
        tamano: 200,
        texto: 'X'.repeat(GEOGRAFIA_FILTER_MAX_LEN),
        sector: 'Sector Norte',
      })
      expect('fundo' in params).toBe(false)
    })
  })
})
