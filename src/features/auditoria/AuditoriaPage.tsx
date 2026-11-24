import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { FileSpreadsheet, Lock, RefreshCw, ScrollText } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  DEFAULT_BITACORA_FILTERS,
  extractCatalogTables,
  parseAuditoriaTab,
  parseBitacoraSearchParams,
  serializeAuditoriaSearchParams,
} from './auditoriaUtils'
import { BitacoraTab } from './components/BitacoraTab'
import { IngestaTab } from './components/IngestaTab'
import type { AuditoriaTabId, BitacoraFiltrosUrl, EtlFactCatalogItem } from './types'
import { auditoriaQueryKeys, useEtlCatalogFactsQuery } from './useAuditoriaQueries'

const EMPTY_FACTS: EtlFactCatalogItem[] = []

export function AuditoriaPage() {
  const reduceMotion = useReducedMotion()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const usuario = useAuthStore((state) => state.usuario)
  const canIngest = rolCumpleNivel(usuario?.rol, 'analista_mdm')

  const activeTab = useMemo<AuditoriaTabId>(
    () => parseAuditoriaTab(searchParams),
    [searchParams],
  )

  const filters = useMemo<BitacoraFiltrosUrl>(
    () => parseBitacoraSearchParams(searchParams),
    [searchParams],
  )

  const factsQuery = useEtlCatalogFactsQuery()
  const catalogTables = useMemo(
    () => extractCatalogTables(factsQuery.data ?? EMPTY_FACTS),
    [factsQuery.data],
  )

  const fetchingAuditoriaCount = useIsFetching({ queryKey: auditoriaQueryKeys.all })
  const isRefreshing = fetchingAuditoriaCount > 0 || factsQuery.isFetching

  const handleTabChange = useCallback(
    (nextTab: AuditoriaTabId) => {
      if (nextTab === activeTab) return
      setSearchParams(serializeAuditoriaSearchParams(nextTab, filters))
    },
    [activeTab, filters, setSearchParams],
  )

  const handleUpdateFilters = useCallback(
    (patch: Partial<BitacoraFiltrosUrl>, options?: { replace?: boolean }) => {
      const next: BitacoraFiltrosUrl = {
        ...filters,
        ...patch,
      }
      setSearchParams(serializeAuditoriaSearchParams(activeTab, next), {
        replace: options?.replace ?? false,
      })
    },
    [activeTab, filters, setSearchParams],
  )

  const handleResetFilters = useCallback(() => {
    const reset: BitacoraFiltrosUrl = {
      ...DEFAULT_BITACORA_FILTERS,
      ventana_dias: filters.ventana_dias,
      tamano: filters.tamano,
    }
    setSearchParams(serializeAuditoriaSearchParams(activeTab, reset))
  }, [activeTab, filters.tamano, filters.ventana_dias, setSearchParams])

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: auditoriaQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: auditoriaQueryKeys.etlFacts() })
  }, [queryClient])

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-5"
    >
      {/* Encabezado operativo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Auditoría y Bitácora</h1>
            {!canIngest && <StatusBadge label="Solo lectura" tone="readonly" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Explorador paginado de <span className="font-mono">Auditoria.Log_Carga</span>, métricas
            operativas por ventana, pre-validación CSV en memoria y exportación controlada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
            Refrescar
          </Button>
        </div>
      </div>

      {/* Tabs sincronizados con ?tab=bitacora|ingesta */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === 'bitacora' || value === 'ingesta') {
            handleTabChange(value)
          }
        }}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="bitacora" className="gap-1.5 px-3">
            <ScrollText className="size-3.5" />
            Bitácora de cargas
          </TabsTrigger>
          <TabsTrigger value="ingesta" className="gap-1.5 px-3">
            <FileSpreadsheet className="size-3.5" />
            Ingesta y Exportación CSV
            {!canIngest && <Lock className="size-3 opacity-65" aria-hidden="true" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bitacora">
          <BitacoraTab
            filters={filters}
            catalogTables={catalogTables}
            onUpdateFilters={handleUpdateFilters}
            onResetFilters={handleResetFilters}
          />
        </TabsContent>

        <TabsContent value="ingesta">
          <IngestaTab
            catalogTables={catalogTables}
            isLoadingCatalog={factsQuery.isLoading}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
