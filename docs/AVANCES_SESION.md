# Avances de Sesión — Módulo Six-Week (`/proyecciones`) y Limpieza Frontend

**Fecha:** 2026-11-24  
**Repositorio principal trabajado:** `d:\DAtaware\Fronentde` (`main`)

---

## Resumen Ejecutivo

Durante esta sesión se analizó el frontend completo y la documentación de negocio de **proyecciones Six-Week**, se diseñó e implementó desde cero el módulo `/proyecciones` con un **flujo guiado de 4 etapas**, se limpiaron advertencias y deuda técnica en el frontend, y se validó el módulo con pruebas unitarias, de resiliencia (chaos), accesibilidad/visual y E2E en 3 viewports (`1440px`, `1024px`, `390px`).

---

## 1. Frontend (`Fronentde`) — Nuevo Módulo `/proyecciones`

### Flujo guiado de 4 etapas
Rediseñado para evitar sobrecarga visual y seguir el flujo operativo real de proyección agrícola (`Corte → Cobertura → Supuestos → Simulación → Inspección/Comparación → Publicación`):

1. **Paso 1 — Corte y cobertura (`StepCorteCobertura.tsx`)**
   - Selección de fecha de corte y filtros en cascada (fundo, variedad, módulo, turno, válvula) en grilla responsiva (`sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`).
   - Indicador en línea de disponibilidad de las 3 fuentes requeridas antes de simular.
2. **Paso 2 — Supuestos y simulación (`StepSupuestosSimulacion.tsx` + `MatrizBiologicaSheet.tsx`)**
   - Bandas de sensibilidad con traducción porcentual, presets rápidos y resumen compacto de biología.
   - Panel lateral (`Sheet`) con mapa de calor `7×6` de la matriz biológica, constantes activas y acceso directo a `/configuracion?tab=biologia`.
   - Acción principal **Calcular simulación** (`POST /api/v1/proyecciones/simular`) sin persistir todavía en base de datos, con manejo de fallback si el endpoint devuelve `404`.
3. **Paso 3 — Inspección y comparación (`StepInspeccionComparacion.tsx`)**
   - Banner diferenciado entre **Borrador (simulación)** y **Versión publicada**.
   - **KPIs unificados (`ProyeccionKpiGrid.tsx`):** corregido el caso donde cobertura `null` se mostraba como observada en verde; ahora muestra `No disponible`.
   - **Gráfico semanal interactivo (`ProyeccionWeeklyChart.tsx`):** SVG con tokens `--chart-1`/`--chart-2`, inspector de semana activa por hover/click/teclado, selector `kg | t`, línea punteada de promedio semanal y tabla sincronizada con barras porcentuales y total de 6 semanas.
   - **Tabla de detalle (`ProyeccionDetailTable.tsx`):** búsqueda, agrupación `Por válvula | Por variedad | Por fundo | Por certificación`, paginación y exportación CSV con BOM UTF-8.
   - **Comparador de escenarios (`ScenarioCompareView.tsx`):** conserva hasta 5 snapshots de la sesión con deltas lado a lado para W1–W6.
4. **Paso 4 — Publicar versión (`StepPublicarVersion.tsx` + `ConfirmExecuteDialog.tsx`)**
   - Checklist final de revisión, detalles técnicos plegables (`<details>`), recibo de publicación y diálogo de confirmación explícita antes de ejecutar `POST /api/v1/proyecciones/ejecutar`.

### Estado, arquitectura y navegación
- **Navegación persistente y control de vigencia:**
  - `ProyeccionStepper.tsx`: stepper accesible (`aria-current="step"`, navegación por teclado `←`/`→` y progreso compacto en móvil).
  - `ProyeccionContextStrip.tsx`: resumen fijo del corte/alcance con detección automática de cambios (`Desactualizado`) y CTA `Recalcular`.
- **Máquina de estados y utilidades puras:**
  - `src/features/proyecciones/proyeccionesWorkflow.ts` (`computeInputFingerprint`, `isRunStale`, `computeStepStates`, `compareSnapshots`, `isCoberturaDisponible`, `formatMarginPctDelta`).
  - `src/features/proyecciones/useProyeccionFlow.ts`, `proyeccionesUtils.ts`, `proyeccionesApi.ts`, `useProyeccionesQueries.ts`, `types.ts`.
- **Endpoints e integración global:**
  - `src/shared/api/endpoints.ts`: agregados `proyecciones.{fechas, combinaciones, integridad, matriz, ejecutar, simular}`.
  - Enrutado en `src/app/router.tsx`, navegación en sidebar + `Ctrl+K` (`src/app/layouts/AppShell.tsx`) y enlace directo desde `MatrizBiologicaTab.tsx`.

---

## 2. Frontend — Limpieza Técnica y Calidad

