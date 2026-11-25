import { Suspense, lazy, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export const EtlMonitorPage = lazy(() =>
  import('@/features/etl/EtlMonitorPage').then((m) => ({ default: m.EtlMonitorPage })),
)

export const CuarentenaPage = lazy(() =>
  import('@/features/cuarentena/CuarentenaPage').then((m) => ({ default: m.CuarentenaPage })),
)

export const MaestrosPage = lazy(() =>
  import('@/features/maestros/MaestrosPage').then((m) => ({ default: m.MaestrosPage })),
)

export const OperariosPage = lazy(() =>
  import('@/features/operarios/OperariosPage').then((m) => ({ default: m.OperariosPage })),
)

export const ProyeccionesPage = lazy(() =>
  import('@/features/proyecciones/ProyeccionesPage').then((m) => ({ default: m.ProyeccionesPage })),
)

export const ConfiguracionPage = lazy(() =>
  import('@/features/configuracion/ConfiguracionPage').then((m) => ({
    default: m.ConfiguracionPage,
  })),
)

export const AuditoriaPage = lazy(() =>
  import('@/features/auditoria/AuditoriaPage').then((m) => ({ default: m.AuditoriaPage })),
)

export function LazyModule({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[45vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Cargando módulo…</span>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
