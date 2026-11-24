# ACP Control Web

Interfaz web operativa (*Data Control Plane*) desacoplada para gobernar el ecosistema **ACP Data Warehouse** (ETL Python + SQL Server + API FastAPI en `http://localhost:8810`).

## Módulos implementados (Etapa 1)

| Módulo | Ruta | Alcance |
| :--- | :--- | :--- |
| **Autenticación y RBAC** | `/login` | Login OAuth2 (`/auth/login`), validación JWT (`/auth/me`), cambio de clave y jerarquía `viewer < analista_mdm < operador_etl < admin` |
| **Centro de Control** | `/` | Salud API/BD/Runner (`/health*`), telemetría SSE en vivo (`/health/telemetria/stream`), KPIs de cuarentena/auditoría/fallos y alertas con *ack* persistente |
| **Monitor y Control ETL** | `/etl` | Catálogo de facts (`/api/v1/etl/facts`), lanzador de corridas completas o dirigidas, consola SSE autenticada con JWT, traza de pasos, cancelación, historial y vista previa |
| **Cuarentena y Reinyección** | `/cuarentena` | Resumen, bandeja server-side con URL sync, drawer solucionador (homologar / descartar) y reinyección masiva (`/api/v1/reinyeccion/*`) |
| **Datos Maestros** | `/maestros` | CRUD completo de `Silver.Dim_Variedad` (`admin`), catálogo MDM y buscador server-side de `Silver.Dim_Geografia` |
| **Operarios** | `/operarios` | Padrón `Silver.Dim_Personal` con semáforo de `pct_asertividad`, ausentismo y drawer de incidencias cruzadas con cuarentena |
| **Configuración y Biología** | `/configuracion` | Parámetros del pipeline (individual/lote), editor de **Matriz Biológica Six-Week** con cierre residual y validación `<= 100%`, reglas de validación y gestión de usuarios (`admin`) |
| **Auditoría e Ingesta** | `/auditoria` | Bitácora paginada server-side con filtros multi-estado/fechas, detalle de error completo, pre-validador CSV y exportación CSV autenticada |

## Stack

- React 19 + TypeScript + Vite 8 (puerto `3000`)
- Tailwind CSS v4 + shadcn/ui (`@base-ui/react`) + Lucide + Motion + Sonner + cmdk
- TanStack Query v5 + TanStack Table v9 + React Router v7 + Zustand + React Hook Form + Zod v4
- `@microsoft/fetch-event-source` (SSE con Bearer JWT) + Apache ECharts
- Vitest + Testing Library + Playwright + Oxlint

## Desarrollo local

```bash
cp .env.example .env
npm install
npm run dev
```

Abre `http://localhost:3000` (el backend FastAPI debe responder en `http://localhost:8810` con `http://localhost:3000` en `ACP_CORS_ORIGENES`).

## Scripts de verificación

```bash
npm run lint      # Oxlint
npm run test      # Vitest (58 pruebas unitarias)
npm run build     # TypeScript strict + build de producción Vite
npm run test:e2e  # Playwright visual, responsive (1440/1024/390) y accesibilidad
```
