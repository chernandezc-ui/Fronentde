import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const SCREENSHOT_DIR = path.resolve(import.meta.dirname, '..', 'test-results', 'visual')

const MOCK_ADMIN_USER = {
  nombre_usuario: 'admin.acp',
  nombre_display: 'Carlos Hernández',
  rol: 'admin',
  email: 'carlos@acp.pe',
}

async function seedAuthSession(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem(
      'acp-control-auth',
      JSON.stringify({
        state: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-playwright-token',
          usuario: user,
        },
        version: 0,
      }),
    )
    window.localStorage.setItem('acp-control-theme', 'dark')
  }, MOCK_ADMIN_USER)
}

async function mockBackendApi(page: Page) {
  await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, async (route) => {
    const url = new URL(route.request().url())
    const pathname = url.pathname

    // SSE streams
    if (pathname === '/health/telemetria/stream') {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: `event: telemetria\ndata: ${JSON.stringify({
          conectado: true,
          latencia_ms: 14,
          corridas_activas: 1,
          comandos_pendientes: 0,
          comandos_procesando: 1,
          timestamp: '2026-11-23T10:00:00Z',
          version_sql: 'SQL Server 2022',
        })}\n\n`,
      })
      return
    }

    if (pathname === '/health/calidad/stream') {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: `event: calidad\ndata: ${JSON.stringify({
          total_hoy: 14,
          top_tipos: [
            { Tipo_Error_Raw: 'VARIEDAD_NO_HOMOLOGADA', Cuenta: 8 },
            { Tipo_Error_Raw: 'DNI_INCOMPLETO', Cuenta: 4 },
            { Tipo_Error_Raw: 'CAMA_NO_EXISTE', Cuenta: 2 },
          ],
          top_fundos: [
            { Fundo_Raw: 'ACP NORTE', Cuenta: 9 },
            { Fundo_Raw: 'SAN CARLOS', Cuenta: 3 },
            { Fundo_Raw: 'LA JOYA', Cuenta: 2 },
          ],
          timestamp_servidor: '2026-11-23T10:00:00Z',
        })}\n\n`,
      })
      return
    }

    if (pathname.endsWith('/eventos')) {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body:
          'id: 1\nevent: paso\ndata: [PASO] Procesando Silver.Fact_Cosecha_SAP\n\n' +
          'id: 2\nevent: fin\ndata: [FIN_CORRIDA]\n\n',
      })
      return
    }

    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
          'X-Request-ID': 'req-e2e-visual-001',
        },
        body: JSON.stringify(data),
      })

    if (pathname === '/health') {
      return json({
        servicio: 'ACP Platform API',
        version: '1.1.0',
        entorno: 'dev',
        estado: 'activo',
        base_datos: { conectado: true, base_datos: 'ACP_DWH', latencia_ms: 14 },
        timestamp: '2026-11-23T10:00:00Z',
      })
    }

    if (pathname === '/health/ready/runner') {
      return json({
        servicio: 'ACP Platform API',
        version: '1.1.0',
        entorno: 'dev',
        estado: 'ocupado',
        base_datos: { conectado: true, base_datos: 'ACP_DWH', latencia_ms: 14 },
        control_plane: {
          estado: 'ok',
          lock: { estado_lock: 'ACTIVO', pid_runner: 4820, hostname: 'ACP-ETL-01' },
        },
        timestamp: '2026-11-23T10:00:00Z',
      })
    }

    if (pathname === '/health/lock') {
      return json({
        estado: 'activo',
        lock: { estado_lock: 'ACTIVO', pid_runner: 4820, hostname: 'ACP-ETL-01' },
        timestamp: '2026-11-23T10:00:00Z',
      })
    }

    if (pathname === '/auth/me') {
      return json(MOCK_ADMIN_USER)
    }

    if (pathname === '/auth/usuarios') {
      return json([
        {
          id_usuario: 1,
          nombre_usuario: 'admin.acp',
          nombre_display: 'Carlos Hernández',
          email: 'carlos@acp.pe',
          rol: 'admin',
          es_activo: true,
          fecha_creacion: '2026-01-15T08:00:00Z',
          ultimo_acceso: '2026-11-23T09:50:00Z',
        },
        {
          id_usuario: 2,
          nombre_usuario: 'mdm.analista',
          nombre_display: 'Lucía Paredes',
          email: 'lucia@acp.pe',
          rol: 'analista_mdm',
          es_activo: true,
          fecha_creacion: '2026-03-10T10:15:00Z',
          ultimo_acceso: '2026-11-22T18:20:00Z',
        },
      ])
    }

    if (pathname === '/api/v1/alertas/acks') {
      return json([])
    }

    if (pathname === '/api/v1/cuarentena/resumen') {
      return json({ total: 142, pendientes: 27, resueltos: 98, descartados: 17 })
    }

    if (pathname === '/api/v1/cuarentena') {
      return json({
        total: 2,
        pagina: 1,
        tamano: 20,
        datos: [
          {
            tabla_origen: 'Bronce.Cosecha_SAP',
            id_registro: '98211',
            columna_origen: 'Variedad',
            valor_raw: 'BILOXI_X',
            nombre_archivo: 'cosecha_sem47.xlsx',
            fecha_ingreso: '2026-11-22',
            estado: 'PENDIENTE',
            motivo: 'Variedad no homologada en Silver.Dim_Variedad',
            valor_corregido: null,
            id_registro_origen: 98211,
          },
          {
            tabla_origen: 'Bronce.Tareo',
            id_registro: '98212',
            columna_origen: 'DNI_Operario',
            valor_raw: '7451234',
            nombre_archivo: 'tareo_sem47.xlsx',
            fecha_ingreso: '2026-11-22',
            estado: 'RESUELTO',
            motivo: 'DNI sin cero inicial',
            valor_corregido: '07451234',
            id_registro_origen: 98212,
          },
        ],
      })
    }

    if (pathname === '/api/v1/reinyeccion/candidatos') {
      return json({ candidatos: 12 })
    }

    if (pathname === '/api/v1/etl/resumen') {
      return json({ corridas_activas: 1, comandos_pendientes: 0, comandos_procesando: 1 })
    }

    if (pathname === '/api/v1/etl/fallos-recientes') {
      return json({
        fallos: 1,
        ultimo_fallo_fecha: '2026-11-22T17:10:00Z',
        ultimo_fallo_tabla: 'Silver.Fact_Conteo_Fenologico',
      })
    }

    if (pathname === '/api/v1/etl/facts') {
      return json([
        {
          nombre_fact: 'fact_ciclo_poda',
          orden: 1,
          tabla_destino: 'Silver.Fact_Ciclo_Poda',
          fuentes_bronce: ['Bronce.Ciclo_Poda'],
          dependencias: ['Silver.Dim_Geografia'],
          marts: ['Gold.Mart_Fenologia'],
          releer_bronce_por_estado: true,
          estrategia_rerun: 'incremental',
        },
        {
          nombre_fact: 'fact_cosecha_sap',
          orden: 2,
          tabla_destino: 'Silver.Fact_Cosecha_SAP',
          fuentes_bronce: ['Bronce.Cosecha_SAP'],
          dependencias: ['Silver.Dim_Geografia', 'Silver.Dim_Variedad'],
          marts: ['Gold.Mart_Cosecha'],
          releer_bronce_por_estado: true,
          estrategia_rerun: 'full_replace',
        },
      ])
    }

    if (pathname === '/api/v1/etl/corridas/activas') {
      return json([
        {
          id_corrida: 'run-2026-1123-001',
          estado: 'EJECUTANDO',
          iniciado_por: 'admin.acp',
          fecha_solicitud: '2026-11-23T09:55:00Z',
          fecha_inicio: '2026-11-23T09:55:05Z',
          modo_ejecucion: 'completo',
        },
      ])
    }

    if (pathname === '/api/v1/etl/corridas/run-2026-1123-001') {
      return json({
        id_corrida: 'run-2026-1123-001',
        iniciado_por: 'admin.acp',
        comentario: 'Corrida matutina campaña 2026',
        estado: 'EJECUTANDO',
        intento_numero: 1,
        max_reintentos: 3,
        fecha_solicitud: '2026-11-23T09:55:00Z',
        fecha_inicio: '2026-11-23T09:55:05Z',
        fecha_fin: null,
        pid_runner: 4820,
        heartbeat_ultimo: '2026-11-23T10:00:00Z',
        timeout_segundos: 3600,
        mensaje_final: null,
        id_log_auditoria: 501,
        modo_ejecucion: 'completo',
        facts: ['fact_ciclo_poda', 'fact_cosecha_sap'],
        incluir_dependencias: true,
        refrescar_gold: true,
        forzar_relectura_bronce: false,
        pasos: [
          {
            id_paso: 1,
            id_corrida: 'run-2026-1123-001',
            nombre_paso: 'Bronce → Dimensiones',
            orden: 1,
            estado: 'OK',
            fecha_inicio: '2026-11-23T09:55:05Z',
            fecha_fin: '2026-11-23T09:56:12Z',
            mensaje_error: null,
          },
          {
            id_paso: 2,
            id_corrida: 'run-2026-1123-001',
            nombre_paso: 'Silver.Fact_Cosecha_SAP',
            orden: 2,
            estado: 'EJECUTANDO',
            fecha_inicio: '2026-11-23T09:56:13Z',
            fecha_fin: null,
            mensaje_error: null,
          },
        ],
      })
    }

    if (pathname === '/api/v1/etl/corridas/run-2026-1123-001/pasos') {
      return json([
        {
          id_paso: 1,
          id_corrida: 'run-2026-1123-001',
          nombre_paso: 'Bronce → Dimensiones',
          orden: 1,
          estado: 'OK',
          fecha_inicio: '2026-11-23T09:55:05Z',
          fecha_fin: '2026-11-23T09:56:12Z',
          mensaje_error: null,
        },
      ])
    }

    if (pathname === '/api/v1/etl/corridas') {
      return json([
        {
          id_log: 501,
          nombre_proceso: 'Pipeline Completo',
          tabla_destino: 'Silver.Fact_Cosecha_SAP',
          nombre_archivo: 'cosecha_sem47.xlsx',
          fecha_inicio: '2026-11-23T09:55:05Z',
          fecha_fin: '2026-11-23T09:58:10Z',
          estado: 'OK',
          filas_insertadas: 18420,
          filas_rechazadas: 12,
          duracion_segundos: 185,
          mensaje_error: null,
          id_corrida: 'run-2026-1123-001',
        },
      ])
    }

    if (pathname === '/api/v1/catalogos/variedades/dim') {
      return json({
        total: 2,
        pagina: 1,
        tamano: 20,
        datos: [
          {
            id_variedad: 1,
            nombre_variedad: 'Biloxi',
            breeder: 'USDA',
            es_activa: true,
            fecha_creacion: '2025-05-01T10:00:00Z',
            fecha_modificacion: '2026-10-01T12:00:00Z',
          },
          {
            id_variedad: 2,
            nombre_variedad: 'Ventura',
            breeder: 'Fall Creek',
            es_activa: true,
            fecha_creacion: '2025-05-02T10:00:00Z',
            fecha_modificacion: '2026-10-01T12:00:00Z',
          },
        ],
      })
    }

    if (pathname === '/api/v1/catalogos/variedades') {
      return json({
        total: 1,
        pagina: 1,
        tamano: 20,
        datos: [{ nombre_canonico: 'Biloxi', breeder: 'USDA', es_activa: true }],
      })
    }

    if (pathname === '/api/v1/catalogos/geografia') {
      return json({
        total: 1,
        pagina: 1,
        tamano: 50,
        datos: [
          {
            id_geografia: 1,
            fundo: 'ACP Norte',
            sector: 'Sector 01',
            modulo: 4,
            turno: 2,
            valvula: 'V-12',
            cama: 'C-08',
            es_test_block: false,
            codigo_sap_campo: 'SAP-040212',
            es_vigente: true,
          },
        ],
      })
    }

    if (pathname === '/api/v1/catalogos/campanas') {
      return json({
        total: 1,
        pagina: 1,
        tamano: 50,
        datos: [
          {
            id_campana: 2026,
            codigo: 'CAMP-2026',
            nombre_campana: 'Campaña Arándano 2026–2027',
            fecha_inicio: '2026-08-01',
            fecha_fin: '2027-02-28',
            es_activa: true,
            estado: 'ACTIVA',
            descripcion: 'Campaña comercial principal',
          },
        ],
      })
    }

    if (pathname === '/api/v1/catalogos/personal') {
      return json({
        total: 3,
        pagina: 1,
        tamano: 20,
        datos: [
          {
            dni: '07451234',
            nombre_completo: 'María José Pérez',
            rol: 'Evaluador',
            sexo: 'F',
            id_planilla: 'PL-9081',
            pct_asertividad: 94.2,
            dias_ausentismo: 1,
          },
          {
            dni: '44881122',
            nombre_completo: 'Jorge Ramírez',
            rol: 'Evaluador',
            sexo: 'M',
            id_planilla: 'PL-9082',
            pct_asertividad: 72.5,
            dias_ausentismo: 6,
          },
          {
            dni: '70112233',
            nombre_completo: 'Elena Castillo',
            rol: 'Cosechador',
            sexo: 'F',
            id_planilla: 'PL-9083',
            pct_asertividad: null,
            dias_ausentismo: 0,
          },
        ],
      })
    }

    if (pathname === '/api/v1/config/parametros') {
      return json({
        total: 3,
        pagina: 1,
        tamano: 200,
        datos: [
          {
            nombre_parametro: 'CAMPANA_ACTIVA',
            valor: '2026-2027',
            descripcion: 'Campaña agrícola vigente para resolución de facts',
            fecha_modificacion: '2026-11-20 08:30:00',
          },
          {
            nombre_parametro: 'CIRCUIT_BREAKER_MAX_RECHAZO_PCT',
            valor: '15',
            descripcion: 'Porcentaje máximo de rechazo permitido por tabla',
            fecha_modificacion: '2026-11-18 14:15:00',
          },
          {
            nombre_parametro: 'PROY_MARGEN_OPTIMISTA',
            valor: '1.0107',
            descripcion: 'Factor optimista de proyección Six-Week',
            fecha_modificacion: '2026-11-15 11:00:00',
          },
        ],
      })
    }

    if (pathname === '/api/v1/config/reglas') {
      return json({
        total: 2,
        pagina: 1,
        tamano: 50,
        kpis: { total: 2, activas: 2, inactivas: 0 },
        datos: [
          {
            tabla_destino: 'Silver.Fact_Cosecha_SAP',
            columna: 'Kg_Neto',
            tipo_validacion: 'RANGO',
            valor_min: 0,
            valor_max: 50000,
            accion: 'CUARENTENA',
            activo: true,
          },
          {
            tabla_destino: 'Silver.Fact_Conteo_Fenologico',
            columna: 'Plantas_Evaluadas',
            tipo_validacion: 'RANGO',
            valor_min: 1,
            valor_max: 100,
            accion: 'CUARENTENA',
            activo: true,
          },
        ],
      })
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

    if (pathname === '/api/v1/ingesta/excel/archivos') {
      return json({
        carpetas: ['cosecha', 'tareo', 'conteo_fenologico'],
        archivos: [
          {
            carpeta: 'cosecha',
            nombre: 'cosecha_sem47.xlsx',
            tamano_bytes: 245760,
            fecha_modificacion: '2026-11-23T09:15:00Z',
            estado: 'entrada',
            tiene_marca_procesado: false,
          },
        ],
      })
    }

    if (pathname === '/api/v1/auditoria/accesos') {
      return json({
        total: 1,
        pagina: 1,
        tamano: 50,
        items: [
          {
            id_acceso: 901,
            fecha: '2026-11-23T09:50:00Z',
            nombre_usuario: 'admin.acp',
            rol: 'admin',
            accion: 'LOGIN_OK',
            modulo: 'Auth',
            metodo: 'POST',
            ruta: '/auth/login',
            estado_http: 200,
            ip: '10.20.1.14',
            request_id: 'req-login-20261123-01',
            detalle: 'Inicio de sesión exitoso',
          },
        ],
      })
    }

    if (pathname === '/api/v1/auditoria/bitacora/resumen') {
      return json({
        ventana_dias: 7,
        total: 42,
        ok: 40,
        errores: 2,
        en_proceso: 0,
        filas_ok: 245800,
        filas_rechazadas: 312,
        tasa_exito_pct: 95.2,
      })
    }

    if (pathname === '/api/v1/auditoria/bitacora') {
      return json({
        total: 1,
        pagina: 1,
        tamano: 50,
        items: [
          {
            id_log: 501,
            nombre_proceso: 'Silver.Fact_Cosecha_SAP',
            tabla_destino: 'Silver.Fact_Cosecha_SAP',
            nombre_archivo: 'cosecha_sem47.xlsx',
            fecha_inicio: '2026-11-23T09:55:05Z',
            fecha_fin: '2026-11-23T09:58:10Z',
            estado: 'OK',
            filas_insertadas: 18420,
            filas_rechazadas: 12,
            duracion_segundos: 185,
            mensaje_error: null,
            id_corrida: 'run-2026-1123-001',
          },
        ],
      })
    }

    return json({})
  })
}

