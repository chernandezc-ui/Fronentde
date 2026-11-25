import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Moon,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  User,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { API_BASE_URL } from '@/shared/api/client'
import { rolCumpleNivel, useAuthStore, type RolUsuario } from '@/shared/auth/authStore'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { mapEstadoToTone } from '@/shared/components/statusTone'
import { useTheme } from '@/shared/lib/theme'
import { fetchCurrentUser } from '@/features/auth/authApi'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { fetchHealth, fetchRunnerReady } from '@/features/dashboard/dashboardApi'
import { useTelemetryStream } from '@/features/dashboard/useTelemetryStream'

interface NavModuleItem {
  to: string
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  minRole: RolUsuario
  end?: boolean
}

const NAV_MODULES: NavModuleItem[] = [
  {
    to: '/',
    label: 'Centro de Control',
    shortLabel: 'Control',
    description: 'Salud, telemetría SSE y alertas operativas',
    icon: LayoutDashboard,
    minRole: 'viewer',
    end: true,
  },
  {
    to: '/etl',
    label: 'Monitor ETL',
    shortLabel: 'ETL',
    description: 'Corridas, pasos en vivo y control-plane',
    icon: Workflow,
    minRole: 'viewer',
  },
  {
    to: '/cuarentena',
    label: 'Cuarentena',
    shortLabel: 'Cuarentena',
    description: 'Registros rechazados y resolución MDM',
    icon: ShieldAlert,
    minRole: 'viewer',
  },
  {
    to: '/proyecciones',
    label: 'Proyecciones',
    shortLabel: 'Six-Week',
    description: 'Proyección fenológica Six-Week y cobertura',
    icon: TrendingUp,
    minRole: 'viewer',
  },
  {
    to: '/maestros',
    label: 'Datos Maestros',
    shortLabel: 'Maestros',
    description: 'Catálogos, fundos y homologaciones',
    icon: Database,
    minRole: 'viewer',
  },
  {
    to: '/operarios',
    label: 'Operarios',
    shortLabel: 'Operarios',
    description: 'Personal y trazabilidad operativa',
    icon: Users,
    minRole: 'viewer',
  },
  {
    to: '/configuracion',
    label: 'Configuración',
    shortLabel: 'Config',
    description: 'Parámetros del sistema y cuentas',
    icon: SlidersHorizontal,
    minRole: 'analista_mdm',
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    shortLabel: 'Auditoría',
    description: 'Bitácora de cargas y métricas DWH',
    icon: FileText,
    minRole: 'viewer',
  },
]

const SIDEBAR_STORAGE_KEY = 'acp-control-sidebar-collapsed'

function getInitialCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShell() {
  const usuario = useAuthStore((s) => s.usuario)
  const setUsuario = useAuthStore((s) => s.setUsuario)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()

  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

  // Validar y refrescar perfil desde JWT (/auth/me)
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  useEffect(() => {
    if (meQuery.data) {
      const currentEmail = useAuthStore.getState().usuario?.email ?? null
      setUsuario({
        ...meQuery.data,
        email: meQuery.data.email ?? currentEmail,
      })
    }
  }, [meQuery.data, setUsuario])

  // Telemetría SSE compartida + sondas ligeras de salud para la barra superior
  const telemetry = useTelemetryStream(true)

  const healthQuery = useQuery({
    queryKey: ['health', 'full'],
    queryFn: fetchHealth,
    refetchInterval: 20_000,
    retry: 1,
  })

  const runnerQuery = useQuery({
    queryKey: ['health', 'runner'],
    queryFn: fetchRunnerReady,
    refetchInterval: 15_000,
    retry: 1,
  })

  // Atajo global Ctrl+K / Cmd+K para paleta rápida
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      } catch {
        // noop
      }
      return next
    })
  }

  function handleLogout() {
    logout()
    queryClient.clear()
    toast.info('Sesión cerrada')
    navigate('/login', { replace: true })
  }

  function handleRefreshAll() {
    void queryClient.invalidateQueries()
    if (telemetry.status === 'error' || telemetry.status === 'closed') {
      telemetry.reconnect()
    }
    toast.success('Consultas actualizadas')
  }

  const activeModule = useMemo(() => {
    return (
      NAV_MODULES.find((item) =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
      ) ?? NAV_MODULES[0]
    )
  }, [location.pathname])

  // Estado derivado de indicadores vivos en topbar
  const dbConnected = telemetry.latest?.conectado ?? healthQuery.data?.base_datos?.conectado
  const dbLatency = telemetry.latest?.latencia_ms ?? healthQuery.data?.base_datos?.latencia_ms
  const apiStatusInfo = useMemo(() => {
    if (healthQuery.isError && !telemetry.latest) {
      return { label: 'API OFFLINE', tone: 'error' as const, detail: 'No se pudo conectar al backend' }
    }
    if (healthQuery.isLoading && !telemetry.latest) {
      return { label: 'API…', tone: 'neutral' as const, detail: 'Consultando /health' }
    }
    if (dbConnected === false) {
      return { label: 'BD CAÍDA', tone: 'error' as const, detail: 'SQL Server no responde' }
    }
    return {
      label: dbLatency != null ? `BD ${dbLatency}ms` : 'BD OK',
      tone: 'ok' as const,
      detail: healthQuery.data?.base_datos?.base_datos
        ? `Conectado a ${healthQuery.data.base_datos.base_datos}`
        : 'Base de datos operativa',
    }
  }, [dbConnected, dbLatency, healthQuery.data, healthQuery.isError, healthQuery.isLoading, telemetry.latest])

  const runnerStatusInfo = useMemo(() => {
    if (runnerQuery.isError) {
      return { label: 'RUNNER ?', tone: 'error' as const, detail: 'Error consultando /health/ready/runner' }
    }
    if (runnerQuery.isLoading) {
      return { label: 'RUNNER…', tone: 'neutral' as const, detail: 'Verificando runner ETL' }
    }
    const estado = (runnerQuery.data?.estado || 'desconocido').toUpperCase()
    return {
      label: `RUNNER ${estado}`,
      tone: mapEstadoToTone(estado),
      detail:
        runnerQuery.data?.httpStatus === 503
          ? `Runner no listo (HTTP 503 · ${estado})`
          : `Estado del runner: ${estado}`,
    }
  }, [runnerQuery.data, runnerQuery.isError, runnerQuery.isLoading])

  const sseStatusInfo = useMemo(() => {
    switch (telemetry.status) {
      case 'open':
        return { label: 'SSE VIVO', tone: 'ok' as const, detail: 'Stream /health/telemetria/stream conectado' }
      case 'connecting':
        return { label: 'SSE…', tone: 'pending' as const, detail: 'Conectando stream SSE' }
      case 'reconnecting':
        return { label: 'SSE RECONECT.', tone: 'warning' as const, detail: 'Reintentando conexión SSE' }
      case 'error':
        return {
          label: 'SSE ERROR',
          tone: 'error' as const,
          detail: telemetry.lastError || 'Stream desconectado — clic para reconectar',
        }
      case 'closed':
        return { label: 'SSE CERRADO', tone: 'cancelled' as const, detail: 'Stream cerrado — clic para reconectar' }
      default:
        return { label: 'SSE IDLE', tone: 'neutral' as const, detail: 'Stream inactivo' }
    }
  }, [telemetry.lastError, telemetry.status])

  const userInitials = useMemo(() => {
    const base = usuario?.nombre_display || usuario?.nombre_usuario || 'U'
    return base
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }, [usuario?.nombre_display, usuario?.nombre_usuario])

  function renderNavItems(isCompact: boolean, onItemSelect?: () => void) {
    return (
      <nav aria-label="Módulos principales" className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV_MODULES.map((item) => {
          const Icon = item.icon
          const permitted = rolCumpleNivel(usuario?.rol, item.minRole)

          const linkElement = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onItemSelect}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isCompact && 'justify-center px-0',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  !permitted && 'opacity-65',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!isCompact && (
                <>
                  <span className="truncate">{item.label}</span>
                  {!permitted && (
                    <Lock
                      className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                      aria-label={`Requiere rol ${item.minRole}`}
                    />
                  )}
                </>
              )}
            </NavLink>
          )

          if (isCompact) {
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger render={linkElement} />
                <TooltipContent side="right" className="flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {!permitted && <span className="opacity-70">({item.minRole}+)</span>}
                </TooltipContent>
              </Tooltip>
            )
          }

          return linkElement
        })}
      </nav>
    )
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {/* Sidebar escritorio */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border px-3',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-card font-mono text-[11px] font-semibold tracking-tight text-foreground">
              ACP
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight tracking-tight">
                  ACP Control
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  DWH Console
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleSidebar}
              aria-label="Colapsar barra lateral"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>

        {renderNavItems(collapsed)}

        <div className="mt-auto border-t border-sidebar-border p-2">
          {collapsed ? (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleSidebar}
                      aria-label="Expandir barra lateral"
                    />
                  }
                >
                  <ChevronRight className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="right">Expandir menú</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="rounded-lg bg-sidebar-accent/45 px-2.5 py-2 text-[11px] text-muted-foreground">
              <p className="font-medium text-sidebar-foreground/85">Backend API</p>
              <p className="mt-0.5 truncate font-mono text-[10px]" title={API_BASE_URL}>
                {API_BASE_URL.replace(/^https?:\/\//, '')}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Contenedor principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-md sm:px-5">
          {/* Trigger Sheet móvil */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="lg:hidden"
                  aria-label="Abrir navegación"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-4 py-3.5">
                <SheetTitle className="flex items-center gap-2.5 text-left text-sm">
                  <span className="flex size-7 items-center justify-center rounded-md border bg-card font-mono text-[11px] font-semibold">
                    ACP
                  </span>
                  <span>ACP Control Web</span>
                </SheetTitle>
              </SheetHeader>
              {renderNavItems(false, () => setMobileNavOpen(false))}
              <div className="mt-auto border-t p-3 text-xs text-muted-foreground">
                <p className="font-mono text-[11px]">{API_BASE_URL}</p>
              </div>
            </SheetContent>
          </Sheet>

          {/* Título del módulo activo */}
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight sm:text-base">
              {activeModule.label}
            </h2>
            <span className="hidden font-mono text-[11px] text-muted-foreground xl:inline">
              {location.pathname}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Botón Paleta Ctrl+K */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="h-8 gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Ir a módulo…</span>
              <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
                Ctrl K
              </kbd>
            </Button>

            {/* Indicadores vivos de salud (API/BD + Runner + SSE) */}
            <div className="hidden items-center gap-1.5 md:flex">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex cursor-pointer outline-none"
                    />
                  }
                >
                  <StatusBadge label={apiStatusInfo.label} tone={apiStatusInfo.tone} />
                </TooltipTrigger>
                <TooltipContent>{apiStatusInfo.detail}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => navigate('/etl')}
                      className="inline-flex cursor-pointer outline-none"
                    />
                  }
                >
                  <StatusBadge label={runnerStatusInfo.label} tone={runnerStatusInfo.tone} />
                </TooltipTrigger>
                <TooltipContent>{runnerStatusInfo.detail}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      onClick={() => {
                        if (telemetry.status === 'error' || telemetry.status === 'closed') {
                          telemetry.reconnect()
                        } else {
                          navigate('/')
                        }
                      }}
                      className="inline-flex cursor-pointer outline-none"
                    />
                  }
                >
                  <StatusBadge label={sseStatusInfo.label} tone={sseStatusInfo.tone} />
                </TooltipTrigger>
                <TooltipContent>{sseStatusInfo.detail}</TooltipContent>
              </Tooltip>
            </div>

            <Separator orientation="vertical" className="hidden h-5 md:block" />

            {/* Selector de tema claro/oscuro */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggleTheme}
                    aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                  />
                }
              >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </TooltipTrigger>
              <TooltipContent>
                {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
              </TooltipContent>
            </Tooltip>

            {/* Menú de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 px-2"
                    aria-label="Menú de usuario"
                  />
                }
              >
                <span className="flex size-6 items-center justify-center rounded-md border bg-muted font-mono text-[11px] font-semibold text-foreground">
                  {userInitials}
                </span>
                <span className="hidden max-w-28 truncate text-xs font-medium sm:inline">
                  {usuario?.nombre_display || usuario?.nombre_usuario || 'Usuario'}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="space-y-1.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {usuario?.nombre_display || 'Operador'}
                      </span>
                      <StatusBadge
                        label={usuario?.rol || 'viewer'}
                        tone="readonly"
                        showDot={false}
                      />
                    </div>
                    <p className="truncate font-mono text-[11px] font-normal text-muted-foreground">
                      @{usuario?.nombre_usuario || '—'}
                      {usuario?.email ? ` · ${usuario.email}` : ''}
                    </p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                  <KeyRound className="size-4" />
                  <span>Cambiar contraseña</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefreshAll}>
                  <RefreshCw className="size-4" />
                  <span>Actualizar datos</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Paleta rápida Ctrl+K */}
      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Paleta de navegación rápida"
        description="Navega entre módulos o ejecuta acciones operativas."
      >
        <Command>
          <CommandInput placeholder="Buscar módulo o acción operativa…" />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup heading="Módulos">
              {NAV_MODULES.map((item) => {
                const Icon = item.icon
                const permitted = rolCumpleNivel(usuario?.rol, item.minRole)
                return (
                  <CommandItem
                    key={item.to}
                    value={`${item.label} ${item.description} ${item.to}`}
                    onSelect={() => {
                      setCommandOpen(false)
                      navigate(item.to)
                    }}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{item.label}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                    {!permitted && (
                      <CommandShortcut>{item.minRole}+</CommandShortcut>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Acciones rápidas">
              <CommandItem
                value="cambiar tema claro oscuro dark light"
                onSelect={() => {
                  toggleTheme()
                  setCommandOpen(false)
                }}
              >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                <span>Cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}</span>
              </CommandItem>
              <CommandItem
                value="actualizar refrescar consultas datos"
                onSelect={() => {
                  setCommandOpen(false)
                  handleRefreshAll()
                }}
              >
                <RefreshCw className="size-4" />
                <span>Refrescar consultas activas</span>
              </CommandItem>
              <CommandItem
                value="reconectar stream sse telemetria"
                onSelect={() => {
                  setCommandOpen(false)
                  telemetry.reconnect()
                  toast.info('Reconectando telemetría SSE…')
                }}
              >
                <Radio className="size-4" />
                <span>Reconectar telemetría SSE</span>
              </CommandItem>
              <CommandItem
                value="cambiar contrasena clave seguridad usuario"
                onSelect={() => {
                  setCommandOpen(false)
                  setPasswordDialogOpen(true)
                }}
              >
                <User className="size-4" />
                <span>Cambiar contraseña</span>
              </CommandItem>
              <CommandItem
                value="cerrar sesion salir logout"
                onSelect={() => {
                  setCommandOpen(false)
                  handleLogout()
                }}
              >
                <Activity className="size-4" />
                <span>Cerrar sesión</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>

      {/* Diálogo cambiar contraseña */}
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  )
}
