import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Info,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ApiError } from '@/shared/api/client'
import { rolCumpleNivel, useAuthStore } from '@/shared/auth/authStore'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import {
  BITACORA_MAX_TABLA_LENGTH,
  formatFileSize,
  isValidTableName,
  validateCsvFile,
} from '../auditoriaUtils'
import type {
  CsvDownloadResult,
  RespuestaValidacionCsv,
  TablaCatalogoOption,
} from '../types'
import {
  useExportTableCsvMutation,
  useValidateCsvMutation,
} from '../useAuditoriaQueries'
import { CsvDiagnosticTable, type DiagnosticViewTab } from './CsvDiagnosticTable'

interface IngestaTabProps {
  catalogTables: readonly TablaCatalogoOption[]
  isLoadingCatalog: boolean
}

interface ValidationSnapshot {
  runId: number
  result: RespuestaValidacionCsv
  fileName: string
  tablaDestino: string
  initialView: DiagnosticViewTab
}

interface LastExportInfo extends CsvDownloadResult {
  exportedAtIso: string
}

export function IngestaTab({ catalogTables, isLoadingCatalog }: IngestaTabProps) {
  const usuario = useAuthStore((state) => state.usuario)
  const canIngest = rolCumpleNivel(usuario?.rol, 'analista_mdm')

  // Estado Tarjeta 1: Pre-validador CSV
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validateTabla, setValidateTabla] = useState('')
  const [lastValidation, setLastValidation] = useState<ValidationSnapshot | null>(null)

  // Estado Tarjeta 2: Exportar tabla CSV
  const [exportTabla, setExportTabla] = useState('')
  const [lastExport, setLastExport] = useState<LastExportInfo | null>(null)

  const validateMutation = useValidateCsvMutation()
  const exportMutation = useExportTableCsvMutation()

  const groupedCatalog = useMemo(() => {
    const silver: TablaCatalogoOption[] = []
    const bronce: TablaCatalogoOption[] = []
    const gold: TablaCatalogoOption[] = []
    for (const item of catalogTables) {
      if (item.capa === 'Silver') silver.push(item)
      else if (item.capa === 'Bronce') bronce.push(item)
      else gold.push(item)
    }
    return { silver, bronce, gold }
  }, [catalogTables])

  const catalogTableNamesLower = useMemo(
    () => new Set(catalogTables.map((t) => t.nombre.toLowerCase())),
    [catalogTables],
  )

  // Guard visual estricto para viewer: sin llamadas 403 al backend
  if (!canIngest) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/40">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Acceso restringido a analista_mdm o superior
              </h2>
              <StatusBadge label={`Rol actual: ${usuario?.rol ?? 'viewer'}`} tone="readonly" />
            </div>
            <p className="mx-auto max-w-lg text-xs leading-relaxed text-muted-foreground">
              El <strong>pre-validador CSV en memoria</strong> (
              <span className="font-mono">POST /api/v1/ingesta/validar</span>) y la{' '}
              <strong>exportación CSV de tablas autorizadas</strong> (
              <span className="font-mono">GET /api/v1/ingesta/descargar/&#123;tabla&#125;</span>)
              requieren permisos de <span className="font-mono font-medium">analista_mdm</span>,{' '}
              <span className="font-mono font-medium">operador_etl</span> o{' '}
              <span className="font-mono font-medium">admin</span>.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Puedes consultar libremente la pestaña <strong>Bitácora de cargas</strong> en modo
              solo lectura.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleApplyFile = (file: File | null | undefined) => {
    validateMutation.reset()
    if (!file) {
      setSelectedFile(null)
      setFileError(null)
      return
    }
    const check = validateCsvFile(file)
    if (!check.valid) {
      setSelectedFile(null)
      setFileError(check.error)
      return
    }
    setSelectedFile(file)
    setFileError(null)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    handleApplyFile(file)
    // Permite reseleccionar el mismo archivo si el usuario lo corrige en disco
    event.target.value = ''
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    handleApplyFile(file)
  }

  const trimmedValidateTabla = validateTabla.trim()
  const validateTablaValid = trimmedValidateTabla.length > 0 && isValidTableName(trimmedValidateTabla)
  const canSubmitValidation =
    Boolean(selectedFile) && validateTablaValid && !validateMutation.isPending

  const handleValidateSubmit = () => {
    if (!selectedFile) {
      setFileError('Selecciona un archivo .csv para validar.')
      return
    }
    const fileCheck = validateCsvFile(selectedFile)
    if (!fileCheck.valid) {
      setFileError(fileCheck.error)
      return
    }
    if (!validateTablaValid) return

    const fileName = selectedFile.name
    const tablaDestino = trimmedValidateTabla

    validateMutation.mutate(
      { file: selectedFile, tablaDestino },
      {
        onSuccess: (res) => {
          const errCount = res.filas_con_errores.length
          setLastValidation({
            runId: Date.now(),
            result: res,
            fileName,
            tablaDestino,
            initialView: errCount > 0 ? 'errores' : 'validas',
          })
          if (errCount > 0) {
            toast.warning(`Pre-validación completada con ${errCount} filas observadas`, {
              description: `${res.filas_validas.length} válidas de ${res.total_filas} filas en ${fileName}`,
            })
          } else {
            toast.success(`Pre-validación CSV completada sin errores`, {
              description: `${res.total_filas} filas válidas en ${fileName} (solo en memoria)`,
            })
          }
        },
      },
    )
  }

  const trimmedExportTabla = exportTabla.trim()
  const exportTablaValid = trimmedExportTabla.length > 0 && isValidTableName(trimmedExportTabla)
  const exportTablaInCatalog =
    trimmedExportTabla.length > 0 && catalogTableNamesLower.has(trimmedExportTabla.toLowerCase())
  const isExportForbidden =
    exportMutation.isError &&
    exportMutation.error instanceof ApiError &&
    exportMutation.error.status === 403

  const handleExportSubmit = () => {
    if (!exportTablaValid || exportMutation.isPending) return
    exportMutation.mutate(trimmedExportTabla, {
      onSuccess: (res) => {
        setLastExport({
          ...res,
          exportedAtIso: new Date().toISOString(),
        })
      },
    })
  }

  const matchedCatalogSelectValue =
    catalogTables.find((t) => t.nombre.toLowerCase() === trimmedExportTabla.toLowerCase())
      ?.nombre ?? ''

  return (
    <div className="space-y-5">
      {/* Nota honesta obligatoria (Etapa 1) */}
      <Alert className="border-indigo-500/30 bg-indigo-500/6">
        <Info className="size-4 text-indigo-600 dark:text-indigo-400" />
        <AlertTitle className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
          <span>Pre-validador preliminar CSV en memoria (Etapa 1)</span>
          <StatusBadge label="Sin inserción en BD" tone="readonly" showDot={false} />
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
          El endpoint <span className="font-mono text-foreground">POST /api/v1/ingesta/validar</span>{' '}
          parsea el CSV en memoria con Polars y ejecuta comprobaciones preliminares.{' '}
          <strong className="text-foreground">
            No inserta datos en la base de datos ni sustituye los layouts Excel del cargador Bronce.
          </strong>{' '}
          La ingesta controlada con <em>staging</em> y confirmación transaccional llegará en{' '}
          <strong>Etapa 2</strong>.
        </AlertDescription>
      </Alert>

      {/* Tarjetas principales: Pre-validador CSV + Exportar tabla CSV */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Tarjeta 1: Pre-validador CSV */}
        <Card className="xl:col-span-7">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Pre-validador CSV en memoria</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                POST /api/v1/ingesta/validar
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Sube un archivo <span className="font-mono">.csv</span> (máx. 25 MB) y selecciona la{' '}
              <span className="font-mono">tabla_destino</span> para diagnosticar estructura y filas
              con observaciones antes de una carga real.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Dropzone / Selector CSV */}
            <div className="space-y-1.5">
              <Label htmlFor="ingesta-csv-file" className="text-xs font-medium">
                Archivo CSV fuente
              </Label>

              <input
                ref={fileInputRef}
                id="ingesta-csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInputChange}
                className="sr-only"
              />

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
                        {formatFileSize(selectedFile.size)} · CSV listo para pre-validación
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={validateMutation.isPending}
                    >
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Quitar archivo seleccionado"
                      onClick={() => handleApplyFile(null)}
                      disabled={validateMutation.isPending}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  aria-label="Arrastra un archivo CSV o haz clic para seleccionar"
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    isDragging
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-muted/20 hover:border-primary/45 hover:bg-muted/35',
                    fileError && 'border-rose-500/50 bg-rose-500/5',
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
                    <Upload className="size-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Arrastra tu archivo <span className="font-mono">.csv</span> aquí o haz clic
                      para examinar
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Solo formato CSV separado por comas · Tamaño máximo 25 MB
                    </p>
                  </div>
                </div>
              )}

              {fileError && (
                <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{fileError}</span>
                </p>
              )}
            </div>

            {/* Selector / input de tabla_destino con autocompletado ETL */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="ingesta-tabla-destino" className="text-xs font-medium">
                  Tabla destino de referencia
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {isLoadingCatalog
                    ? 'Cargando catálogo ETL…'
                    : `${catalogTables.length} tablas sugeridas desde /api/v1/etl/facts`}
                </span>
              </div>

              <div className="relative">
                <Database className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ingesta-tabla-destino"
                  value={validateTabla}
                  onChange={(e) => {
                    setValidateTabla(e.target.value)
                    validateMutation.reset()
                  }}
                  list="ingesta-validar-tables"
                  maxLength={BITACORA_MAX_TABLA_LENGTH}
                  placeholder="Ej. Silver.Fact_Proyecciones o Silver.Fact_Ciclo_Poda"
                  className="pr-8 pl-8 font-mono text-xs"
                  aria-invalid={trimmedValidateTabla.length > 0 && !validateTablaValid}
                />
                <datalist id="ingesta-validar-tables">
                  {catalogTables.map((tbl) => (
                    <option key={tbl.nombre} value={tbl.nombre}>
                      {`${tbl.capa} · ${tbl.factRelacionada}`}
                    </option>
                  ))}
                </datalist>
                {validateTabla.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setValidateTabla('')}
                    aria-label="Limpiar tabla destino"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {trimmedValidateTabla.length > 0 && !validateTablaValid && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Nombre de tabla inválido. Usa solo letras, números, punto (.) y guión bajo (_).
                </p>
              )}

              {/* Atajos rápidos desde el catálogo Silver */}
              {groupedCatalog.silver.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground">Sugeridas:</span>
                  {groupedCatalog.silver.slice(0, 4).map((tbl) => (
                    <button
                      key={tbl.nombre}
                      type="button"
                      onClick={() => setValidateTabla(tbl.nombre)}
                      className={cn(
                        'rounded-md border px-2 py-0.5 font-mono text-[10px] transition-colors',
                        trimmedValidateTabla.toLowerCase() === tbl.nombre.toLowerCase()
                          ? 'border-primary/60 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {tbl.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {validateMutation.isError && (
              <ApiErrorBanner
                error={validateMutation.error}
                title="Error al validar el archivo CSV"
                onRetry={canSubmitValidation ? handleValidateSubmit : undefined}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <p className="text-[11px] text-muted-foreground">
                Evaluación 100% en memoria · Sin cambios en SQL Server
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleValidateSubmit}
                disabled={!canSubmitValidation}
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Validando archivo…
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-3.5" />
                    Validar archivo
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta 2: Exportar tabla CSV */}
        <Card className="xl:col-span-5">
          <CardHeader className="border-b pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Download className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Exportar tabla CSV</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                Whitelist ETL
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Descarga los registros actuales de una tabla autorizada del catálogo ETL (Bronce,
              Silver o Gold) en formato <span className="font-mono">.csv</span>.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Selector guiado del catálogo ETL */}
              <div className="space-y-1.5">
                <Label htmlFor="export-catalog-select" className="text-xs font-medium">
                  Elegir desde el catálogo ETL autorizado
                </Label>
                <Select
                  value={matchedCatalogSelectValue}
                  onValueChange={(val) => {
                    if (val) {
                      setExportTabla(val)
                      exportMutation.reset()
                    }
                  }}
                >
                  <SelectTrigger
                    id="export-catalog-select"
                    size="sm"
                    className="w-full font-mono text-xs"
                    disabled={isLoadingCatalog || catalogTables.length === 0}
                  >
                    <SelectValue
                      placeholder={
                        isLoadingCatalog
                          ? 'Cargando catálogo ETL…'
                          : catalogTables.length === 0
                            ? 'Sin catálogo disponible — ingresa manualmente'
                            : 'Seleccionar tabla Bronce / Silver / Gold…'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedCatalog.silver.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Silver — Tablas destino</SelectLabel>
                        {groupedCatalog.silver.map((tbl) => (
                          <SelectItem key={tbl.nombre} value={tbl.nombre}>
                            <span className="font-mono text-xs">{tbl.nombre}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {groupedCatalog.bronce.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Bronce — Fuentes</SelectLabel>
                        {groupedCatalog.bronce.map((tbl) => (
                          <SelectItem key={tbl.nombre} value={tbl.nombre}>
                            <span className="font-mono text-xs">{tbl.nombre}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {groupedCatalog.gold.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Gold — Marts</SelectLabel>
                        {groupedCatalog.gold.map((tbl) => (
                          <SelectItem key={tbl.nombre} value={tbl.nombre}>
                            <span className="font-mono text-xs">{tbl.nombre}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Input directo validado contra ^[a-zA-Z0-9_.]+$ */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="export-tabla-input" className="text-xs font-medium">
                    Nombre exacto de tabla
                  </Label>
                  {trimmedExportTabla.length > 0 && exportTablaValid && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 font-mono text-[10px]',
                        exportTablaInCatalog
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-amber-700 dark:text-amber-300',
                      )}
                    >
                      {exportTablaInCatalog ? (
                        <>
                          <ShieldCheck className="size-3" />
                          En catálogo ETL
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="size-3" />
                          Sujeta a whitelist backend
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    id="export-tabla-input"
                    value={exportTabla}
                    onChange={(e) => {
                      setExportTabla(e.target.value)
                      exportMutation.reset()
                    }}
                    maxLength={BITACORA_MAX_TABLA_LENGTH}
                    placeholder="Schema.Nombre_Tabla"
                    className="pr-8 font-mono text-xs"
                    aria-invalid={trimmedExportTabla.length > 0 && !exportTablaValid}
                  />
                  {exportTabla.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportTabla('')
                        exportMutation.reset()
                      }}
                      aria-label="Limpiar nombre de tabla a exportar"
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {trimmedExportTabla.length > 0 && !exportTablaValid ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    Formato inválido. Solo se permiten caracteres{' '}
                    <span className="font-mono">[a-zA-Z0-9_.]</span> sin espacios ni símbolos.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Esquemas sensibles (<span className="font-mono">Seguridad</span>,{' '}
                    <span className="font-mono">Auditoria</span>,{' '}
                    <span className="font-mono">Control</span>,{' '}
                    <span className="font-mono">MDM</span>) son rechazados por seguridad (HTTP 403).
                  </p>
                )}
              </div>

              {/* Manejo dedicado de HTTP 403 (tabla fuera de whitelist) */}
              {isExportForbidden ? (
                <Alert
                  variant="destructive"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                >
                  <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span>Tabla fuera de la whitelist autorizada</span>
                    <span className="font-mono text-[11px]">HTTP 403</span>
                  </AlertTitle>
                  <AlertDescription className="space-y-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                    <p>
                      <span className="font-mono font-medium">{trimmedExportTabla}</span> no está
                      habilitada para exportación en el manifiesto ETL. Selecciona una tabla Bronce,
                      Silver o Gold del desplegable superior.
                    </p>
                    {exportMutation.error instanceof ApiError && exportMutation.error.requestId && (
                      <p className="font-mono text-[10px] opacity-80">
                        Request ID: {exportMutation.error.requestId}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ) : exportMutation.isError ? (
                <ApiErrorBanner
                  error={exportMutation.error}
                  title="No se pudo exportar la tabla en CSV"
                  onRetry={exportTablaValid ? handleExportSubmit : undefined}
                />
              ) : null}

              {/* Confirmación de última descarga */}
              {lastExport && !exportMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-xs">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-mono text-[11px] font-medium text-foreground">
                      {lastExport.filename}
                    </p>
                    <p className="metric-value font-mono text-[10px] text-muted-foreground tabular-nums">
                      {formatFileSize(lastExport.sizeBytes)} ·{' '}
                      {formatDateTime(lastExport.exportedAtIso)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t pt-3">
              <Button
                type="button"
                size="sm"
                onClick={handleExportSubmit}
                disabled={!exportTablaValid || exportMutation.isPending}
                className="w-full sm:w-auto"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Descargando CSV…
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    Descargar CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de diagnóstico paginada en cliente tras validar */}
      {lastValidation && (
        <CsvDiagnosticTable
          key={lastValidation.runId}
          result={lastValidation.result}
          fileName={lastValidation.fileName}
          tablaDestino={lastValidation.tablaDestino}
          initialView={lastValidation.initialView}
        />
      )}
    </div>
  )
}
