import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  FlaskConical,
  Lock,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { MatrizBiologicaTab } from './components/MatrizBiologicaTab'
import { ParametrosTab } from './components/ParametrosTab'
import { ReglasTab } from './components/ReglasTab'
import { UsuariosTab } from './components/UsuariosTab'
import { parseConfiguracionTab } from './schemas'
import type { ConfiguracionTab } from './types'
import { configuracionQueryKeys } from './useConfiguracionQueries'

export function ConfiguracionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()

  const usuario = useAuthStore((state) => state.usuario)
  const canEditConfig = rolCumpleNivel(usuario?.rol, 'analista_mdm')
  const canAdmin = rolCumpleNivel(usuario?.rol, 'admin')

  const activeTab: ConfiguracionTab = parseConfiguracionTab(
    searchParams.get('tab'),
  )

  const setActiveTab = useCallback(
    (nextTab: ConfiguracionTab) => {
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

  const handleTabChange = useCallback(
    (value: unknown) => {
      const nextTab = parseConfiguracionTab(
        typeof value === 'string' ? value : null,
      )
      setActiveTab(nextTab)
    },
    [setActiveTab],
  )

  const handleRefreshAll = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: configuracionQueryKeys.parametros(),
    })
    void queryClient.invalidateQueries({
      queryKey: configuracionQueryKeys.matriz(),
    })
    void queryClient.invalidateQueries({
      queryKey: configuracionQueryKeys.reglasAll(),
    })
    if (canAdmin) {
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.usuarios(),
      })
    }
  }, [queryClient, canAdmin])

  return (
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
                Configuración
              </h1>
              {canAdmin ? (
                <StatusBadge label="Admin · Control total" tone="ok" />
              ) : (
                <StatusBadge
                  label="Analista MDM+ · Pipeline y Biología"
                  tone="running"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Parámetros operativos del pipeline, matriz biológica Six-Week,
              reglas de validación DQ y administración de cuentas de acceso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshAll}>
              <RefreshCw className="size-3.5" />
              Recargar configuración
            </Button>
          </div>
        </div>

        {/* Tabs synced with URL ?tab=parametros|biologia|reglas|usuarios */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="parametros" className="gap-1.5 px-3 py-1.5">
              <SlidersHorizontal className="size-3.5" />
              Parámetros
            </TabsTrigger>
            <TabsTrigger value="biologia" className="gap-1.5 px-3 py-1.5">
              <FlaskConical className="size-3.5" />
              Biología y Matriz
            </TabsTrigger>
            <TabsTrigger value="reglas" className="gap-1.5 px-3 py-1.5">
              <ShieldCheck className="size-3.5" />
              Reglas
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="gap-1.5 px-3 py-1.5">
              <Users className="size-3.5" />
              Usuarios
              {!canAdmin && (
                <Lock className="size-3 opacity-60" aria-hidden="true" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parametros">
            <ParametrosTab
              active={activeTab === 'parametros'}
              onOpenBiologiaTab={() => setActiveTab('biologia')}
            />
          </TabsContent>

          <TabsContent value="biologia">
            <MatrizBiologicaTab
              active={activeTab === 'biologia'}
              canEdit={canEditConfig}
            />
          </TabsContent>

          <TabsContent value="reglas">
            <ReglasTab
              active={activeTab === 'reglas'}
              canEdit={canEditConfig}
            />
          </TabsContent>

          <TabsContent value="usuarios">
            <UsuariosTab
              active={activeTab === 'usuarios'}
              canAdmin={canAdmin}
              currentUsername={usuario?.nombre_usuario ?? null}
              currentRole={usuario?.rol ?? null}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
  )
}
