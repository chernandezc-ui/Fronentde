import { useMemo, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  History,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { API_ENDPOINTS, isEndpointNotImplementedError } from '@/shared/api/endpoints'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { EndpointPendingBanner } from '@/shared/components/EndpointPendingBanner'
import { StatusBadge, type OperationalTone } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import {
  ACCESOS_ACCIONES_PRESETS,
  ACCESOS_PAGE_SIZE_OPTIONS,
} from '../auditoriaUtils'
import { useAuditoriaAccesosQuery } from '../useAuditoriaQueries'

interface AccesosTabProps {
  active: boolean
}

const ALL_ACCIONES = '__ALL__'

function mapAccionSeguridadTone(accion: string, estadoHttp: number | null): OperationalTone {
  const norm = accion.toUpperCase()
  if (
    norm.includes('FALLIDO') ||
    norm.includes('ERROR') ||
    norm.includes('DENEGADO') ||
    (estadoHttp !== null && estadoHttp >= 400)
  ) {
    return 'error'
  }
  if (norm.includes('DESACTIV') || norm.includes('RECHAZ') || norm.includes('WARN')) {
    return 'warning'
  }
  if (norm.includes('LOGIN_OK') || norm.includes('CREAR') || norm.includes('ACTIV')) {
    return 'ok'
  }
  if (norm.includes('CORRIDA') || norm.includes('ETL')) {
    return 'running'
  }
  return 'neutral'
}

export function AccesosTab({ active }: AccesosTabProps) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState<number>(50)
  const [usuario, setUsuario] = useState('')
  const [accionFiltro, setAccionFiltro] = useState<string>(ALL_ACCIONES)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const queryParams = useMemo(
    () => ({
      pagina,
      tamano,
      usuario: usuario.trim() || undefined,
      accion: accionFiltro === ALL_ACCIONES ? undefined : accionFiltro,
      desde: desde.trim() || undefined,
      hasta: hasta.trim() || undefined,
    }),
    [pagina, tamano, usuario, accionFiltro, desde, hasta],
  )

  const query = useAuditoriaAccesosQuery(queryParams, active)
  const items = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / tamano))
  const rangeStart = total === 0 ? 0 : (pagina - 1) * tamano + 1
  const rangeEnd = Math.min(total, pagina * tamano)

  const isEndpointPending =
    query.isError && isEndpointNotImplementedError(query.error)

  const handleResetFilters = () => {
    setUsuario('')
    setAccionFiltro(ALL_ACCIONES)
    setDesde('')
    setHasta('')
    setPagina(1)
  }

  const handleCopyRequestId = async (requestId: string) => {
    try {
      await navigator.clipboard.writeText(requestId)
      setCopiedId(requestId)
      window.setTimeout(() => setCopiedId((prev) => (prev === requestId ? null : prev)), 1500)
    } catch {
      // Clipboard no disponible
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <History className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Accesos y Trazabilidad del Portal (Seguridad.Log_Accesos)
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                {formatNumber(total)} eventos
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(tamano)}
                onValueChange={(val) => {
                  if (!val) return
                  const parsed = Number(val)
                  if (!Number.isNaN(parsed)) {
                    setTamano(parsed)
                    setPagina(1)
                  }
                }}
              >
                <SelectTrigger size="sm" aria-label="Eventos de acceso por página">
                  <SelectValue>{tamano} / pág</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACCESOS_PAGE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      {opt} por página
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
              >
                <RotateCcw className="size-3.5" />
                Limpiar
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw
                  className={cn('size-3.5', query.isFetching && 'animate-spin')}
                />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value)
                  setPagina(1)
                }}
                placeholder="Filtrar por usuario..."
                aria-label="Filtrar accesos por usuario"
                className="pl-8 text-xs"
              />
            </div>

            <Select
              value={accionFiltro}
              onValueChange={(val) => {
                if (!val) return
                setAccionFiltro(val)
                setPagina(1)
              }}
            >
              <SelectTrigger size="sm" aria-label="Filtrar accesos por acción">
                <SelectValue>
                  {accionFiltro === ALL_ACCIONES ? 'Todas las acciones' : accionFiltro}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACCIONES}>Todas las acciones</SelectItem>
                {ACCESOS_ACCIONES_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                setPagina(1)
              }}
              aria-label="Fecha desde accesos"
              className="font-mono text-xs"
            />

            <Input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value)
                setPagina(1)
              }}
              aria-label="Fecha hasta accesos"
              className="font-mono text-xs"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isEndpointPending ? (
            <div className="p-4">
              <EndpointPendingBanner
                method="GET"
                endpoint={API_ENDPOINTS.auditoria.accesos}
                title="Auditoría de accesos pendiente en el backend"
                description="El visor paginado de accesos y acciones del portal está listo; publica el endpoint en FastAPI para listar eventos de seguridad."
                onRetry={() => void query.refetch()}
                isRetrying={query.isFetching}
              />
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al cargar la auditoría de accesos"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'overflow-x-auto transition-opacity duration-150',
                  query.isPlaceholderData && 'opacity-65',
                )}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        Usuario / Rol
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        Acción
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        Módulo / Ruta
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        IP
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        X-Request-ID
                      </TableHead>
                      <TableHead className="h-9 text-xs font-semibold text-muted-foreground">
                        Detalle
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-12 text-center text-xs text-muted-foreground"
                        >
                          No se encontraron eventos de acceso con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const isCopied =
                          item.request_id !== null && copiedId === item.request_id
                        return (
                          <TableRow key={String(item.id_acceso)}>
                            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
                              {formatDateTime(item.fecha)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="max-w-[160px] truncate font-mono text-xs font-medium text-foreground">
                                  {item.nombre_usuario}
                                </span>
                                {item.rol && (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px]"
                                  >
                                    {item.rol}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                label={item.accion}
                                tone={mapAccionSeguridadTone(
                                  item.accion,
                                  item.estado_http,
                                )}
                              />
                            </TableCell>
                            <TableCell className="max-w-[260px]">
                              <div className="space-y-0.5">
                                {item.modulo && (
                                  <p className="truncate text-xs font-medium text-foreground">
                                    {item.modulo}
                                  </p>
                                )}
                                {item.ruta && (
                                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                                    {item.metodo ? `${item.metodo} ` : ''}
                                    {item.ruta}
                                    {item.estado_http !== null
                                      ? ` (${item.estado_http})`
                                      : ''}
                                  </p>
                                )}
                                {!item.modulo && !item.ruta && (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                              {item.ip ?? '—'}
                            </TableCell>
                            <TableCell>
                              {item.request_id ? (
                                <div className="flex items-center gap-1">
                                  <span
                                    title={item.request_id}
                                    className="max-w-[130px] truncate font-mono text-[11px] text-muted-foreground"
                                  >
                                    {item.request_id}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={`Copiar request ID ${item.request_id}`}
                                    onClick={() =>
                                      void handleCopyRequestId(item.request_id!)
                                    }
                                  >
                                    {isCopied ? (
                                      <Check className="size-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="size-3" />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[240px]">
                              <span className="line-clamp-2 break-words text-xs text-muted-foreground">
                                {item.detalle ?? '—'}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {total > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    Mostrando {formatNumber(rangeStart)}–{formatNumber(rangeEnd)}{' '}
                    de {formatNumber(total)} · Página {pagina} de{' '}
                    {formatNumber(totalPages)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina <= 1 || query.isFetching}
                    >
                      <ChevronLeft className="size-3.5" />
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        setPagina((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={pagina >= totalPages || query.isFetching}
                    >
                      Siguiente
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
