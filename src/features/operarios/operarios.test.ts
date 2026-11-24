import { describe, expect, it } from 'vitest'
import type { CuarentenaIncidencia, OperarioPersonal } from './types'
import {
  classifyAsertividad,
  computeOperariosKpis,
  countPersonalColumnIncidencias,
  getDniVariants,
  isAlertAsertividad,
  matchOperarioIncidencias,
  normalizeDni,
} from './operariosUtils'

describe('operariosUtils', () => {
  describe('classifyAsertividad (distingue null de 0%)', () => {
    it('treats null and undefined as sin_medicion, NOT 0% and NOT alert', () => {
      const resNull = classifyAsertividad(null)
      expect(resNull.nivel).toBe('sin_medicion')
      expect(resNull.label).toBe('Sin medición')
      expect(resNull.progressValue).toBeNull()
      expect(resNull.isAlert).toBe(false)
      expect(isAlertAsertividad(null)).toBe(false)
      expect(isAlertAsertividad(undefined)).toBe(false)
    })

    it('treats real 0% measurement as critica / error and alert', () => {
      const resZero = classifyAsertividad(0)
      expect(resZero.nivel).toBe('error')
      expect(resZero.tone).toBe('error')
      expect(resZero.formattedPct).toBe('0.0%')
      expect(resZero.progressValue).toBe(0)
      expect(resZero.isAlert).toBe(true)
    })

    it('applies semantic bands: >=90 ok, 85..89.9 warning non-alert, 75..84.9 warning alert, <75 error', () => {
      expect(classifyAsertividad(94.5)).toMatchObject({ nivel: 'ok', isAlert: false })
      expect(classifyAsertividad(90)).toMatchObject({ nivel: 'ok', isAlert: false })
      expect(classifyAsertividad(87.2)).toMatchObject({ nivel: 'warning', isAlert: false })
      expect(classifyAsertividad(84.9)).toMatchObject({ nivel: 'warning', isAlert: true })
      expect(classifyAsertividad(75)).toMatchObject({ nivel: 'warning', isAlert: true })
      expect(classifyAsertividad(74.9)).toMatchObject({ nivel: 'error', isAlert: true })
    })
  })

  describe('computeOperariosKpis', () => {
    it('excludes null measurements from promedioAsertividad and bajo85 counts', () => {
      const rows: OperarioPersonal[] = [
        { dni: '07451234', nombre_completo: 'Ana', rol: 'Evaluador', sexo: 'F', id_planilla: 'P001', pct_asertividad: 92, dias_ausentismo: 1 },
        { dni: '45678912', nombre_completo: 'Luis', rol: 'Evaluador', sexo: 'M', id_planilla: 'P002', pct_asertividad: 80, dias_ausentismo: 3 },
        { dni: '11223344', nombre_completo: 'Eva', rol: 'Cosechador', sexo: 'F', id_planilla: 'P003', pct_asertividad: null, dias_ausentismo: null },
      ]

      const kpis = computeOperariosKpis(rows, 150)
      expect(kpis.totalPadron).toBe(150)
      expect(kpis.enPagina).toBe(3)
      expect(kpis.conMedicion).toBe(2)
      expect(kpis.sinMedicion).toBe(1)
      expect(kpis.promedioAsertividad).toBe(86)
      expect(kpis.bajo85).toBe(1)
      expect(kpis.diasAusentismoAcumulados).toBe(4)
      expect(kpis.conAusentismoRegistrado).toBe(2)
    })
  })

  describe('DNI normalization and quarantine matching', () => {
    it('generates leading-zero tolerant variants for 7-8 digit DNIs', () => {
      expect(normalizeDni(' 0745-1234 ')).toBe('07451234')
      expect(getDniVariants('07451234')).toEqual(expect.arrayContaining(['07451234', '7451234']))
      expect(getDniVariants('7451234')).toEqual(expect.arrayContaining(['7451234', '07451234']))
    })

    it('matches operario against quarantine records by DNI variant, planilla, and name', () => {
      const operario: OperarioPersonal = {
        dni: '07451234',
        nombre_completo: 'María José Pérez',
        rol: 'Evaluador',
        sexo: 'F',
        id_planilla: 'PL9081',
        pct_asertividad: 88,
        dias_ausentismo: 0,
      }

      const incidencias: CuarentenaIncidencia[] = [
        {
          tabla_origen: 'Bronce.Tareo',
          id_registro: '101',
          columna_origen: 'DNI_Operario',
          valor_raw: '7451234',
          nombre_archivo: 'tareo_01.xlsx',
          fecha_ingreso: '2026-11-20',
          estado: 'PENDIENTE',
          motivo: 'DNI sin cero inicial',
          valor_corregido: null,
          id_registro_origen: 101,
        },
        {
          tabla_origen: 'Bronce.Conteo',
          id_registro: '102',
          columna_origen: 'Responsable_Campo',
          valor_raw: 'Maria Jose Perez',
          nombre_archivo: 'conteo_02.xlsx',
          fecha_ingreso: '2026-11-21',
          estado: 'PENDIENTE',
          motivo: 'Nombre no homologado',
          valor_corregido: null,
          id_registro_origen: 102,
        },
        {
          tabla_origen: 'Bronce.Cosecha',
          id_registro: '103',
          columna_origen: 'Variedad',
          valor_raw: 'BILOXI_X',
          nombre_archivo: 'cosecha.xlsx',
          fecha_ingreso: '2026-11-21',
          estado: 'PENDIENTE',
          motivo: 'Variedad desconocida',
          valor_corregido: null,
          id_registro_origen: 103,
        },
      ]

      const matches = matchOperarioIncidencias(operario, incidencias)
      expect(matches).toHaveLength(2)
      expect(matches[0].matchReason).toBe('dni')
      expect(matches[0].isPersonalColumn).toBe(true)
      expect(matches[1].matchReason).toBe('nombre')
      expect(countPersonalColumnIncidencias(incidencias)).toBe(2)
    })
  })
})
