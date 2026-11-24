import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { rolCumpleNivel, useAuthStore, type RolUsuario } from '@/shared/auth/authStore'

interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

interface RequireRoleProps {
  minRole: RolUsuario
  children: ReactNode
  fallback?: ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  viewer: 'Viewer (Solo lectura)',
  analista_mdm: 'Analista MDM',
  operador_etl: 'Operador ETL',
  admin: 'Administrador',
}

export function RequireRole({ minRole, children, fallback }: RequireRoleProps) {
  const usuario = useAuthStore((s) => s.usuario)
  const navigate = useNavigate()

  if (rolCumpleNivel(usuario?.rol, minRole)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-500/25">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <CardTitle>Acceso restringido</CardTitle>
              <CardDescription>Permisos insuficientes para este módulo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tu sesión activa no cumple con el nivel mínimo requerido para operar esta vista.
          </p>
          <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Rol actual</span>
              <StatusBadge label={ROLE_LABELS[usuario?.rol ?? ''] ?? usuario?.rol ?? 'desconocido'} tone="readonly" showDot={false} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Nivel requerido</span>
              <StatusBadge label={ROLE_LABELS[minRole] ?? minRole} tone="warning" showDot={false} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="size-3.5" />
              Volver al Centro de Control
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
