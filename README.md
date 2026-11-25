# ACP Control Web

Interfaz web operativa (*Data Control Plane*) desacoplada para gobernar el ecosistema **ACP Data Warehouse** (ETL Python + SQL Server + API FastAPI en `http://localhost:8810`).

## Módulos implementados (Etapa 1 + Etapa 2)

| Módulo | Ruta | Alcance |
| :--- | :--- | :--- |
| **Autenticación y RBAC** | `/login` | Login OAuth2 (`/auth/login`), validación JWT (`/auth/me`), cambio de clave, limpieza automática de caché ante `401` y jerarquía `viewer < analista_mdm < operador_etl < admin` |
| **Centro de Control** | `/` | Salud API/BD/Runner (`/health*`), telemetría SSE singleton (`/health/telemetria/stream`), stream de calidad (`/health/calidad/stream`), KPIs y alertas con *ack* persistente |
| **Monitor y Control ETL** | `/etl` | Catálogo de facts (`/api/v1/etl/facts`), lanzador de corridas completas o dirigidas, consola SSE autenticada con JWT, traza de pasos, cancelación, historial y vista previa |
| **Cuarentena y Reinyección** | `/cuarentena` | Resumen, bandeja server-side con URL sync, resolución individual y en lote (`/api/v1/cuarentena/*`) y reinyección controlada (`/api/v1/reinyeccion/*`) |
| **Proyecciones Six-Week** | `/proyecciones` | Selector de corte (`ID_Tiempo`), cascada geográfica (`Fundo → Módulo → Variedad → Condición`), semáforo de integridad Silver, bandas pesimista/optimista, envío explícito de matriz biológica, curva semanal `W1–W6`, desglose por unidad/variedad/fundo y exportación CSV |
| **Datos Maestros** | `/maestros` | CRUD de `Silver.Dim_Variedad`, Catálogo MDM, `Silver.Dim_Geografia` y `Silver.Dim_Campana` con tabs sincronizados en URL |
| **Operarios** | `/operarios` | Padrón `Silver.Dim_Personal` con semáforo de `pct_asertividad`, ausentismo, gestión de padrón y drawer de incidencias cruzadas con cuarentena |
| **Configuración y Biología** | `/configuracion` | Parámetros del pipeline (individual/lote), editor de **Matriz Biológica Six-Week** con cierre residual y validación `<= 100%`, constantes del motor, reglas DQ y gestión de usuarios (`admin`) |
| **Auditoría e Ingesta** | `/auditoria` | Bitácora paginada server-side, pre-validador y exportación CSV, gestor de archivos Excel de ingesta y auditoría de accesos |

## Stack

- React 19 + TypeScript 7 + Vite 8 / Rolldown (puerto `3000`)
- Tailwind CSS v4 + shadcn/ui (`@base-ui/react`) + Lucide + Motion + Sonner + cmdk
- TanStack Query v5 + TanStack Table v9 + React Router v7 (lazy routes) + Zustand v5 + React Hook Form + Zod v4
- `@microsoft/fetch-event-source` (SSE con Bearer JWT)
- Vitest v5 + Playwright + Oxlint

## Desarrollo local

```bash
cp .env.example .env
npm install
npm run dev
```

Abre `http://localhost:3000` (el backend FastAPI debe responder en `http://localhost:8810` con `http://localhost:3000` en `ACP_CORS_ORIGENES`).

## Scripts de verificación

```bash
npm run lint      # Oxlint (0 errores, 0 warnings)
npm run test      # Vitest (88 pruebas unitarias y de resiliencia)
npm run build     # TypeScript + build de producción Vite/Rolldown
npm run test:e2e  # Playwright visual, responsive (1440/1024/390), accesibilidad y chaos tests
```
