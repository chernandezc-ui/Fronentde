import { expect, test, type Page } from '@playwright/test'

const ADMIN_USER = {
  nombre_usuario: 'admin.acp',
  nombre_display: 'Carlos Hernández',
  rol: 'admin',
  email: 'carlos@acp.pe',
}

const VIEWER_USER = {
  nombre_usuario: 'viewer.acp',
  nombre_display: 'Visitante Solo Lectura',
  rol: 'viewer',
  email: 'viewer@acp.pe',
}

async function seedSession(page: Page, user = ADMIN_USER) {
  await page.addInitScript((u) => {
    window.localStorage.setItem(
      'acp-control-auth',
      JSON.stringify({
        state: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.chaos-token',
          usuario: u,
        },
        version: 0,
      }),
    )
    window.localStorage.setItem('acp-control-theme', 'dark')
  }, user)
}

const ALL_APP_ROUTES = [
  '/',
  '/etl',
  '/cuarentena',
  '/maestros?tab=variedades',
  '/maestros?tab=geografia',
  '/operarios',
  '/configuracion?tab=parametros',
  '/configuracion?tab=biologia',
  '/configuracion?tab=usuarios',
  '/auditoria?tab=bitacora',
  '/auditoria?tab=ingesta',
]

test.describe('Chaos & Break Tests — Stress, Fault Injection & Security', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('CHAOS 1: Total Backend Outage (HTTP 500 + 502 HTML) does not white-screen crash any module', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await seedSession(page)
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/me') {
        return route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:4173',
          },
          body: JSON.stringify(ADMIN_USER),
        })
      }
      if (path.includes('stream') || path.endsWith('/eventos')) {
        return route.fulfill({
          status: 502,
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': 'http://localhost:4173',
          },
          body: '<html><body>502 Bad Gateway</body></html>',
        })
      }
      return route.fulfill({
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
          'X-Request-ID': 'chaos-500-trace',
        },
        body: JSON.stringify({ detail: 'Simulated SQL Server crash' }),
      })
    })

    for (const r of ALL_APP_ROUTES) {
      await page.goto(r)
      await page.waitForTimeout(500)
      const bodyText = (await page.locator('body').textContent()) ?? ''
      expect(bodyText.trim().length, `Blank screen on ${r} during 500 outage`).toBeGreaterThan(20)
      expect(bodyText, `React Router uncaught crash screen on ${r}`).not.toContain('Unexpected Application Error')
    }

    expect(pageErrors, `Uncaught JS exceptions during 500 outage: ${pageErrors.join(' | ')}`).toEqual([])
  })

  test('CHAOS 2: Malformed / Poisoned 200 JSON contracts ({}, null arrays) expose missing defensive guards', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const pageErrors: string[] = []
    const crashedRoutes: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await seedSession(page)
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, async (route) => {
      const path = new URL(route.request().url()).pathname
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:4173',
      }
      if (path === '/auth/me') {
        return route.fulfill({ status: 200, headers, body: JSON.stringify(ADMIN_USER) })
      }
      if (path.includes('stream') || path.endsWith('/eventos')) {
        return route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': 'http://localhost:4173',
          },
          body: 'event: telemetria\ndata: {CORRUPT_JSON_PAYLOAD\n\n',
        })
      }
      // Poisoned contract: valid HTTP 200 JSON, but missing arrays / nulls everywhere!
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          total: null,
          datos: null,
          items: null,
          pasos: null,
          kpis: null,
          base_datos: null,
        }),
      })
    })

    for (const r of ALL_APP_ROUTES) {
      const beforeCount = pageErrors.length
      await page.goto(r)
      await page.waitForTimeout(600)
      const bodyText = (await page.locator('body').textContent()) ?? ''
      if (bodyText.includes('Unexpected Application Error') || pageErrors.length > beforeCount) {
        crashedRoutes.push(r)
      }
    }

    expect(
      crashedRoutes,
      `DEBILIDAD CRITICA: rutas que colapsaron ante JSON 200 malformado/nulo: ${crashedRoutes.join(', ')} | Errores: ${pageErrors.join(' | ')}`,
    ).toEqual([])
  })

  test('CHAOS 3: Corrupted localStorage auth state recovers cleanly instead of crashing boot', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.addInitScript(() => {
      window.localStorage.setItem('acp-control-auth', '{CORRUPT_JSON_STORAGE')
    })
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, (route) =>
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: JSON.stringify({ estado: 'activo', base_datos: { conectado: true } }),
      }),
    )

    await page.goto('/')
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/login/)
    expect(pageErrors).toEqual([])
  })

  test('CHAOS 4: Mid-flight HTTP 401 session expiry redirects cleanly to /login without crash loop', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await seedSession(page)
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/health') {
        return route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:4173',
          },
          body: JSON.stringify({ estado: 'activo', base_datos: { conectado: true } }),
        })
      }
      return route.fulfill({
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: JSON.stringify({ detail: 'Token expirado' }),
      })
    })

    await page.goto('/cuarentena')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
    expect(pageErrors).toEqual([])
  })

  test('CHAOS 5: RBAC Enforcement — viewer blocked from /configuracion & no unauthorized /auth/usuarios call', async ({
    page,
  }) => {
    const forbiddenCalls: string[] = []
    await seedSession(page, VIEWER_USER)
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/auth/usuarios' || path.startsWith('/api/v1/reinyeccion')) {
        forbiddenCalls.push(path)
      }
      if (path === '/auth/me') {
        return route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'http://localhost:4173',
          },
          body: JSON.stringify(VIEWER_USER),
        })
      }
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'http://localhost:4173',
        },
        body: JSON.stringify({ total: 0, pagina: 1, tamano: 20, datos: [], items: [] }),
      })
    })

    await page.goto('/configuracion?tab=usuarios')
    await page.waitForTimeout(500)
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body.toLowerCase()).toMatch(/acceso|permiso|restringido|rol/)

    await page.goto('/cuarentena')
    await page.waitForTimeout(500)
    expect(
      forbiddenCalls,
      `Viewer triggered privileged endpoints: ${forbiddenCalls.join(', ')}`,
    ).toEqual([])
  })

  test('CHAOS 6: XSS payloads + 300-char unbroken strings do not execute scripts or blow up page layout', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const xssPayload = '<img src=x onerror="window.__xssTriggered=true"><script>window.__xssTriggered=true</script>'
    const giantToken = 'SUPER_LONG_UNBROKEN_IDENTIFIER_'.repeat(12) // ~372 chars without spaces

    await seedSession(page)
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, (route) => {
      const path = new URL(route.request().url()).pathname
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:4173',
      }
      if (path === '/auth/me') return route.fulfill({ status: 200, headers, body: JSON.stringify(ADMIN_USER) })
      if (path.includes('stream')) {
        return route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': 'http://localhost:4173' },
          body: '',
        })
      }
      if (path === '/api/v1/cuarentena/resumen') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({ total: 99999999, pendientes: 99999999, resueltos: 0, descartados: 0 }),
        })
      }
      if (path === '/api/v1/cuarentena') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            total: 1,
            pagina: 1,
            tamano: 20,
            datos: [
              {
                tabla_origen: `Bronce.${giantToken}`,
                id_registro: '../../id?x=1#y',
                columna_origen: xssPayload,
                valor_raw: `${xssPayload} ${giantToken}`,
                nombre_archivo: `${giantToken}.xlsx`,
                fecha_ingreso: '2026-11-23',
                estado: 'PENDIENTE',
                motivo: `${xssPayload} ${giantToken}`,
                valor_corregido: null,
                id_registro_origen: 1,
              },
            ],
          }),
        })
      }
      if (path === '/api/v1/catalogos/personal') {
        return route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify({
            total: 1,
            pagina: 1,
            tamano: 20,
            datos: [
              {
                dni: giantToken,
                nombre_completo: `${xssPayload} ${giantToken}`,
                rol: giantToken,
                sexo: 'X',
                id_planilla: giantToken,
                pct_asertividad: 99999,
                dias_ausentismo: 999999,
              },
            ],
          }),
        })
      }
      return route.fulfill({ status: 200, headers, body: JSON.stringify({ total: 0, pagina: 1, tamano: 20, datos: [], items: [], candidatos: 0 }) })
    })

    for (const r of ['/cuarentena', '/operarios']) {
      await page.goto(r)
      await page.waitForTimeout(500)
      const check = await page.evaluate(() => ({
        xss: Boolean((window as unknown as Record<string, unknown>).__xssTriggered),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }))
      expect(check.xss, `XSS executed on ${r}`).toBe(false)
      expect(check.overflow, `DEBILIDAD LAYOUT: texto extremo de 370+ chars desbordó la página ${r} por ${check.overflow}px`).toBeLessThanOrEqual(4)
    }

    expect(pageErrors).toEqual([])
  })

  test('CHAOS 7: Rapid route thrashing under staggered API latency produces zero race crashes', async ({
    page,
  }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await seedSession(page)
    let reqCount = 0
    await page.route(/^https?:\/\/(localhost|127\.0\.0\.1):8810\//, async (route) => {
      reqCount += 1
      const delay = (reqCount % 4) * 120
      await new Promise((r) => setTimeout(r, delay))
      const path = new URL(route.request().url()).pathname
      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:4173',
      }
      if (path === '/auth/me') return route.fulfill({ status: 200, headers, body: JSON.stringify(ADMIN_USER) })
      if (path.includes('stream')) {
        return route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': 'http://localhost:4173' },
          body: '',
        })
      }
      return route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          total: 0,
          pagina: 1,
          tamano: 20,
          datos: [],
          items: [],
          kpis: { total: 0, activas: 0, inactivas: 0 },
        }),
      })
    })

    await page.goto('/')
    await page.locator('aside').waitFor({ state: 'visible' })
    const links = ['Monitor ETL', 'Cuarentena', 'Datos Maestros', 'Operarios', 'Configuración', 'Auditoría', 'Centro de Control']
    for (let round = 0; round < 2; round += 1) {
      for (const label of links) {
        await page.locator('aside').getByRole('link', { name: label }).click()
        await page.waitForTimeout(80)
      }
    }
    await page.waitForTimeout(800)
    expect(pageErrors, `Race condition crash during rapid navigation: ${pageErrors.join(' | ')}`).toEqual([])
  })
})