- **Seguridad de sesión / caché:** limpieza automática del caché de TanStack Query ante cualquier cierre de sesión (incluyendo respuestas `401` HTTP/SSE) mediante suscripción en `src/app/providers.tsx`.
- **Oxlint en cero advertencias:** resueltos los 11 warnings `react/only-export-components` extrayendo `src/app/routeComponents.tsx`, `src/shared/components/statusTone.ts`, `src/components/ui/button-variants.ts` y ajustando `badge.tsx` y `tabs.tsx`.
- **Componentes redundantes:** eliminados `<TooltipProvider>` anidados innecesarios en `MaestrosPage.tsx`, `OperariosPage.tsx` y `ConfiguracionPage.tsx`.
- **Dependencias y documentación:** `shadcn` movido de `dependencies` a `devDependencies` en `package.json`, y `README.md` actualizado para reflejar Etapa 1 + Etapa 2 + `/proyecciones`.

---

## 3. Verificación y Pruebas Ejecutadas (Frontend)

| Validación | Resultado | Detalle |
| --- | --- | --- |
| `npm run lint` (Oxlint) | **OK (0 errores, 0 warnings)** | 156 archivos analizados |
| `npm run test` (Vitest) | **OK (9/9 suites, 92/92 tests)** | Incluye `proyecciones.test.ts` (7 tests), `proyeccionesWorkflow.test.ts` (4 tests) y `endpoints.test.ts` |
| `npm run build` (`tsc -b` + Vite) | **OK** | Compilación limpia en 464 ms |
| `e2e/visual-and-a11y.spec.ts` (`proyecciones`) | **OK (3/3)** | `desktop-1440`, `tablet-1024`, `mobile-390` |
| `e2e/chaos-break-tests.spec.ts` | **OK (7/7)** | CHAOS 1–7 (caídas 500/502, JSON malformado, 401, RBAC, XSS, stress) |
| `e2e/proyecciones-flow.spec.ts` *(nuevo)* | **OK (6/6)** | Flujo completo 4 etapas + `Desactualizado` + comparar escenarios + publicar + solo lectura para rol `viewer` en los 3 viewports |

---

## 4. Commits Realizados en el Frontend (`Fronentde`)

1. **`29ada36`** — `feat(proyecciones,ui): agregar modulo Six-Week en 4 etapas y limpieza frontend`  
   - 45 archivos modificados/creados (`+5395 / -162` líneas).
2. **`38f0d3f`** — `test(e2e): cubrir flujo guiado de 4 etapas y RBAC en /proyecciones`  
   - `e2e/proyecciones-flow.spec.ts` (`+292` líneas).

> Nota: Ambos commits quedaron en la rama local `main` sin `push` al remoto.

---

## 5. Contexto del Backend (`ProYEcto-DWH-Tes`) y Hallazgos Pendientes

> Por indicación final de la sesión, el backend se dejó sin modificaciones adicionales (quedó en commit local `0018953` en `main`, 2 commits por delante de `origin/main` `24134d0`).

### Avances previos registrados en `0018953`
- Parametrización de `calcular_proyeccion(..., constantes=None)`, constantes biológicas por defecto y cálculo comparativo semanal en `backend/dominio/proyecciones.py`.
- Guardado atómico en una sola transacción en `repo_proyecciones.guardar_proyeccion`.
- Endpoints `GET/PUT /api/v1/proyecciones/constantes` y `POST /api/v1/proyecciones/simular` + pruebas (`119/119` en `pytest`).

### Hallazgos detectados al revisar logs del backend/runner (para atender cuando se retome el backend)
1. **Persistencia de parámetros (`Config.Parametros_Pipeline`):** `repo_proyecciones.guardar_param_json` referencia columnas `Modulo` y `Tipo_Dato` inexistentes en la tabla (`pyodbc.ProgrammingError 207`), y la columna `Valor` es `NVARCHAR(500)`.
2. **Serialización de `datetime` en health/locks (`rutas_health.py:161`):** `/health/ready/runner`, `/health/ready/control` y `/health/lock` lanzan `TypeError: Object of type datetime is not JSON serializable` sobre `fecha_adquisicion` cuando hay un lock activo.
3. **Recarga del servidor:** la instancia en ejecución había iniciado con `reload=False`, por lo que requiere reinicio para reflejar cambios en código.
4. **Historial Git en `main`:** evaluar si mover los 2 commits locales (`afd9b15`, `0018953`) a una rama feature o resetear `main` a `origin/main`, y opcionalmente borrar la rama remota `origin/work` ya mergeada.

---

## 6. Próximos Pasos Sugeridos (Frontend)

- Ejecutar la suite completa `npm run test:e2e` para validar regresión transversal en todos los módulos.
- Revisar/refactorizar páginas extensas pendientes (por ejemplo `DashboardPage.tsx` o `MatrizBiologicaTab.tsx`) con el mismo enfoque modular aplicado a `/proyecciones`.
- Validar visualmente el flujo completo de `/proyecciones` contra el backend real una vez resueltos los 2 bugs registrados en el servidor.
