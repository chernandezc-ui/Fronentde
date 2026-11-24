import { Suspense, lazy } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { RequireAuth, RequireRole } from '@/shared/auth/RoleGuard'
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary'
import { AppShell } from '@/app/layouts/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

const EtlMonitorPage = lazy(() =>
  import('@/features/etl/EtlMonitorPage').then((m) => ({ default: m.EtlMonitorPage })),
)

const CuarentenaPage = lazy(() =>
  import('@/features/cuarentena/CuarentenaPage').then((m) => ({ default: m.CuarentenaPage })),
)

const MaestrosPage = lazy(() =>
  import('@/features/maestros/MaestrosPage').then((m) => ({ default: m.MaestrosPage })),
)

const OperariosPage = lazy(() =>
  import('@/features/operarios/OperariosPage').then((m) => ({ default: m.OperariosPage })),
)

const ConfiguracionPage = lazy(() =>
  import('@/features/configuracion/ConfiguracionPage').then((m) => ({
    default: m.ConfiguracionPage,
  })),
)

const AuditoriaPage = lazy(() =>
  import('@/features/auditoria/AuditoriaPage').then((m) => ({ default: m.AuditoriaPage })),
)

function ModuleRouteFallback() {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <span>Cargando módulo…</span>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'etl',
            element: (
              <Suspense fallback={<ModuleRouteFallback />}>
                <EtlMonitorPage />
              </Suspense>
            ),
          },
          {
            path: 'cuarentena',
            element: (
              <Suspense fallback={<ModuleRouteFallback />}>
                <CuarentenaPage />
              </Suspense>
            ),
          },
          {
            path: 'maestros',
            element: (
              <Suspense fallback={<ModuleRouteFallback />}>
                <MaestrosPage />
              </Suspense>
            ),
          },
          {
            path: 'operarios',
            element: (
              <Suspense fallback={<ModuleRouteFallback />}>
                <OperariosPage />
              </Suspense>
            ),
          },
          {
            path: 'configuracion',
            element: (
              <RequireRole minRole="analista_mdm">
                <Suspense fallback={<ModuleRouteFallback />}>
                  <ConfiguracionPage />
                </Suspense>
              </RequireRole>
            ),
          },
          {
            path: 'auditoria',
            element: (
              <Suspense fallback={<ModuleRouteFallback />}>
                <AuditoriaPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
