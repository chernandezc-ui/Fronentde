import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Layers, RefreshCw, RotateCcw, Trash2, Wrench, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatNumber } from '@/shared/lib/format'
import { BatchQuarantineDialog, type BatchQuarantineMode } from './components/BatchQuarantineDialog'
import { CuarentenaKpiGrid } from './components/CuarentenaKpiGrid'
import { QuarantineTable } from './components/QuarantineTable'
import { ReinjectionDialog } from './components/ReinjectionDialog'
import { ResolveQuarantineSheet } from './components/ResolveQuarantineSheet'
import {
  DEFAULT_CUARENTENA_FILTERS,
  getCuarentenaRecordKey,
  isRecordPending,
  parseCuarentenaSearchParams,
  serializeCuarentenaSearchParams,
} from './cuarentenaUtils'
import {
  cuarentenaQueryKeys,
  useCuarentenaList,
  useCuarentenaResumen,
  useReinyeccionCandidatos,
} from './useCuarentenaQueries'
import type { CuarentenaFiltrosUrl, EstadoCuarentenaFiltro, RegistroCuarentena } from './types'

const EMPTY_ROWS: RegistroCuarentena[] = []

export function CuarentenaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const usuario = useAuthStore((state) => state.usuario)
  const canManageMdm = rolCumpleNivel(usuario?.rol, 'analista_mdm')

  const [selectedRecord, setSelectedRecord] = useState<RegistroCuarentena | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [batchMode, setBatchMode] = useState<BatchQuarantineMode>(null)
  const [reinjectionOpen, setReinjectionOpen] = useState(false)
  const [reinjectionInitialTabla, setReinjectionInitialTabla] = useState('')

  const filters = useMemo<CuarentenaFiltrosUrl>(
    () => parseCuarentenaSearchParams(searchParams),
    [searchParams],
  )

  const updateFilters = useCallback(
    (patch: Partial<CuarentenaFiltrosUrl>, options?: { replace?: boolean }) => {
      const next: CuarentenaFiltrosUrl = {
        ...filters,
        ...patch,
      }
      setSearchParams(serializeCuarentenaSearchParams(next), {
        replace: options?.replace ?? false,
      })
    },
    [filters, setSearchParams],
  )

  const handleEstadoChange = useCallback(
    (estado: EstadoCuarentenaFiltro) => {
      updateFilters({ estado, pagina: 1 })
    },
    [updateFilters],
  )

  const handleTablaChange = useCallback(
    (tabla: string) => {
      updateFilters({ tabla, pagina: 1 }, { replace: true })
    },
    [updateFilters],
  )

  const handleQueryChange = useCallback(
    (q: string) => {
      updateFilters({ q, pagina: 1 }, { replace: true })
    },
    [updateFilters],
  )

  const handleColumnaChange = useCallback(
    (columna: string) => {
      updateFilters({ columna, pagina: 1 }, { replace: true })
    },
    [updateFilters],
  )

  const handlePaginaChange = useCallback(
    (pagina: number) => {
      updateFilters({ pagina: Math.max(1, pagina) })
    },
    [updateFilters],
  )

  const handleTamanoChange = useCallback(
    (tamano: number) => {
      updateFilters({ tamano, pagina: 1 })
    },
    [updateFilters],
  )

  const handleResetFilters = useCallback(() => {
    setSearchParams(serializeCuarentenaSearchParams(DEFAULT_CUARENTENA_FILTERS))
  }, [setSearchParams])

  // Consultas en paralelo; candidatos solo se ejecuta si rol >= analista_mdm (evita 403 en viewer)
  const resumenQuery = useCuarentenaResumen()
  const listQuery = useCuarentenaList(filters)
  const candidatosQuery = useReinyeccionCandidatos('', canManageMdm)

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: cuarentenaQueryKeys.all })
  }, [queryClient])

  const handleOpenReinjection = useCallback(
    (tabla?: string) => {
      setReinjectionInitialTabla((tabla ?? filters.tabla).trim())
      setReinjectionOpen(true)
    },
    [filters.tabla],
  )

  const isRefreshingAny =
    resumenQuery.isFetching ||
    listQuery.isFetching ||
    (canManageMdm && candidatosQuery.isFetching)

  const rows = listQuery.data?.datos ?? EMPTY_ROWS
  const total = listQuery.data?.total ?? 0
  const candidatosCount = candidatosQuery.data?.candidatos

  const selectedRecords = useMemo(
    () =>
      rows.filter(
        (r) => isRecordPending(r.estado) && selectedKeys.has(getCuarentenaRecordKey(r)),
      ),
    [rows, selectedKeys],
  )

  const activeSelectedKeys = useMemo(
    () => new Set(selectedRecords.map(getCuarentenaRecordKey)),
    [selectedRecords],
  )

  const handleToggleSelect = useCallback((record: RegistroCuarentena, checked: boolean) => {
    const key = getCuarentenaRecordKey(record)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  const handleToggleSelectAllPending = useCallback(
    (checked: boolean) => {
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        for (const r of rows) {
          if (!isRecordPending(r.estado)) continue
          const key = getCuarentenaRecordKey(r)
          if (checked) next.add(key)
          else next.delete(key)
        }
        return next
      })
    },
    [rows],
  )

  return (
    <div className="space-y-5">
      {/* Encabezado operativo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Cuarentena MDM</h1>
            {!canManageMdm && <StatusBadge label="Solo lectura" tone="readonly" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Bandeja de rechazos de calidad, homologación canónica y reinyección controlada en capas
            Bronce.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshAll}
                  disabled={isRefreshingAny}
                />
              }
            >
              <RefreshCw className={cn('size-3.5', isRefreshingAny && 'animate-spin')} />
              Refrescar
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Actualiza resumen, bandeja y candidatos. En Etapa 1 el backend mantiene TTL breve de
              caché (30–60s) ante cambios externos o alternancia rápida de estados.
            </TooltipContent>
          </Tooltip>

          {canManageMdm && (
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenReinjection()}
            >
              <RotateCcw className="size-3.5" />
              Reinyección MDM
              {candidatosCount !== undefined && candidatosCount > 0 && (
                <Badge
                  variant="secondary"
                  className="metric-value ml-0.5 h-4 px-1.5 font-mono text-[10px] tabular-nums"
                >
                  {formatNumber(candidatosCount)}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error global de resumen si falla */}
      {resumenQuery.isError && (
        <ApiErrorBanner
          error={resumenQuery.error}
          title="No se pudo consultar el resumen de cuarentena (/api/v1/cuarentena/resumen)"
          onRetry={() => void resumenQuery.refetch()}
        />
      )}

      {/* KPIs superiores honestos */}
      <CuarentenaKpiGrid
        resumen={resumenQuery.data}
        isLoadingResumen={resumenQuery.isLoading}
        isErrorResumen={resumenQuery.isError}
        onRetryResumen={() => void resumenQuery.refetch()}
        candidatos={candidatosCount}
        isLoadingCandidatos={candidatosQuery.isLoading}
        isErrorCandidatos={candidatosQuery.isError}
        onRetryCandidatos={() => void candidatosQuery.refetch()}
        canManageMdm={canManageMdm}
        activeEstado={filters.estado}
        onSelectEstado={handleEstadoChange}
        onOpenReinjection={() => handleOpenReinjection()}
      />

      {/* Barra de acciones en lote cuando hay pendientes seleccionados */}
      {canManageMdm && selectedRecords.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/35 bg-primary/[0.06] px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Layers className="size-4 text-primary" />
            <span>
              <strong className="font-mono">{formatNumber(selectedRecords.length)}</strong>{' '}
              registro(s) pendiente(s) seleccionado(s)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs" onClick={() => setBatchMode('resolver')}>
              <Wrench className="size-3" />
              Resolver en lote
            </Button>
            <Button size="xs" variant="destructive" onClick={() => setBatchMode('rechazar')}>
              <Trash2 className="size-3" />
              Descartar en lote
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelectedKeys(new Set())}
            >
              <X className="size-3" />
              Limpiar selección
            </Button>
          </div>
        </div>
      )}

      {/* Bandeja paginada server-side */}
      <QuarantineTable
        rows={rows}
        total={total}
        pagina={filters.pagina}
        tamano={filters.tamano}
        estado={filters.estado}
        tabla={filters.tabla}
        q={filters.q}
        columna={filters.columna}
        resumen={resumenQuery.data}
        isLoading={listQuery.isLoading}
        isFetching={listQuery.isFetching}
        isPlaceholderData={listQuery.isPlaceholderData}
        isError={listQuery.isError}
        error={listQuery.error}
        canManageMdm={canManageMdm}
        selectedKeys={activeSelectedKeys}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAllPending={handleToggleSelectAllPending}
        onEstadoChange={handleEstadoChange}
        onTablaChange={handleTablaChange}
        onQueryChange={handleQueryChange}
        onColumnaChange={handleColumnaChange}
        onPaginaChange={handlePaginaChange}
        onTamanoChange={handleTamanoChange}
        onResetFilters={handleResetFilters}
        onRefresh={handleRefreshAll}
        onSelectRecord={setSelectedRecord}
      />

      {/* Drawer Solucionador de Errores */}
      <ResolveQuarantineSheet
        record={selectedRecord}
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null)
        }}
        canManageMdm={canManageMdm}
        userRoleLabel={usuario?.rol || 'viewer'}
        onOpenReinjectionForTable={
          canManageMdm ? (tabla) => handleOpenReinjection(tabla) : undefined
        }
      />

      {/* Modal de acciones en lote + Reinyección MDM (solo analista_mdm+) */}
      {canManageMdm && (
        <>
          <BatchQuarantineDialog
            mode={batchMode}
            records={selectedRecords}
            onOpenChange={(open) => {
              if (!open) setBatchMode(null)
            }}
            onCompleted={() => setSelectedKeys(new Set())}
          />
          <ReinjectionDialog
            open={reinjectionOpen}
            onOpenChange={setReinjectionOpen}
            initialTabla={reinjectionInitialTabla}
          />
        </>
      )}
    </div>
  )
}
