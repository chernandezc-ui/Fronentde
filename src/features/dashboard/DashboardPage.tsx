import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  FileWarning,
  Loader2,
  Lock,
  MessageSquare,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
  Workflow,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore, rolCumpleNivel } from '@/shared/auth/authStore'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge, mapEstadoToTone, type OperationalTone } from '@/shared/components/StatusBadge'
import { formatDateTime, formatDuration, formatNumber, notifyApiError } from '@/shared/lib/format'
import {
  ackAlerta,
  fetchAlertasAcks,
  fetchAuditoriaResumenBitacora,
  fetchCuarentenaResumen,
  fetchEtlFallosRecientes,
  fetchEtlResumen,
  fetchHealth,
  fetchLockStatus,
  fetchRunnerReady,
  unackAlerta,
  type AlertaAck,
} from '@/features/dashboard/dashboardApi'
import { useTelemetryStream, type TelemetrySample } from '@/features/dashboard/useTelemetryStream'

interface DerivedAlert {
  id: string
  titulo: string
  descripcion: string
  severidad: 'critica' | 'advertencia'
  moduloRuta?: string
  moduloLabel?: string
  persistible: boolean
  ack?: AlertaAck
}

function LatencySparkline({ samples }: { samples: TelemetrySample[] }) {
  const validPoints = samples
    .map((s, idx) => ({ idx, val: s.latencia_ms }))
    .filter((p): p is { idx: number; val: number } => typeof p.val === 'number')

  if (validPoints.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-xs text-muted-foreground">
        Esperando muestras SSE de latencia…
      </div>
    )
  }

  const width = 320
  const height = 64
  const padX = 4
  const padY = 8
  const values = validPoints.map((p) => p.val)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const span = Math.max(maxVal - minVal, 5)

  const coords = validPoints.map((p, i) => {
    const x = padX + (i / (validPoints.length - 1)) * (width - padX * 2)
    const y = height - padY - ((p.val - minVal) / span) * (height - padY * 2)
    return { x, y, val: p.val }
  })

  const linePath = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} L ${coords[0].x.toFixed(1)} ${height - padY} Z`
  const last = coords[coords.length - 1]
  const avg = Math.round(values.reduce((acc, v) => acc + v, 0) / values.length)

  return (
    <div className="space-y-1.5">
      <div className="overflow-hidden rounded-lg border bg-muted/25 px-2 py-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img" aria-label="Tendencia de latencia SQL Server">
          <defs>
            <linearGradient id="acpLatencyArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#acpLatencyArea)" className="text-emerald-500" />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="text-emerald-600 dark:text-emerald-400"
          />
          <circle cx={last.x} cy={last.y} r="3" className="fill-emerald-500" />
        </svg>
      </div>
      <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground metric-value">
        <span>mín {minVal} ms</span>
        <span>prom {avg} ms</span>
        <span>máx {maxVal} ms</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario)
  const canManageAlerts = rolCumpleNivel(usuario?.rol, 'analista_mdm')
  const queryClient = useQueryClient()

  const [alertTab, setAlertTab] = useState<'activas' | 'atendidas' | 'todas'>('activas')
  const [ackTarget, setAckTarget] = useState<DerivedAlert | null>(null)
  const [ackComment, setAckComment] = useState('')

  // Stream SSE compartido (telemetría cada 3s)
  const telemetry = useTelemetryStream(true)

  // Consultas REST reales del backend
  const healthQuery = useQuery({
    queryKey: ['health', 'full'],
    queryFn: fetchHealth,
    refetchInterval: 20_000,
  })

  const runnerQuery = useQuery({
    queryKey: ['health', 'runner'],
    queryFn: fetchRunnerReady,
    refetchInterval: 15_000,
  })

  const lockQuery = useQuery({
    queryKey: ['health', 'lock'],
    queryFn: fetchLockStatus,
    refetchInterval: 15_000,
  })

  const cuarentenaQuery = useQuery({
    queryKey: ['cuarentena', 'resumen'],
    queryFn: fetchCuarentenaResumen,
    refetchInterval: 30_000,
  })

  const fallosQuery = useQuery({
    queryKey: ['etl', 'fallos-recientes', 24],
    queryFn: () => fetchEtlFallosRecientes(24),
    refetchInterval: 30_000,
  })

  const etlResumenQuery = useQuery({
    queryKey: ['etl', 'resumen'],
    queryFn: fetchEtlResumen,
    refetchInterval: 15_000,
  })

  const bitacoraResumenQuery = useQuery({
    queryKey: ['auditoria', 'bitacora', 'resumen', 7],
    queryFn: () => fetchAuditoriaResumenBitacora(7),
    refetchInterval: 60_000,
  })

  const acksQuery = useQuery({
    queryKey: ['alertas', 'acks'],
    queryFn: fetchAlertasAcks,
    refetchInterval: 30_000,
  })

  const ackMutation = useMutation({
    mutationFn: ({ idAlerta, comentario }: { idAlerta: string; comentario: string }) =>
      ackAlerta(idAlerta, comentario),
    onSuccess: (res) => {
      toast.success(res.mensaje || 'Alerta marcada como atendida.')
      setAckTarget(null)
      setAckComment('')
      void queryClient.invalidateQueries({ queryKey: ['alertas', 'acks'] })
    },
    onError: (err) => notifyApiError(err, 'No se pudo marcar la alerta'),
  })

  const unackMutation = useMutation({
    mutationFn: (idAlerta: string) => unackAlerta(idAlerta),
    onSuccess: (res) => {
      toast.success(res.mensaje || 'Alerta reabierta.')
      void queryClient.invalidateQueries({ queryKey: ['alertas', 'acks'] })
    },
    onError: (err) => notifyApiError(err, 'No se pudo reabrir la alerta'),
  })

  const ackMap = useMemo(() => {
    const map = new Map<string, AlertaAck>()
    for (const item of acksQuery.data ?? []) {
      map.set(item.id_alerta, item)
    }
    return map
  }, [acksQuery.data])

  // Derivar alertas accionables reales desde los endpoints vivos
  const derivedAlerts = useMemo<DerivedAlert[]>(() => {
    const list: DerivedAlert[] = []

    if (healthQuery.isError && !telemetry.latest) {
      list.push({
        id: 'api-sin-conexion',
        titulo: 'API sin respuesta',
        descripcion:
          'No se pudo obtener el estado de /health. Verifica que el backend FastAPI esté activo y accesible.',
        severidad: 'critica',
        persistible: false,
      })
    }

    const dbConectado = telemetry.latest?.conectado ?? healthQuery.data?.base_datos?.conectado
    if (dbConectado === false) {
      list.push({
        id: 'bd-desconectada',
        titulo: 'Base de datos SQL Server desconectada',
        descripcion:
          healthQuery.data?.base_datos?.error ||
          'El backend reporta pérdida de conectividad con SQL Server. Las operaciones ETL y MDM están degradadas.',
        severidad: 'critica',
        persistible: true,
        ack: ackMap.get('bd-desconectada'),
      })
    }

    const runnerEstado = runnerQuery.data?.estado?.toLowerCase()
    const lockEstado = lockQuery.data?.lock?.estado_lock?.toUpperCase()
    if (runnerEstado === 'lock_vencido' || lockEstado === 'VENCIDO') {
      const segs = lockQuery.data?.lock?.segundos_desde_heartbeat
      list.push({
        id: 'runner-lock-vencido',
        titulo: 'Lock del runner ETL vencido',
        descripcion: `Control.Bloqueo_Ejecucion reporta heartbeat expirado${
          segs != null ? ` (${formatDuration(segs)} sin latido)` : ''
        }. Requiere inspección del proceso runner.`,
        severidad: 'critica',
        moduloRuta: '/etl',
        moduloLabel: 'Abrir Monitor ETL',
        persistible: true,
        ack: ackMap.get('runner-lock-vencido'),
      })
    } else if (runnerEstado === 'control_plane_error' || runnerEstado === 'no_listo') {
      list.push({
        id: 'runner-control-plane-error',
        titulo: `Control-plane ETL en estado ${runnerEstado.toUpperCase()}`,
        descripcion:
          runnerQuery.data?.control_plane?.error ||
          'El endpoint /health/ready/runner devolvió HTTP 503 indicando indisponibilidad del control-plane.',
        severidad: 'critica',
        moduloRuta: '/etl',
        moduloLabel: 'Revisar Monitor ETL',
        persistible: true,
        ack: ackMap.get('runner-control-plane-error'),
      })
    }

    if (fallosQuery.data && fallosQuery.data.fallos > 0) {
      const ultimoDetalle = fallosQuery.data.ultimo_fallo_tabla
        ? ` Última tabla afectada: ${fallosQuery.data.ultimo_fallo_tabla} (${formatDateTime(fallosQuery.data.ultimo_fallo_fecha)}).`
        : ''
      list.push({
        id: 'etl-fallos-24h',
        titulo: `${formatNumber(fallosQuery.data.fallos)} fallo(s) ETL en las últimas 24 horas`,
        descripcion: `Se registraron ejecuciones con estado ERROR en Auditoria.Log_Carga.${ultimoDetalle}`,
        severidad: fallosQuery.data.fallos >= 3 ? 'critica' : 'advertencia',
        moduloRuta: '/auditoria',
        moduloLabel: 'Ver Auditoría',
        persistible: true,
        ack: ackMap.get('etl-fallos-24h'),
      })
    }

    if (cuarentenaQuery.data && cuarentenaQuery.data.pendientes > 0) {
      list.push({
        id: 'cuarentena-pendientes',
        titulo: `${formatNumber(cuarentenaQuery.data.pendientes)} registro(s) pendientes en Cuarentena MDM`,
        descripcion: `Total histórico en cuarentena: ${formatNumber(cuarentenaQuery.data.total)} (${formatNumber(cuarentenaQuery.data.resueltos)} resueltos, ${formatNumber(cuarentenaQuery.data.descartados)} descartados).`,
        severidad: 'advertencia',
        moduloRuta: '/cuarentena',
        moduloLabel: 'Ir a Cuarentena',
        persistible: true,
        ack: ackMap.get('cuarentena-pendientes'),
      })
    }

    return list
  }, [
    ackMap,
    cuarentenaQuery.data,
    fallosQuery.data,
    healthQuery.data,
    healthQuery.isError,
    lockQuery.data,
    runnerQuery.data,
    telemetry.latest,
  ])

  // Acks históricos persistidos cuyo disparador ya no está activo
  const historicalAcks = useMemo(() => {
    const activeIds = new Set(derivedAlerts.map((a) => a.id))
    return (acksQuery.data ?? []).filter((a) => !activeIds.has(a.id_alerta))
  }, [acksQuery.data, derivedAlerts])

  const activeUnackedCount = derivedAlerts.filter((a) => !a.ack).length
  const ackedDerivedCount = derivedAlerts.filter((a) => Boolean(a.ack)).length

  const filteredAlerts = useMemo(() => {
    if (alertTab === 'activas') return derivedAlerts.filter((a) => !a.ack)
    if (alertTab === 'atendidas') return derivedAlerts.filter((a) => Boolean(a.ack))
    return derivedAlerts
  }, [alertTab, derivedAlerts])

  const anyRefreshing =
    healthQuery.isFetching ||
    runnerQuery.isFetching ||
    lockQuery.isFetching ||
    cuarentenaQuery.isFetching ||
    fallosQuery.isFetching ||
    etlResumenQuery.isFetching ||
    bitacoraResumenQuery.isFetching ||
    acksQuery.isFetching

  function handleRefreshDashboard() {
    void Promise.all([
      healthQuery.refetch(),
      runnerQuery.refetch(),
      lockQuery.refetch(),
      cuarentenaQuery.refetch(),
      fallosQuery.refetch(),
      etlResumenQuery.refetch(),
      bitacoraResumenQuery.refetch(),
      acksQuery.refetch(),
    ])
    if (telemetry.status === 'error' || telemetry.status === 'closed') {
      telemetry.reconnect()
    }
  }

  // Valores combinados (SSE prioritario para métricas en vivo, fallback a REST)
  const corridasActivas = telemetry.latest?.corridas_activas ?? etlResumenQuery.data?.corridas_activas
  const comandosPendientes = telemetry.latest?.comandos_pendientes ?? etlResumenQuery.data?.comandos_pendientes
  const comandosProcesando = telemetry.latest?.comandos_procesando ?? etlResumenQuery.data?.comandos_procesando
  const dbConectado = telemetry.latest?.conectado ?? healthQuery.data?.base_datos?.conectado
  const latenciaActual = telemetry.latest?.latencia_ms ?? healthQuery.data?.base_datos?.latencia_ms

  const etlSummaryUnavailable = etlResumenQuery.isError && !telemetry.latest
  const healthUnavailable = healthQuery.isError && !telemetry.latest
  const criticalEndpointsErrored =
    healthUnavailable || runnerQuery.isError || cuarentenaQuery.isError || fallosQuery.isError

  const sseBadgeTone: OperationalTone =
    telemetry.status === 'open'
      ? 'ok'
      : telemetry.status === 'connecting' || telemetry.status === 'reconnecting'
        ? 'pending'
        : telemetry.status === 'error'
          ? 'error'
          : 'neutral'

  const sseBadgeLabel =
    telemetry.status === 'open'
      ? 'STREAM ACTIVO'
      : telemetry.status === 'connecting'
        ? 'CONECTANDO'
        : telemetry.status === 'reconnecting'
          ? 'RECONECTANDO'
          : telemetry.status === 'error'
            ? 'ERROR SSE'
            : telemetry.status === 'closed'
              ? 'CERRADO'
              : 'INACTIVO'

  const lockInfo = lockQuery.data?.lock
  const lockEstadoDisplay = lockInfo?.estado_lock ?? (lockQuery.data?.estado ? lockQuery.data.estado.toUpperCase() : null)

  return (
    <div className="space-y-6">
      {/* Encabezado operativo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Centro de Control DWH
            </h1>
            {healthQuery.data && (
              <StatusBadge
                label={`${healthQuery.data.entorno.toUpperCase()} · v${healthQuery.data.version}`}
                tone="neutral"
                showDot={false}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Supervisión en vivo de SQL Server, runner ETL, cuarentena MDM y alertas operativas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span className="metric-value font-mono text-[11px]">
              {telemetry.latest?.timestamp
                ? formatDateTime(telemetry.latest.timestamp)
                : healthQuery.data?.timestamp
                  ? formatDateTime(healthQuery.data.timestamp)
                  : 'Sin lectura'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshDashboard} disabled={anyRefreshing}>
            <RefreshCw className={`size-3.5 ${anyRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Banner de error global si el backend completo no responde */}
      {healthUnavailable && (
        <ApiErrorBanner
          error={healthQuery.error}
          title="Sin conexión con el backend ACP Platform"
          onRetry={handleRefreshDashboard}
        />
      )}

      {/* Fila de 4 KPIs operativos principales */}
      <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: API & SQL Server */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <Database className="size-3.5" />
              API &amp; SQL Server
            </CardDescription>
            <CardAction>
              {healthQuery.isLoading && !telemetry.latest ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : healthUnavailable ? (
                <StatusBadge label="SIN DATOS" tone="error" />
              ) : (
                <StatusBadge
                  label={dbConectado ? 'CONECTADO' : 'CAÍDA'}
                  tone={dbConectado ? 'ok' : 'error'}
                />
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {healthQuery.isLoading && !telemetry.latest ? (
              <Skeleton className="h-8 w-28" />
            ) : healthUnavailable ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <WifiOff className="size-5" />
                <span className="text-lg font-semibold">Error de red</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <span className="metric-value text-2xl font-semibold tracking-tight">
                  {latenciaActual != null ? `${latenciaActual}` : '—'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {latenciaActual != null ? 'ms latencia' : 'sin latencia'}
                </span>
              </div>
            )}
            <p className="truncate font-mono text-xs text-muted-foreground">
              {healthUnavailable
                ? 'No se pudo consultar /health'
                : healthQuery.data?.base_datos?.base_datos || 'Base de datos DWH'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Control-Plane ETL & Runner */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <Workflow className="size-3.5" />
              Control-Plane ETL
            </CardDescription>
            <CardAction>
              {runnerQuery.isLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : runnerQuery.isError ? (
                <StatusBadge label="ERROR" tone="error" />
              ) : (
                <StatusBadge
                  label={(runnerQuery.data?.estado || 'N/A').toUpperCase()}
                  tone={mapEstadoToTone(runnerQuery.data?.estado)}
                />
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {etlResumenQuery.isLoading && !telemetry.latest ? (
              <Skeleton className="h-8 w-24" />
            ) : etlSummaryUnavailable ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Sin datos / Error de conexión
              </p>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="metric-value text-2xl font-semibold tracking-tight">
                  {formatNumber(corridasActivas)}
                </span>
                <span className="text-xs text-muted-foreground">corridas activas</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="metric-value font-mono">
                {etlSummaryUnavailable
                  ? 'Cola: —'
                  : `Cola: ${formatNumber(comandosPendientes)} pend. · ${formatNumber(comandosProcesando)} proc.`}
              </span>
              <Link
                to="/etl"
                className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline"
              >
                ETL
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Cuarentena MDM */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <ShieldAlert className="size-3.5" />
              Cuarentena MDM
            </CardDescription>
            <CardAction>
              {cuarentenaQuery.isLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : cuarentenaQuery.isError ? (
                <StatusBadge label="ERROR" tone="error" />
              ) : (
                <StatusBadge
                  label={cuarentenaQuery.data && cuarentenaQuery.data.pendientes > 0 ? 'ATENCIÓN' : 'AL DÍA'}
                  tone={cuarentenaQuery.data && cuarentenaQuery.data.pendientes > 0 ? 'pending' : 'ok'}
                />
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {cuarentenaQuery.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : cuarentenaQuery.isError || !cuarentenaQuery.data ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Sin datos / Error de conexión
              </p>
            ) : (
              <div className="flex items-baseline gap-2">
                <span
                  className={`metric-value text-2xl font-semibold tracking-tight ${
                    cuarentenaQuery.data.pendientes > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-foreground'
                  }`}
                >
                  {formatNumber(cuarentenaQuery.data.pendientes)}
                </span>
                <span className="text-xs text-muted-foreground">pendientes</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="metric-value font-mono">
                {cuarentenaQuery.data
                  ? `${formatNumber(cuarentenaQuery.data.resueltos)} res. · ${formatNumber(cuarentenaQuery.data.total)} total`
                  : '—'}
              </span>
              <Link
                to="/cuarentena"
                className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline"
              >
                Abrir
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Bitácora 7d & Fallos 24h */}
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
              <FileWarning className="size-3.5" />
              Fallos 24h · Éxito 7d
            </CardDescription>
            <CardAction>
              {fallosQuery.isLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : fallosQuery.isError ? (
                <StatusBadge label="ERROR" tone="error" />
              ) : (
                <StatusBadge
                  label={fallosQuery.data && fallosQuery.data.fallos > 0 ? 'CON FALLOS' : 'ESTABLE'}
                  tone={fallosQuery.data && fallosQuery.data.fallos > 0 ? 'error' : 'ok'}
                />
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {fallosQuery.isLoading && bitacoraResumenQuery.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : fallosQuery.isError && bitacoraResumenQuery.isError ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                Sin datos / Error de conexión
              </p>
            ) : (
              <div className="flex items-baseline gap-2.5">
                <span
                  className={`metric-value text-2xl font-semibold tracking-tight ${
                    (fallosQuery.data?.fallos ?? 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground'
                  }`}
                >
                  {fallosQuery.isError ? '—' : formatNumber(fallosQuery.data?.fallos)}
                </span>
                <span className="text-xs text-muted-foreground">fallos 24h</span>
                {bitacoraResumenQuery.data && (
                  <span className="metric-value ml-auto font-mono text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {bitacoraResumenQuery.data.tasa_exito_pct.toFixed(1)}% OK
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate font-mono">
                {fallosQuery.data?.ultimo_fallo_tabla
                  ? `Último: ${fallosQuery.data.ultimo_fallo_tabla}`
                  : bitacoraResumenQuery.data
                    ? `${formatNumber(bitacoraResumenQuery.data.total)} cargas (7d)`
                    : '—'}
              </span>
              <Link
                to="/auditoria"
                className="inline-flex shrink-0 items-center gap-0.5 font-medium text-foreground hover:underline"
              >
                Bitácora
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sección central: Alertas Operativas (izq) + Lock & Telemetría SSE (der) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Panel de Alertas Accionables */}
        <Card className="lg:col-span-7">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-muted-foreground" />
                  Alertas operativas
                  {activeUnackedCount > 0 && (
                    <StatusBadge
                      label={`${activeUnackedCount} ACTIVAS`}
                      tone="error"
                      showDot={false}
                    />
                  )}
                </CardTitle>
                <CardDescription>
                  Derivadas en vivo desde salud, lock del runner, fallos ETL y cuarentena · Ack persistente en MDM.
                </CardDescription>
              </div>

              {/* Filtros simples */}
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
                {(
                  [
                    { key: 'activas', label: `Activas (${activeUnackedCount})` },
                    { key: 'atendidas', label: `Atendidas (${ackedDerivedCount + historicalAcks.length})` },
                    { key: 'todas', label: `Todas (${derivedAlerts.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAlertTab(tab.key)}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      alertTab === tab.key
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {acksQuery.isError && (
              <ApiErrorBanner
                error={acksQuery.error}
                title="No se pudieron cargar los acks persistentes (/api/v1/alertas/acks)"
                onRetry={() => void acksQuery.refetch()}
              />
            )}

            {filteredAlerts.length === 0 && (alertTab !== 'atendidas' || historicalAcks.length === 0) ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                {criticalEndpointsErrored && alertTab === 'activas' ? (
                  <>
                    <WifiOff className="mb-2 size-7 text-rose-500" />
                    <p className="text-sm font-medium">Diagnóstico incompleto</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Algunos endpoints devolvieron error de conexión. Reintenta para confirmar que no existan alertas activas.
                    </p>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mb-2 size-7 text-emerald-500" />
                    <p className="text-sm font-medium">
                      {alertTab === 'activas'
                        ? 'Operación nominal — sin alertas pendientes'
                        : alertTab === 'atendidas'
                          ? 'No hay alertas marcadas como atendidas'
                          : 'No hay alertas derivadas en este momento'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Todos los indicadores consultados operan dentro de parámetros normales.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAlerts.map((alerta) => {
                  const isAcked = Boolean(alerta.ack)
                  return (
                    <div
                      key={alerta.id}
                      className={`rounded-xl border p-3.5 transition-colors ${
                        isAcked
                          ? 'border-border bg-muted/25'
                          : alerta.severidad === 'critica'
                            ? 'border-rose-500/35 bg-rose-500/5'
                            : 'border-amber-500/35 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {alerta.severidad === 'critica' ? (
                              <AlertOctagon className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                            ) : (
                              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            )}
                            <span className="text-sm font-semibold">{alerta.titulo}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              #{alerta.id}
                            </span>
                            {isAcked && <StatusBadge label="ATENDIDA" tone="ok" />}
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {alerta.descripcion}
                          </p>

                          {alerta.ack && (
                            <div className="mt-2 rounded-lg border bg-background/80 px-2.5 py-2 text-xs">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
                                <CheckCircle2 className="size-3.5 text-emerald-500" />
                                <span>
                                  Atendida por <strong className="font-mono text-foreground">{alerta.ack.usuario_dni}</strong>
                                </span>
                                <span>·</span>
                                <span className="metric-value font-mono text-[11px]">
                                  {formatDateTime(alerta.ack.fecha_ack)}
                                </span>
                              </div>
                              {alerta.ack.comentario && (
                                <p className="mt-1 flex items-start gap-1.5 text-foreground/90">
                                  <MessageSquare className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                                  <span>{alerta.ack.comentario}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {alerta.moduloRuta && alerta.moduloLabel && (
                            <Link
                              to={alerta.moduloRuta}
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted"
                            >
                              {alerta.moduloLabel}
                              <ArrowUpRight className="size-3" />
                            </Link>
                          )}

                          {alerta.persistible && (
                            canManageAlerts ? (
                              isAcked ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={unackMutation.isPending}
                                  onClick={() => unackMutation.mutate(alerta.id)}
                                >
                                  <RotateCcw className="size-3" />
                                  Reabrir
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setAckTarget(alerta)
                                    setAckComment('')
                                  }}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Atender
                                </Button>
                              )
                            ) : (
                              <StatusBadge label="SOLO LECTURA" tone="readonly" showDot={false} />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Acks históricos en pestaña "Atendidas" */}
                {alertTab === 'atendidas' && historicalAcks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Registros atendidos ya resueltos en origen ({historicalAcks.length})
                    </p>
                    {historicalAcks.map((ack) => (
                      <div
                        key={ack.id_alerta}
                        className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-foreground">
                              #{ack.id_alerta}
                            </span>
                            <StatusBadge label="RESUELTA" tone="neutral" showDot={false} />
                          </div>
                          <p className="text-muted-foreground">
                            Por <span className="font-mono">{ack.usuario_dni}</span> · {formatDateTime(ack.fecha_ack)}
                            {ack.comentario ? ` — "${ack.comentario}"` : ''}
                          </p>
                        </div>
                        {canManageAlerts && (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={unackMutation.isPending}
                            onClick={() => unackMutation.mutate(ack.id_alerta)}
                          >
                            <RotateCcw className="size-3" />
                            Quitar ack
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna derecha: Telemetría SSE en vivo + Diagnóstico del Lock */}
        <div className="space-y-6 lg:col-span-5">
          {/* Tarjeta Telemetría SSE */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radio className="size-4 text-muted-foreground" />
                    Telemetría en vivo (SSE)
                  </CardTitle>
                  <CardDescription>
                    Canal `/health/telemetria/stream` · pulso cada 3s
                  </CardDescription>
                </div>
                <StatusBadge label={sseBadgeLabel} tone={sseBadgeTone} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <LatencySparkline samples={telemetry.history} />

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Activas</p>
                  <p className="metric-value mt-0.5 font-mono text-base font-semibold">
                    {telemetry.latest ? formatNumber(telemetry.latest.corridas_activas) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Pendientes</p>
                  <p className="metric-value mt-0.5 font-mono text-base font-semibold">
                    {telemetry.latest ? formatNumber(telemetry.latest.comandos_pendientes) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-[11px] text-muted-foreground">Procesando</p>
                  <p className="metric-value mt-0.5 font-mono text-base font-semibold">
                    {telemetry.latest ? formatNumber(telemetry.latest.comandos_procesando) : '—'}
                  </p>
                </div>
              </div>

              {telemetry.latest?.version_sql && (
                <div className="rounded-lg border bg-muted/25 px-3 py-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">Motor SQL: </span>
                  <span className="font-mono">{telemetry.latest.version_sql}</span>
                </div>
              )}

              {(telemetry.status === 'error' || telemetry.status === 'closed') && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-xs">
                  <span className="truncate text-rose-700 dark:text-rose-300">
                    {telemetry.lastError || 'Stream SSE desconectado'}
                  </span>
                  <Button variant="outline" size="xs" onClick={telemetry.reconnect}>
                    Reconectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarjeta Lock del Runner */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lock className="size-4 text-muted-foreground" />
                    Bloqueo del Runner ETL
                  </CardTitle>
                  <CardDescription>
                    Exclusión mutua en `Control.Bloqueo_Ejecucion`
                  </CardDescription>
                </div>
                {lockQuery.isLoading ? (
                  <Skeleton className="h-5 w-16 rounded-full" />
                ) : lockQuery.isError ? (
                  <StatusBadge label="ERROR" tone="error" />
                ) : (
                  <StatusBadge
                    label={lockEstadoDisplay || 'DESCONOCIDO'}
                    tone={mapEstadoToTone(lockEstadoDisplay)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {lockQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : lockQuery.isError ? (
                <ApiErrorBanner
                  error={lockQuery.error}
                  title="Error consultando /health/lock"
                  onRetry={() => void lockQuery.refetch()}
                />
              ) : (
                <dl className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">HTTP / Diagnóstico</dt>
                    <dd className="font-mono">
                      HTTP {lockQuery.data?.httpStatus ?? '—'} · {lockQuery.data?.estado ?? '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Corrida activa</dt>
                    <dd className="truncate font-mono text-foreground">
                      {lockInfo?.id_corrida_activa || 'Ninguna (lock libre)'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Adquirido por</dt>
                    <dd className="font-mono text-muted-foreground">
                      {lockInfo?.adquirido_por || '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Último heartbeat</dt>
                    <dd className="metric-value font-mono text-muted-foreground">
                      {lockInfo?.heartbeat
                        ? `${formatDateTime(lockInfo.heartbeat)}${
                            lockInfo.segundos_desde_heartbeat != null
                              ? ` (${formatDuration(lockInfo.segundos_desde_heartbeat)})`
                              : ''
                          }`
                        : '—'}
                    </dd>
                  </div>
                  {lockInfo?.error && (
                    <p className="mt-1 rounded-md border border-rose-500/30 bg-rose-500/8 p-2 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                      {lockInfo.error}
                    </p>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resumen de Bitácora DWH (ventana 7 días) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-muted-foreground" />
                Resumen de Bitácora DWH (últimos 7 días)
              </CardTitle>
              <CardDescription>
                Métricas agregadas de `Auditoria.Log_Carga` vía `/api/v1/auditoria/bitacora/resumen`.
              </CardDescription>
            </div>
            <Link
              to="/auditoria"
              className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
            >
              Explorar bitácora completa
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {bitacoraResumenQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : bitacoraResumenQuery.isError || !bitacoraResumenQuery.data ? (
            <ApiErrorBanner
              error={bitacoraResumenQuery.error}
              title="No se pudo obtener el resumen de bitácora"
              onRetry={() => void bitacoraResumenQuery.refetch()}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Total cargas</p>
                  <p className="metric-value mt-1 text-xl font-semibold">
                    {formatNumber(bitacoraResumenQuery.data.total)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Exitosas (OK)</p>
                  <p className="metric-value mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatNumber(bitacoraResumenQuery.data.ok)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Con error</p>
                  <p
                    className={`metric-value mt-1 text-xl font-semibold ${
                      bitacoraResumenQuery.data.errores > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-foreground'
                    }`}
                  >
                    {formatNumber(bitacoraResumenQuery.data.errores)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Filas insertadas</p>
                  <p className="metric-value mt-1 text-xl font-semibold">
                    {formatNumber(bitacoraResumenQuery.data.filas_ok)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs text-muted-foreground">Filas rechazadas</p>
                  <p className="metric-value mt-1 text-xl font-semibold">
                    {formatNumber(bitacoraResumenQuery.data.filas_rechazadas)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Tasa de éxito ({bitacoraResumenQuery.data.ventana_dias} días) · En proceso:{' '}
                    <span className="metric-value font-mono font-medium text-foreground">
                      {formatNumber(bitacoraResumenQuery.data.en_proceso)}
                    </span>
                  </span>
                  <span className="metric-value font-mono font-semibold">
                    {bitacoraResumenQuery.data.tasa_exito_pct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(100, Math.max(0, bitacoraResumenQuery.data.tasa_exito_pct))} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para marcar alerta como atendida con comentario */}
      <Dialog
        open={Boolean(ackTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAckTarget(null)
            setAckComment('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar alerta como atendida</DialogTitle>
            <DialogDescription>
              El acuse quedará persistido en `MDM.Alerta_Ack` con tu usuario (`{usuario?.nombre_usuario}`).
            </DialogDescription>
          </DialogHeader>

          {ackTarget && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                <p className="font-semibold text-foreground">{ackTarget.titulo}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  ID: {ackTarget.id}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ack-comentario">Comentario operativo (opcional)</Label>
                <Textarea
                  id="ack-comentario"
                  placeholder="Ej. Revisado con equipo ETL, reproceso en curso…"
                  rows={3}
                  value={ackComment}
                  onChange={(e) => setAckComment(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAckTarget(null)
                setAckComment('')
              }}
              disabled={ackMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!ackTarget || ackMutation.isPending}
              onClick={() => {
                if (!ackTarget) return
                ackMutation.mutate({
                  idAlerta: ackTarget.id,
                  comentario: ackComment,
                })
              }}
            >
              {ackMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Confirmar atención
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