async function assertCleanPageAndA11y(page: Page, consoleErrors: string[], pageErrors: string[]) {
  await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(250)

  expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([])
  expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toEqual([])

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const horizontalOverflow = doc.scrollWidth - window.innerWidth
    const h1Count = document.querySelectorAll('h1').length
    const hasMain = Boolean(document.querySelector('main'))
    const unlabeledButtons = Array.from(document.querySelectorAll('button')).filter((btn) => {
      const style = window.getComputedStyle(btn)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const text = (btn.textContent || '').trim()
      const aria = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim()
      return !text && !aria
    }).length

    return { horizontalOverflow, h1Count, hasMain, unlabeledButtons }
  })

  expect(metrics.horizontalOverflow, 'Horizontal overflow detected').toBeLessThanOrEqual(2)
  expect(metrics.h1Count, 'Missing primary <h1> heading').toBeGreaterThanOrEqual(1)
  expect(metrics.unlabeledButtons, 'Visible button without accessible label').toBe(0)
}

test.describe('ACP Control Web — Visual, Layout & A11y Audit', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  test('Login screen renders cleanly without overflow or errors', async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await mockBackendApi(page)
    await page.goto('/login')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await assertCleanPageAndA11y(page, consoleErrors, pageErrors)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `login-${testInfo.project.name}.png`),
      fullPage: false,
    })
  })

  const routes = [
    { name: 'dashboard', path: '/' },
    { name: 'etl', path: '/etl' },
    { name: 'cuarentena', path: '/cuarentena' },
    { name: 'maestros-variedades', path: '/maestros?tab=variedades' },
    { name: 'maestros-geografia', path: '/maestros?tab=geografia' },
    { name: 'maestros-campanas', path: '/maestros?tab=campanas' },
    { name: 'operarios', path: '/operarios' },
    { name: 'config-parametros', path: '/configuracion?tab=parametros' },
    { name: 'config-biologia', path: '/configuracion?tab=biologia' },
    { name: 'config-reglas', path: '/configuracion?tab=reglas' },
    { name: 'config-usuarios', path: '/configuracion?tab=usuarios' },
    { name: 'auditoria', path: '/auditoria?tab=bitacora' },
    { name: 'auditoria-ingesta', path: '/auditoria?tab=ingesta' },
    { name: 'auditoria-accesos', path: '/auditoria?tab=accesos' },
  ]

  for (const r of routes) {
    test(`Module ${r.name} (${r.path}) passes layout, console and a11y checks`, async ({ page }, testInfo) => {
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      page.on('pageerror', (err) => pageErrors.push(err.message))

      await seedAuthSession(page)
      await mockBackendApi(page)
      await page.goto(r.path)

      await expect(page.locator('main')).toBeVisible()
      await assertCleanPageAndA11y(page, consoleErrors, pageErrors)

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${r.name}-${testInfo.project.name}.png`),
        fullPage: false,
      })
    })
  }
})
