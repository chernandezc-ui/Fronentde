import { Navigate, createBrowserRouter } from 'react-router-dom'
import { RequireAuth, RequireRole } from '@/shared/auth/RoleGuard'
import { RouteErrorBoundary } from '@/shared/components/RouteErrorBoundary'
import { AppShell } from '@/app/layouts/AppShell'
import {
  AuditoriaPage,
  ConfiguracionPage,
  CuarentenaPage,
  EtlMonitorPage,
  LazyModule,
  MaestrosPage,
  OperariosPage,
  ProyeccionesPage,
} from '@/app/routeComponents'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

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
              <LazyModule>
                <EtlMonitorPage />
              </LazyModule>
            ),
          },
          {
            path: 'cuarentena',
            element: (
              <LazyModule>
                <CuarentenaPage />
              </LazyModule>
            ),
          },
          {
            path: 'proyecciones',
            element: (
              <LazyModule>
                <ProyeccionesPage />
              </LazyModule>
            ),
          },
          {
            path: 'maestros',
            element: (
              <LazyModule>
                <MaestrosPage />
              </LazyModule>
            ),
          },
          {
            path: 'operarios',
            element: (
              <LazyModule>
                <OperariosPage />
              </LazyModule>
            ),
          },
          {
            path: 'configuracion',
            element: (
              <RequireRole minRole="analista_mdm">
                <LazyModule>
                  <ConfiguracionPage />
                </LazyModule>
              </RequireRole>
            ),
          },
          {
            path: 'auditoria',
            element: (
              <LazyModule>
                <AuditoriaPage />
              </LazyModule>
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
