import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Activity,
  AlertCircle,
  Clock,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  Server,
  Sun,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { API_BASE_URL, ApiError } from '@/shared/api/client'
import { useAuthStore } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import { useTheme } from '@/shared/lib/theme'
import { fetchPublicHealth, loginRequest } from '@/features/auth/authApi'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresa tu nombre de usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LocationState {
  from?: {
    pathname?: string
    search?: string
  }
}

export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState<{
    title: string
    message: string
    isRateLimit: boolean
    requestId: string | null
    status: number | null
  } | null>(null)

  const healthQuery = useQuery({
    queryKey: ['public-health'],
    queryFn: fetchPublicHealth,
    retry: 0,
    refetchInterval: 30_000,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const state = (location.state as LocationState | null) ?? null
  const redirectPath =
    state?.from?.pathname && state.from.pathname !== '/login'
      ? `${state.from.pathname}${state.from.search ?? ''}`
      : '/'

  if (token) {
    return <Navigate to={redirectPath} replace />
  }

  async function onSubmit(values: LoginFormValues) {
    setLoginError(null)
    try {
      const response = await loginRequest(values.username, values.password)
      setSession(response.access_token, response.usuario)
      toast.success(`Sesión iniciada como ${response.usuario.nombre_display}`)
      navigate(redirectPath, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setLoginError({
            title: 'Límite de intentos alcanzado (HTTP 429)',
            message:
              err.detail ||
              'Se alcanzó el máximo de intentos permitidos (5 por minuto). Espera 60 segundos antes de intentar nuevamente.',
            isRateLimit: true,
            requestId: err.requestId,
            status: 429,
          })
          return
        }
        if (err.status === 401) {
          setLoginError({
            title: 'Credenciales inválidas',
            message: err.detail || 'Verifica tu usuario y contraseña e intenta nuevamente.',
            isRateLimit: false,
            requestId: err.requestId,
            status: 401,
          })
          return
        }
        setLoginError({
          title: `Error del servidor (HTTP ${err.status})`,
          message: err.detail || 'El backend rechazó la solicitud de autenticación.',
          isRateLimit: false,
          requestId: err.requestId,
          status: err.status,
        })
        return
      }

      setLoginError({
        title: 'No se pudo contactar la API',
        message: `Verifica que el backend esté activo en ${API_BASE_URL} y que la red permita conexión.`,
        isRateLimit: false,
        requestId: null,
        status: null,
      })
    }
  }

  const health = healthQuery.data
  const apiReachable = !healthQuery.isError && Boolean(health)
  const dbConnected = Boolean(health?.base_datos?.conectado)

  return (
    <div className="relative grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Botón de tema discreto */}
      <div className="fixed top-4 right-4 z-20">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      {/* Panel izquierdo — Contexto operativo y telemetría de conexión */}
      <aside className="relative hidden flex-col justify-between border-r bg-muted/35 p-10 lg:flex">
        <div className="bg-ops-grid pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-card font-mono text-xs font-semibold tracking-tight shadow-xs">
            ACP
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">ACP Control Web</p>
            <p className="text-xs text-muted-foreground">Centro Operativo DWH · Agrícola Cerro Prieto</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <div className="space-y-2.5">
            <p className="font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Control Plane · Geographic Phenology DWH
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Operación supervisada del pipeline ETL, cuarentena MDM y bitácora DWH.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Consola técnica con autenticación JWT y control de acceso por rol (viewer, analista MDM, operador ETL y administrador).
            </p>
          </div>

          {/* Tarjeta real de estado de la API */}
          <div className="rounded-xl border bg-card/90 p-4 shadow-xs backdrop-blur-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Server className="size-3.5 text-muted-foreground" />
                <span>Estado del enlace API</span>
              </div>
              <div className="flex items-center gap-1.5">
                {healthQuery.isLoading ? (
                  <StatusBadge label="VERIFICANDO" tone="pending" />
                ) : apiReachable ? (
                  <StatusBadge
                    label={dbConnected ? 'ACTIVO' : 'DEGRADADO'}
                    tone={dbConnected ? 'ok' : 'pending'}
                  />
                ) : (
                  <StatusBadge label="SIN CONEXIÓN" tone="error" />
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void healthQuery.refetch()}
                  disabled={healthQuery.isFetching}
                  aria-label="Reintentar verificación de salud"
                >
                  <RefreshCw className={`size-3 ${healthQuery.isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <Separator className="my-3" />

            <dl className="grid gap-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Endpoint API</dt>
                <dd className="truncate font-mono text-[11px] text-foreground">{API_BASE_URL}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Database className="size-3" />
                  SQL Server
                </dt>
                <dd className="metric-value font-mono text-[11px]">
                  {healthQuery.isLoading
                    ? '—'
                    : !apiReachable
                      ? 'Sin respuesta'
                      : dbConnected
                        ? `${health?.base_datos?.base_datos || 'Conectado'}${
                            health?.base_datos?.latencia_ms != null
                              ? ` · ${health.base_datos.latencia_ms} ms`
                              : ''
                          }`
                        : 'Desconectado'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="size-3" />
                  Servicio / Entorno
                </dt>
                <dd className="font-mono text-[11px] text-muted-foreground">
                  {health ? `v${health.version} · ${health.entorno}` : '—'}
                </dd>
              </div>
              {health?.timestamp && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Último check</dt>
                  <dd className="metric-value font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(health.timestamp)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>Acceso auditado mediante X-Request-ID</span>
          <span className="font-mono">JWT Bearer · RBAC</span>
        </div>
      </aside>

      {/* Panel derecho — Formulario de ingreso */}
      <main className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          {/* Cabecera móvil */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border bg-card font-mono text-xs font-semibold">
                ACP
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">ACP Control Web</p>
                <p className="text-xs text-muted-foreground">Centro Operativo DWH</p>
              </div>
            </div>
            <StatusBadge
              label={
                healthQuery.isLoading
                  ? 'CHECK'
                  : apiReachable
                    ? dbConnected
                      ? 'API OK'
                      : 'BD DEG'
                    : 'OFFLINE'
              }
              tone={
                healthQuery.isLoading
                  ? 'pending'
                  : apiReachable
                    ? dbConnected
                      ? 'ok'
                      : 'pending'
                    : 'error'
              }
            />
          </div>

          <Card className="shadow-xs">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Lock className="size-3.5" />
                <span>Autenticación operativa</span>
              </div>
              <CardTitle className="text-xl tracking-tight">
                <h1>Iniciar sesión</h1>
              </CardTitle>
              <CardDescription>
                Ingresa tus credenciales corporativas registradas en el control-plane.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {loginError && (
                  <Alert
                    variant="destructive"
                    className={
                      loginError.isRateLimit
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                        : 'border-rose-500/35 bg-rose-500/8'
                    }
                  >
                    {loginError.isRateLimit ? (
                      <Clock className="size-4" />
                    ) : (
                      <AlertCircle className="size-4" />
                    )}
                    <AlertTitle>{loginError.title}</AlertTitle>
                    <AlertDescription className="space-y-1 text-xs">
                      <p>{loginError.message}</p>
                      {loginError.requestId && (
                        <p className="font-mono opacity-80">ID: {loginError.requestId}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="ej. admin o operador.etl"
                    autoComplete="username"
                    autoFocus
                    aria-invalid={!!errors.username}
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      className="pr-9"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verificando credenciales…
                    </>
                  ) : (
                    'Ingresar a la consola'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Pie técnico visible en móvil */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground lg:hidden">
            <span className="truncate font-mono">{API_BASE_URL}</span>
            <button
              type="button"
              onClick={() => void healthQuery.refetch()}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Reverificar API
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
