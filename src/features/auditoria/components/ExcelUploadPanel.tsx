import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { API_ENDPOINTS, isEndpointNotImplementedError } from '@/shared/api/endpoints'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { EndpointPendingBanner } from '@/shared/components/EndpointPendingBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import {
  EXCEL_UPLOAD_FOLDERS,
  formatFileSize,
  validateExcelFile,
} from '../auditoriaUtils'
import type { EstadoCarpetaExcel } from '../types'
import {
  useDeleteExcelMutation,
  useExcelIngestaArchivosQuery,
  useUploadExcelMutation,
} from '../useAuditoriaQueries'

const ESTADO_TABS: readonly { value: EstadoCarpetaExcel; label: string }[] = [
  { value: 'entrada', label: 'Entrada (pendientes)' },
  { value: 'procesados', label: 'Procesados' },
  { value: 'rechazados', label: 'Rechazados' },
] as const

export function ExcelUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [carpetaDestino, setCarpetaDestino] = useState<string>('AUTO')
  const [sobreescribir, setSobreescribir] = useState(true)
  const [estadoCarpeta, setEstadoCarpeta] = useState<EstadoCarpetaExcel>('entrada')

  const filesQuery = useExcelIngestaArchivosQuery(estadoCarpeta, true)
  const uploadMutation = useUploadExcelMutation()
  const deleteMutation = useDeleteExcelMutation()

  const handleApplyExcel = (file: File | null | undefined) => {
    uploadMutation.reset()
    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }
    const check = validateExcelFile(file)
    if (!check.valid) {
      setSelectedFile(null)
      setFileError(check.error)
      return
    }
    setSelectedFile(file)
    setFileError(null)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleApplyExcel(e.target.files?.[0])
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleApplyExcel(e.dataTransfer.files?.[0])
  }

  const handleUpload = () => {
    if (!selectedFile || uploadMutation.isPending) return
    const check = validateExcelFile(selectedFile)
    if (!check.valid) {
      setFileError(check.error)
      return
    }
    uploadMutation.mutate(
      { file: selectedFile, carpetaDestino, sobreescribir },
      {
        onSuccess: () => {
          setSelectedFile(null)
          setFileError(null)
        },
      },
    )
  }

  const archivos = filesQuery.data?.archivos ?? []
  const isBackendPending = filesQuery.isError && isEndpointNotImplementedError(filesQuery.error)
  const selectedFolderMeta = EXCEL_UPLOAD_FOLDERS.find((f) => f.carpeta === carpetaDestino)

  return (
    <Card>
      <CardHeader className="border-b pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Carga de Libros Excel (.xlsx) para ETL Bronce
            </CardTitle>
            <StatusBadge label="Operativo · AWS Ready" tone="ok" showDot={false} />
          </div>

          <Button variant="outline" size="xs" nativeButton={false} render={<Link to="/etl" />}>
            Ir al Monitor ETL
            <ArrowUpRight className="size-3" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Sube libros <span className="font-mono">.xlsx</span> (máx. 50 MB) directamente a{' '}
          <span className="font-mono">ETL/data/entrada</span> por subcarpeta canónica o autodetección, sin necesidad de SSH.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-5 pt-4 xl:grid-cols-12">
        {/* Columna izquierda: Upload .xlsx */}
        <div className="space-y-4 xl:col-span-5">
          <input
            ref={inputRef}
            id="ingesta-excel-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleInputChange}
            className="sr-only"
          />

          <div className="space-y-1.5">
            <Label htmlFor="ingesta-excel-file" className="text-xs font-medium">
              Libro Excel (.xlsx)
            </Label>

            {selectedFile ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/6 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-background">
                    <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="metric-value font-mono text-[11px] text-muted-foreground tabular-nums">
                      {formatFileSize(selectedFile.size)} · listo para subir
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Quitar archivo Excel"
                    onClick={() => handleApplyExcel(null)}
                    disabled={uploadMutation.isPending}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!isDragging) setIsDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20 hover:bg-muted/35',
                )}
              >
                <div className="flex size-9 items-center justify-center rounded-full border bg-background">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Arrastra un archivo <span className="font-mono">.xlsx</span> aquí
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => inputRef.current?.click()}
                >
                  Seleccionar .xlsx
                </Button>
              </div>
            )}

            {fileError && (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {fileError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="excel-folder-select" className="text-xs font-medium">
              Carpeta destino Bronce
            </Label>
            <Select
              value={carpetaDestino}
              onValueChange={(val) => setCarpetaDestino(val || 'AUTO')}
            >
              <SelectTrigger id="excel-folder-select" size="sm" className="w-full">
                <SelectValue>
                  {carpetaDestino === 'AUTO'
                    ? 'Autodetectar por nombre de archivo'
                    : `${carpetaDestino} (${selectedFolderMeta?.tabla ?? 'Bronce'})`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Autodetectar por nombre de archivo</SelectItem>
                {EXCEL_UPLOAD_FOLDERS.map((item) => (
                  <SelectItem key={item.carpeta} value={item.carpeta}>
                    {item.carpeta} — {item.tabla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="excel-overwrite" className="cursor-pointer text-xs font-medium">
                Sobreescribir si existe
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Reemplaza archivos con el mismo nombre y limpia su marca previa.
              </p>
            </div>
            <Switch
              id="excel-overwrite"
              checked={sobreescribir}
              onCheckedChange={(checked) => setSobreescribir(Boolean(checked))}
            />
          </div>

          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Subiendo libro Excel...
              </>
            ) : (
              <>
                <Upload className="size-3.5" />
                Subir Excel a entrada ETL
              </>
            )}
          </Button>
        </div>

        {/* Columna derecha: Explorador entrada / procesados / rechazados */}
        <div className="space-y-3 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-0.5"
              role="group"
              aria-label="Filtrar estado de carpeta Excel"
            >
              {ESTADO_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setEstadoCarpeta(tab.value)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    estadoCarpeta === tab.value
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void filesQuery.refetch()}
              disabled={filesQuery.isFetching}
            >
              <RefreshCw className={cn('size-3', filesQuery.isFetching && 'animate-spin')} />
              Actualizar lista
            </Button>
          </div>

          {isBackendPending ? (
            <EndpointPendingBanner
              title="Explorador de Excels listo para conectar"
              method="GET"
              endpoint={API_ENDPOINTS.ingesta.excelArchivos}
              description="Cuando agregues los endpoints de Excel en FastAPI, aquí verás los archivos en data/entrada, procesados y rechazados y podrás subir/eliminar libros desde la web."
              onRetry={() => void filesQuery.refetch()}
              isRetrying={filesQuery.isFetching}
            />
          ) : filesQuery.isError ? (
            <ApiErrorBanner
              error={filesQuery.error}
              title="No se pudo listar la bandeja de Excels"
              onRetry={() => void filesQuery.refetch()}
            />
          ) : archivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center text-xs text-muted-foreground">
              <FolderOpen className="mb-2 size-6 opacity-60" />
              <p className="font-medium text-foreground">
                Sin archivos en {estadoCarpeta}
              </p>
              <p className="mt-1">
                {formatNumber(filesQuery.data?.carpetas.length ?? EXCEL_UPLOAD_FOLDERS.length)}{' '}
                carpetas configuradas en el cargador Bronce.
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
              {archivos.map((arch) => (
                <div
                  key={`${arch.carpeta}/${arch.nombre}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {arch.carpeta}
                      </Badge>
                      <span className="truncate font-mono font-medium text-foreground">
                        {arch.nombre}
                      </span>
                    </div>
                    <p className="metric-value font-mono text-[11px] text-muted-foreground tabular-nums">
                      {formatFileSize(arch.tamano_bytes)}
                      {arch.fecha_modificacion
                        ? ` · ${formatDateTime(arch.fecha_modificacion)}`
                        : ''}
                    </p>
                  </div>

                  {estadoCarpeta === 'entrada' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Eliminar ${arch.nombre}`}
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        deleteMutation.mutate({
                          carpeta: arch.carpeta,
                          nombre: arch.nombre,
                        })
                      }
                    >
                      <Trash2 className="size-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
