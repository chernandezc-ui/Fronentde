import { expect, test, type Page } from '@playwright/test'

const ADMIN_USER = {
  nombre_usuario: 'admin.acp',
  nombre_display: 'Carlos Hernández',
  rol: 'admin',
  email: 'carlos@acp.pe',
}

const VIEWER_USER = {
  nombre_usuario: 'viewer.acp',
  nombre_display: 'Visitante Lectura',
  rol: 'viewer',
  email: 'viewer@acp.pe',
}

async function seedSession(page: Page, user = ADMIN_USER) {
  await page.addInitScript((u) => {
    window.localStorage.setItem(
      'acp-control-auth',
      JSON.stringify({
        state: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.flow-token',
          usuario: u,
        },
        version: 0,
      }),
    )
    window.localStorage.setItem('acp-control-theme', 'dark')
  }, user)
}

async function mockProyeccionesBackend(
  page: Page,
  options?: { simularStatus?: number; onCalls?: { simular: number; ejecutar: number } },
) {
  await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname
    const cors = {
      'Access-Control-Allow-Origin': 'http://localhost:4173',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    }

    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: cors })
    }

    if (pathname.includes('stream')) {
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'Content-Type': 'text/event-stream' },
        body: 'event: telemetria\ndata: {"conectado":true,"latencia_ms":12,"corridas_activas":0,"comandos_pendientes":0,"comandos_procesando":0,"timestamp":"2026-11-24T12:00:00Z"}\n\n',
      })
    }

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

    if (pathname === '/auth/me') return json(ADMIN_USER)
    if (pathname === '/health') {
      return json({
        servicio: 'ACP Platform API',
        version: '1.1.0',
        entorno: 'dev',
        estado: 'activo',
        base_datos: { conectado: true, base_datos: 'ACP_DWH', latencia_ms: 12 },
        timestamp: '2026-11-24T12:00:00Z',
      })
    }
    if (pathname === '/health/ready/runner') return json({ estado: 'libre' })
    if (pathname === '/api/v1/proyecciones/fechas') return json({ fechas: [20261123, 20261116] })
    if (pathname.startsWith('/api/v1/proyecciones/combinaciones/')) {
      return json([
        { Fundo: 'ACP NORTE', Modulo: '1', Variedad: 'Biloxi', Condicion: 'Suelo - Orgánico' },
        { Fundo: 'SAN CARLOS', Modulo: '2', Variedad: 'Sekoya', Condicion: 'Maceta - Convencional' },
      ])
    }
    if (pathname.startsWith('/api/v1/proyecciones/integridad/')) {
      return json({ conteo: true, peladas: true, pesos: true })
    }
    if (pathname === '/api/v1/proyecciones/matriz') {
      return json({
        cosechable: { '1': 1.0, '2': null },
        maduras: { '1': 1.0, '2': null },
        cremas: { '1': 1.0, '2': null },
        fase_2: { '1': 0.14, '2': 0.4, '3': null },
        fase_1: { '1': 0.0, '2': 0.0, '3': 0.1, '4': 0.6, '5': null, '6': null },
        verdes: { '1': 0.0, '2': 0.0, '3': 0.0, '4': 0.0, '5': 0.16, '6': 0.17 },
        pequena: { '1': 0.0, '2': 0.0, '3': 0.0, '4': 0.0, '5': 0.0, '6': 0.0 },
      })
    }
    if (pathname === '/api/v1/proyecciones/constantes') {
      return json({
        plantas_por_punto: 10,
        decay_factor: { '1': 1, '2': 1, '3': 0.8, '4': 0.8, '5': 0.8, '6': 0.8 },
        delta_productivas: { '1': 0, '2': 0.02, '3': 0, '4': -0.03, '5': 0.01, '6': 0.01 },
      })
    }

    if (pathname === '/api/v1/proyecciones/simular' || pathname === '/api/v1/proyecciones/ejecutar') {
      const isSimular = pathname.endsWith('/simular')
      if (isSimular && options?.onCalls) options.onCalls.simular += 1
      if (!isSimular && options?.onCalls) options.onCalls.ejecutar += 1

      if (isSimular && options?.simularStatus && options.simularStatus !== 200) {
        return json({ detail: 'Not found' }, options.simularStatus)
      }

      const body = route.request().postDataJSON() as {
        margen_pesimista?: number
        margen_optimista?: number
      }
      const mp = body?.margen_pesimista ?? 0.9906
      const mo = body?.margen_optimista ?? 1.0107
      // Base distinta si es ±10% para validar deltas visibles en comparador
      const baseW1 = mp <= 0.9 ? 2400 : 2000
      const baseW2 = 1500
      const totalBase = baseW1 + baseW2

      return json({
        df_semanal: [
          {
            semana: 1,
            semana_label: 'W1 (30/11)',
            fecha_semana: '2026-11-30',
            kg_proyectados: baseW1,
            kg_pesimista: Number((baseW1 * mp).toFixed(2)),
            kg_optimista: Number((baseW1 * mo).toFixed(2)),
            kg_anterior: 1800,
            pct_variacion: Number((((baseW1 - 1800) / 1800) * 100).toFixed(2)),
            tendencia: 'Alza',
          },
          {
            semana: 2,
            semana_label: 'W2 (07/12)',
            fecha_semana: '2026-12-07',
            kg_proyectados: baseW2,
            kg_pesimista: Number((baseW2 * mp).toFixed(2)),
            kg_optimista: Number((baseW2 * mo).toFixed(2)),
            kg_anterior: 1500,
            pct_variacion: 0,
            tendencia: 'Estable',
          },
        ],
        kpis: {
          total_base: totalBase,
          total_pes: Number((totalBase * mp).toFixed(2)),
          total_opt: Number((totalBase * mo).toFixed(2)),
          variedad_top: 'Biloxi',
          total_plantas: 10000,
          kg_por_planta: Number((totalBase / 10000).toFixed(4)),
          unidades_cubiertas: 4,
          unidades_totales: 5,
        },
        df_detalle: [
          {
            id_geografia: 101,
            id_variedad: 5,
            id_fundo: 1,
            fundo: 'ACP NORTE',
            condicion: 'Suelo - Orgánico',
            certificacion: 'Orgánico',
            modulo: '1',
            turno: '2',
            valvula: '3',
            variedad: 'Biloxi',
            semana: 1,
            id_tiempo_proy: 20261130,
            semana_label: 'W1 (30/11)',
            fecha_semana: '2026-11-30',
            kg_base: baseW1,
            kg_pesimista: Number((baseW1 * mp).toFixed(2)),
            kg_optimista: Number((baseW1 * mo).toFixed(2)),
          },
          {
            id_geografia: 202,
            id_variedad: 6,
            id_fundo: 2,
            fundo: 'SAN CARLOS',
            condicion: 'Maceta - Convencional',
            certificacion: 'Convencional',
            modulo: '2',
            turno: '1',
            valvula: '4',
            variedad: 'Sekoya',
            semana: 2,
            id_tiempo_proy: 20261207,
            semana_label: 'W2 (07/12)',
            fecha_semana: '2026-12-07',
            kg_base: baseW2,
            kg_pesimista: Number((baseW2 * mp).toFixed(2)),
            kg_optimista: Number((baseW2 * mo).toFixed(2)),
          },
        ],
      })
    }

    return json({})
  })
}

