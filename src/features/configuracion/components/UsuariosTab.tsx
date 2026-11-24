import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type SortingState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  KeyRound,
  Pencil,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import { ROLES_USUARIO_META, getRolMeta } from '../schemas'
import type { UsuarioAdmin } from '../types'
import {
  useToggleUsuarioEstadoMutation,
  useUsuarios,
} from '../useConfiguracionQueries'
import { ConfirmUserToggleDialog } from './ConfirmUserToggleDialog'
import { CreateUserDialog } from './CreateUserDialog'
import { EditUserDialog } from './EditUserDialog'
import { ResetUserPasswordDialog } from './ResetUserPasswordDialog'

type EstadoUsuarioFiltro = 'TODOS' | 'ACTIVOS' | 'INACTIVOS'

const ALL_ROLES = '__ALL__'
const EMPTY_USUARIOS: UsuarioAdmin[] = []

const ESTADO_OPTIONS: { value: EstadoUsuarioFiltro; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ACTIVOS', label: 'Activos' },
  { value: 'INACTIVOS', label: 'Inactivos' },
]

const usuariosTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

const columnHelper = createColumnHelper<
  typeof usuariosTableFeatures,
  UsuarioAdmin
>()

function compareNullableIsoDates(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const ta = a ? Date.parse(a) : Number.NaN
  const tb = b ? Date.parse(b) : Number.NaN
  const aInvalid = Number.isNaN(ta)
  const bInvalid = Number.isNaN(tb)
  if (aInvalid && bInvalid) return 0
  if (aInvalid) return -1
  if (bInvalid) return 1
  return ta - tb
}

interface UsuariosTabProps {
  active: boolean
  canAdmin: boolean
  currentUsername: string | null
  currentRole: string | null
}

/**
 * Componente contenedor: si `!canAdmin`, NO monta `UsuariosAdminPanel` y
 * por lo tanto jamás dispara `GET /auth/usuarios`.
 */
export function UsuariosTab({
  active,
  canAdmin,
  currentUsername,
  currentRole,
}: UsuariosTabProps) {
  if (!canAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
            <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="max-w-md space-y-1.5">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">
                Requiere rol admin
              </h2>
              <StatusBadge label="Acceso restringido" tone="warning" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La administración de cuentas y roles en{' '}
              <span className="font-mono text-foreground">
                Seguridad.Usuarios
              </span>{' '}
              está reservada exclusivamente para usuarios con rol{' '}
              <span className="font-mono font-semibold text-foreground">
                admin
              </span>
              . Tu sesión actual cuenta con el rol{' '}
              <span className="font-mono font-semibold text-foreground">
                {currentRole ?? 'desconocido'}
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <UsuariosAdminPanel active={active} currentUsername={currentUsername} />
  )
}

interface UsuariosAdminPanelProps {
  active: boolean
  currentUsername: string | null
}

