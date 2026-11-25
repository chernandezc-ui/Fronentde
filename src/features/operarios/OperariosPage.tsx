import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import { OperarioDetailSheet } from './components/OperarioDetailSheet'
import { OperarioFormDialog } from './components/OperarioFormDialog'
import { OperariosTable } from './components/OperariosTable'
import { classifyAsertividad, computeOperariosKpis } from './operariosUtils'
import type { OperarioPersonal } from './types'
import { usePersonal } from './useOperariosQueries'

const EMPTY_OPERARIOS: OperarioPersonal[] = []

export function OperariosPage() {
  const reduceMotion = useReducedMotion()
  const usuario = useAuthStore((s) => s.usuario)
  const canManagePersonal = rolCumpleNivel(usuario?.rol, 'analista_mdm')

  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<number>(50)
  const [selectedOperario, setSelectedOperario] =
    useState<OperarioPersonal | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const personalQuery = usePersonal(pagina, tamano)
  const rows = personalQuery.data?.datos ?? EMPTY_OPERARIOS
  const totalPadron = personalQuery.data?.total ?? 0

  const kpis = useMemo(
    () => computeOperariosKpis(rows, totalPadron),
    [rows, totalPadron],
  )

  const promedioClasif = useMemo(
    () => classifyAsertividad(kpis.promedioAsertividad),
    [kpis.promedioAsertividad],
  )

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-5"
    >
        {/* Cabecera operativa */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Directorio de Operarios
              </h1>
              {canManagePersonal ? (
                <StatusBadge label="Gestión padrón habilitada" tone="ok" />
              ) : (
                <StatusBadge label="Solo lectura" tone="readonly" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Padrón operativo en{' '}
              <span className="font-mono">Silver.Dim_Personal</span>, monitoreo de asertividad, ausentismo y trazabilidad de incidencias contra{' '}
              <span className="font-mono">MDM.Cuarentena</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void personalQuery.refetch()}
              disabled={personalQuery.isFetching}
            >
              <RefreshCw
                className={cn(
                  'size-3.5',
                  personalQuery.isFetching && 'animate-spin',
                )}
              />
              Actualizar
            </Button>

            {canManagePersonal && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="size-3.5" />
                Nuevo operario
              </Button>
            )}
          </div>
        </div>

        {/* 4 KPIs sobre los datos cargados */}
        <section
          aria-label="Indicadores de operarios"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* KPI 1: Total en padrón */}
          <Card size="sm">
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Total en padrón
                </p>
                {personalQuery.isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                    {formatNumber(kpis.totalPadron)}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(kpis.enPagina)} cargados en página {pagina}
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <Users className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Asertividad promedio */}
          <Card size="sm">
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Asertividad promedio
                </p>
                {personalQuery.isLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : kpis.promedioAsertividad === null ? (
                  <p className="text-lg font-semibold text-muted-foreground">
                    Sin medición
                  </p>
                ) : (
                  <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                    {promedioClasif.formattedPct}
                  </p>
                )}
                <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatNumber(kpis.conMedicion)} medidos ·{' '}
                  {formatNumber(kpis.sinMedicion)} sin medición
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                  <Gauge className="size-4 text-muted-foreground" />
                </div>
                {!personalQuery.isLoading && (
                  <StatusBadge
                    label={promedioClasif.label}
                    tone={promedioClasif.tone}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Operarios bajo 85% */}
          <Card size="sm">
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Operarios bajo 85%
                </p>
                {personalQuery.isLoading ? (
                  <Skeleton className="h-7 w-14" />
                ) : (
                  <p
                    className={cn(
                      'metric-value font-mono text-2xl font-semibold tracking-tight',
                      kpis.bajo85 > 0 && 'text-orange-600 dark:text-orange-400',
                    )}
                  >
                    {formatNumber(kpis.bajo85)}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  En página actual · excluye sin medición
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <AlertTriangle
                  className={cn(
                    'size-4',
                    kpis.bajo85 > 0
                      ? 'text-orange-500'
                      : 'text-emerald-600 dark:text-emerald-400',
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: Días de ausentismo acumulados */}
          <Card size="sm">
            <CardContent className="flex items-start justify-between gap-3 py-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Días de ausentismo acumulados
                </p>
                {personalQuery.isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                      {formatNumber(kpis.diasAusentismoAcumulados)}
                    </p>
                    <span className="text-xs text-muted-foreground">días</span>
                  </div>
                )}
                <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatNumber(kpis.conAusentismoRegistrado)} operarios con dato en página
                </p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                <CalendarClock className="size-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Directorio tabular */}
        <OperariosTable
          rows={rows}
          total={totalPadron}
          pagina={pagina}
          tamano={tamano}
          isLoading={personalQuery.isLoading}
          isFetching={personalQuery.isFetching}
          isPlaceholderData={personalQuery.isPlaceholderData}
          isError={personalQuery.isError}
          error={personalQuery.error}
          onPaginaChange={setPagina}
          onTamanoChange={(nextSize) => {
            setTamano(nextSize)
            setPagina(1)
          }}
          onRefresh={() => void personalQuery.refetch()}
          onSelectOperario={setSelectedOperario}
        />

        {/* Sheet lateral de ficha e incidencias */}
        <OperarioDetailSheet
          operario={selectedOperario}
          canManage={canManagePersonal}
          onOpenChange={(open) => {
            if (!open) setSelectedOperario(null)
          }}
        />

        {canManagePersonal && (
          <OperarioFormDialog
            open={createDialogOpen}
            operario={null}
            onOpenChange={setCreateDialogOpen}
          />
        )}
      </motion.div>
  )
}