test.describe('Proyecciones Six-Week — Flujo guiado de 4 etapas', () => {
  test('recorre Corte → Supuestos → Simular → Detalle → Desactualizado → Comparar → Publicar', async ({
    page,
  }) => {
    const calls = { simular: 0, ejecutar: 0 }
    await seedSession(page, ADMIN_USER)
    await mockProyeccionesBackend(page, { onCalls: calls })

    await page.goto('/proyecciones')
    await expect(page.getByRole('heading', { level: 1, name: /Proyecciones Six-Week/i })).toBeVisible()

    // Paso 1: Corte y cobertura -> Continuar a supuestos
    await expect(page.getByText('Conteo fenológico')).toBeVisible()
    await page.getByRole('button', { name: /Continuar a supuestos/i }).click()

    // Paso 2: Abrir Sheet de matriz biológica y cerrar
    await page.getByRole('button', { name: /Ver matriz 7×6 y constantes/i }).click()
    await expect(page.getByText('Matriz biológica y constantes del modelo')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

    // Aplicar preset ±5% y calcular simulación (sin guardar)
    await page.getByRole('button', { name: /Banda ±5%/i }).click()
    await page.getByRole('button', { name: /Calcular simulación/i }).click()

    // Paso 3: Inspección y comparación
    await expect(page.getByText(/Borrador · Vista previa sin guardar/i)).toBeVisible()
    await expect(page.getByText('Cobertura de censo')).toBeVisible()
    await expect(page.getByText(/1 unidad\(es\) con respaldo/i)).toBeVisible()
    expect(calls.simular).toBe(1)
    expect(calls.ejecutar).toBe(0)

    // Tab Detalle -> vista Por certificación
    await page.getByRole('tab', { name: /Detalle/i }).click()
    await page.getByRole('button', { name: /Por certificación/i }).click()
    await expect(page.getByText('Orgánico')).toBeVisible()
    await expect(page.getByText('Convencional')).toBeVisible()

    // Volver a Supuestos y cambiar a ±10% -> debe marcar Desactualizado
    await page.getByRole('button', { name: /Ajustar supuestos/i }).click()
    await page.getByRole('button', { name: /Banda ±10%/i }).click()
    await expect(page.getByText(/Modificaste fecha, filtros o supuestos/i)).toBeVisible()

    // Recalcular simulación y comparar ambos escenarios
    await page.getByRole('button', { name: /Calcular simulación/i }).click()
    expect(calls.simular).toBe(2)

    await page.getByRole('tab', { name: /Comparar escenarios/i }).click()
    await expect(page.getByText('Comparador de escenarios en sesión')).toBeVisible()
    await expect(page.getByText(/\+400\.0 kg/i)).toBeVisible()

    // Paso 4: Publicar versión con confirmación explícita
    await page.getByRole('button', { name: /Continuar a publicación/i }).click()
    await page.getByRole('button', { name: /Publicar versión oficial/i }).click()
    await expect(page.getByText(/Confirmar publicación de proyección Six-Week/i)).toBeVisible()
    await page.getByRole('button', { name: /Confirmar y publicar/i }).click()

    expect(calls.ejecutar).toBe(1)
    await expect(page.getByText(/Versión oficial publicada correctamente/i)).toBeVisible()
  })

  test('perfil viewer recorre Pasos 1-2 en solo lectura sin disparar simulación ni publicación', async ({
    page,
  }) => {
    const calls = { simular: 0, ejecutar: 0 }
    await seedSession(page, VIEWER_USER)
    await mockProyeccionesBackend(page, { onCalls: calls })
    await page.route('**/auth/me', (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: JSON.stringify(VIEWER_USER),
      }),
    )

    await page.goto('/proyecciones')
    await expect(page.getByText('Solo lectura')).toBeVisible()
    await page.getByRole('button', { name: /Continuar a supuestos/i }).click()
    await expect(page.getByText(/Modo solo lectura/i)).toBeVisible()
    expect(calls.simular).toBe(0)
    expect(calls.ejecutar).toBe(0)
  })
})