function UsuariosAdminPanel({
  active,
  currentUsername,
}: UsuariosAdminPanelProps) {
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>(ALL_ROLES)
  const [estadoFiltro, setEstadoFiltro] =
    useState<EstadoUsuarioFiltro>('TODOS')
  const [sorting, setSorting] = useState<SortingState>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<UsuarioAdmin | null>(null)
  const [editTarget, setEditTarget] = useState<UsuarioAdmin | null>(null)
  const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null)

  const query = useUsuarios(active)
  const toggleMutation = useToggleUsuarioEstadoMutation()

  const rows = query.data ?? EMPTY_USUARIOS
  const normalizedCurrentUser = (currentUsername ?? '').toLowerCase().trim()

  const kpis = useMemo(() => {
    let activos = 0
    let admins = 0
    for (const user of rows) {
      if (user.es_activo) activos += 1
      if (user.rol.toLowerCase() === 'admin' && user.es_activo) admins += 1
    }
    return {
      total: rows.length,
      activos,
      inactivos: rows.length - activos,
      admins,
    }
  }, [rows])

  const filteredData = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return rows.filter((item) => {
      if (estadoFiltro === 'ACTIVOS' && !item.es_activo) return false
      if (estadoFiltro === 'INACTIVOS' && item.es_activo) return false
      if (
        roleFilter !== ALL_ROLES &&
        item.rol.toLowerCase() !== roleFilter.toLowerCase()
      ) {
        return false
      }
      if (!q) return true
      return (
        item.nombre_usuario.toLowerCase().includes(q) ||
        item.nombre_display.toLowerCase().includes(q) ||
        (item.email?.toLowerCase().includes(q) ?? false) ||
        item.rol.toLowerCase().includes(q)
      )
    })
  }, [rows, searchText, roleFilter, estadoFiltro])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('nombre_usuario', {
          header: 'Usuario',
          cell: (info) => {
            const val = info.getValue()
            const isSelf =
              normalizedCurrentUser.length > 0 &&
              val.toLowerCase() === normalizedCurrentUser
            return (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-semibold text-foreground">
                  {val}
                </span>
                {isSelf && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 font-mono text-[10px]"
                  >
                    Tú
                  </Badge>
                )}
              </div>
            )
          },
        }),
        columnHelper.accessor('nombre_display', {
          header: 'Nombre y correo',
          cell: (info) => {
            const row = info.row.original
            return (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">
                  {row.nombre_display}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {row.email || (
                    <span className="italic opacity-70">Sin correo</span>
                  )}
                </p>
              </div>
            )
          },
        }),
        columnHelper.accessor('rol', {
          header: 'Rol',
          cell: (info) => {
            const rol = info.getValue()
            const meta = getRolMeta(rol)
            return (
              <StatusBadge label={rol} tone={meta.tone} showDot={false} />
            )
          },
        }),
        columnHelper.accessor('es_activo', {
          header: 'Estado',
          sortFn: (rowA, rowB) =>
            Number(rowA.original.es_activo) - Number(rowB.original.es_activo),
          cell: (info) =>
            info.getValue() ? (
              <StatusBadge label="ACTIVO" tone="ok" />
            ) : (
              <StatusBadge label="INACTIVO" tone="cancelled" />
            ),
        }),
        columnHelper.accessor('ultimo_acceso', {
          header: 'Último acceso',
          sortFn: (rowA, rowB) =>
            compareNullableIsoDates(
              rowA.original.ultimo_acceso,
              rowB.original.ultimo_acceso,
            ),
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatDateTime(info.getValue())}
            </span>
          ),
        }),
        columnHelper.accessor('fecha_creacion', {
          header: 'Creación',
          sortFn: (rowA, rowB) =>
            compareNullableIsoDates(
              rowA.original.fecha_creacion,
              rowB.original.fecha_creacion,
            ),
          cell: (info) => (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatDateTime(info.getValue())}
            </span>
          ),
        }),
        columnHelper.display({
          id: 'acciones',
          header: 'Acciones',
          cell: (info) => {
            const row = info.row.original
            const isSelf =
              normalizedCurrentUser.length > 0 &&
              row.nombre_usuario.toLowerCase() === normalizedCurrentUser
            const isSelfActive = isSelf && row.es_activo

            return (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditTarget(row)}
                >
                  <Pencil className="size-3" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setResetTarget(row)}
                >
                  <KeyRound className="size-3" />
                  Clave
                </Button>
                {isSelfActive ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          className="inline-flex cursor-not-allowed"
                          tabIndex={0}
                        />
                      }
                    >
                      <Button variant="outline" size="xs" disabled>
                        <Power className="size-3" />
                        Desactivar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      No puedes desactivar tu propia cuenta en sesión activa.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    variant={row.es_activo ? 'outline' : 'secondary'}
                    size="xs"
                    onClick={() => setToggleTarget(row)}
                    className={cn(
                      row.es_activo &&
                        'text-rose-700 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200',
                    )}
                  >
                    {row.es_activo ? (
                      <>
                        <Power className="size-3" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-3" />
                        Activar
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          },
        }),
      ]),
    [normalizedCurrentUser],
  )

  const table = useTable(
    {
      features: usuariosTableFeatures,
      data: filteredData,
      columns,
      state: { sorting },
      onSortingChange: setSorting,
    },
    (state) => ({ sorting: state.sorting }),
  )

  const tableRows = table.getRowModel().rows

  const handleConfirmToggle = (usuario: UsuarioAdmin) => {
    const isSelf =
      normalizedCurrentUser.length > 0 &&
      usuario.nombre_usuario.toLowerCase() === normalizedCurrentUser
    if (isSelf && usuario.es_activo) {
      setToggleTarget(null)
      return
    }
    toggleMutation.mutate(
      { nombreUsuario: usuario.nombre_usuario, activar: !usuario.es_activo },
      {
        onSettled: () => setToggleTarget(null),
      },
    )
  }

  const roleSelectLabel =
    roleFilter === ALL_ROLES ? 'Todos los roles' : getRolMeta(roleFilter).label

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Total usuarios
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                  {formatNumber(kpis.total)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Cuentas en Seguridad.Usuarios
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <Users className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Cuentas activas
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {formatNumber(kpis.activos)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {formatNumber(kpis.inactivos)} inactivas
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-start justify-between gap-3 py-1">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Administradores activos
              </p>
              {query.isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <p className="metric-value font-mono text-2xl font-semibold tracking-tight">
                  {formatNumber(kpis.admins)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Con privilegios de seguridad y gobierno
              </p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Users Card */}
      <Card>
        <CardHeader className="space-y-3 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm font-semibold">
                Usuarios y Roles (Seguridad.Usuarios)
              </CardTitle>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] tabular-nums"
              >
                {formatNumber(filteredData.length)} visibles ·{' '}
                {formatNumber(rows.length)} total
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
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

              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <UserPlus className="size-3.5" />
                Crear usuario
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar usuario, nombre o correo..."
                  aria-label="Buscar usuarios"
                  className="pl-8 text-xs"
                />
              </div>

              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  if (val) setRoleFilter(val)
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-[210px]"
                  aria-label="Filtrar usuarios por rol"
                >
                  <SelectValue>{roleSelectLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ROLES}>Todos los roles</SelectItem>
                  {ROLES_USUARIO_META.map((rolItem) => (
                    <SelectItem key={rolItem.value} value={rolItem.value}>
                      {rolItem.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar usuarios por estado"
            >
              {ESTADO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEstadoFiltro(opt.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    estadoFiltro === opt.value
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {query.isError ? (
            <div className="p-4">
              <ApiErrorBanner
                error={query.error}
                title="Error al cargar la lista de usuarios"
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : query.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="bg-muted/30 hover:bg-muted/30"
                    >
                      {headerGroup.headers.map((header) => {
                        const isRight = header.column.id === 'acciones'
                        const canSort = header.column.getCanSort()
                        const sorted = header.column.getIsSorted()
                        return (
                          <TableHead
                            key={header.id}
                            aria-sort={
                              sorted === 'asc'
                                ? 'ascending'
                                : sorted === 'desc'
                                  ? 'descending'
                                  : undefined
                            }
                            className={cn(
                              'h-9 text-xs font-semibold text-muted-foreground',
                              isRight && 'text-right',
                            )}
                          >
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className={cn(
                                  'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                                  isRight && 'ml-auto flex-row-reverse',
                                )}
                              >
                                <table.FlexRender header={header} />
                                {sorted === 'asc' ? (
                                  <ArrowUp className="size-3" />
                                ) : sorted === 'desc' ? (
                                  <ArrowDown className="size-3" />
                                ) : (
                                  <ArrowUpDown className="size-3 opacity-45" />
                                )}
                              </button>
                            ) : (
                              <table.FlexRender header={header} />
                            )}
                          </TableHead>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        {rows.length === 0
                          ? 'No hay usuarios registrados en Seguridad.Usuarios.'
                          : 'No se encontraron usuarios con los filtros aplicados.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    tableRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(!row.original.es_activo && 'opacity-70')}
                      >
                        {row.getAllCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2.5">
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditUserDialog
        user={editTarget}
        currentUsername={currentUsername}
        onClose={() => setEditTarget(null)}
      />

      <ResetUserPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(null)}
      />

      <ConfirmUserToggleDialog
        target={toggleTarget}
        isPending={toggleMutation.isPending}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
      />
    </div>
  )
}
