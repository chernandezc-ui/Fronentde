import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, MapPin, RefreshCw, Sprout } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { DimVariedadesTab } from './components/DimVariedadesTab'
import { GeografiaTab } from './components/GeografiaTab'
import { MdmVariedadesTab } from './components/MdmVariedadesTab'
import { parseMaestrosTab } from './schemas'
import type { MaestrosTab } from './types'
import { maestrosQueryKeys } from './useMaestrosQueries'

export function MaestrosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()

  const canAdmin = useAuthStore((state) =>
    rolCumpleNivel(state.usuario?.rol, 'admin'),
  )

  const activeTab: MaestrosTab = parseMaestrosTab(searchParams.get('tab'))

  const handleTabChange = useCallback(
    (value: unknown) => {
      const nextTab = parseMaestrosTab(
        typeof value === 'string' ? value : null,
      )
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('tab', nextTab)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: maestrosQueryKeys.all })
  }, [queryClient])

  return (
    <TooltipProvider>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="space-y-5"
      >
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Datos Maestros
              </h1>
              {canAdmin ? (
                <StatusBadge label="Admin · CRUD Variedades DWH" tone="ok" />
              ) : (
                <StatusBadge label="Solo lectura" tone="readonly" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Gobierno de dimensiones homologadas del DWH (
              <span className="font-mono">Silver.Dim_Variedad</span>), catálogo canónico MDM y geografía vigente con búsqueda server-side.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshAll}>
              <RefreshCw className="size-3.5" />
              Recargar catálogos
            </Button>
          </div>
        </div>

        {/* Tabs synced with URL ?tab=variedades|mdm|geografia */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="variedades" className="gap-1.5 px-3">
              <Sprout className="size-3.5" />
              Variedades DWH
            </TabsTrigger>
            <TabsTrigger value="mdm" className="gap-1.5 px-3">
              <BookOpenCheck className="size-3.5" />
              Catálogo MDM
            </TabsTrigger>
            <TabsTrigger value="geografia" className="gap-1.5 px-3">
              <MapPin className="size-3.5" />
              Geografía
            </TabsTrigger>
          </TabsList>

          <TabsContent value="variedades">
            <DimVariedadesTab canAdmin={canAdmin} />
          </TabsContent>

          <TabsContent value="mdm">
            <MdmVariedadesTab active={activeTab === 'mdm'} />
          </TabsContent>

          <TabsContent value="geografia">
            <GeografiaTab active={activeTab === 'geografia'} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </TooltipProvider>
  )
}
