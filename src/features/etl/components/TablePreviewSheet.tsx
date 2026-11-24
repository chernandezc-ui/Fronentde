import { Copy, Database, RefreshCw, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import { formatNumber } from '@/shared/lib/format'
import { useTablePreview } from '../useEtlQueries'

interface TablePreviewSheetProps {
  tabla: string | null
  onOpenChange: (open: boolean) => void
}

function renderCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function TablePreviewSheet({ tabla, onOpenChange }: TablePreviewSheetProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useTablePreview(tabla)

  const handleCopyJson = () => {
    if (!data) return
    void navigator.clipboard.writeText(JSON.stringify(data.rows, null, 2))
    toast.success('Muestra JSON copiada al portapapeles')
  }

  return (
    <Sheet open={Boolean(tabla)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-4xl"
      >
        <SheetHeader className="border-b bg-muted/25 px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="size-4 text-primary" />
            <SheetTitle className="font-mono text-sm font-semibold">
              {tabla ?? 'Vista previa de tabla'}
            </SheetTitle>
            {data && (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
                  {formatNumber(data.rows.length)} filas
                </Badge>
                <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                  {formatNumber(data.columns.length)} cols
                </Badge>
              </div>
            )}
          </div>
          <SheetDescription className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <span>Muestra rápida consultada directamente desde el catálogo ETL autorizado (TOP 10).</span>
            <div className="flex items-center gap-1.5">
              {data && data.rows.length > 0 && (
                <Button variant="outline" size="xs" onClick={handleCopyJson}>
                  <Copy className="size-3" />
                  Copiar JSON
                </Button>
              )}
              <Button
                variant="outline"
                size="xs"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`size-3 ${isFetching ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : isError ? (
            <ApiErrorBanner
              error={error}
              title={`No se pudo previsualizar ${tabla ?? 'la tabla'}`}
              onRetry={() => void refetch()}
            />
          ) : !data || data.columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
              <Table2 className="mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">Sin estructura tabular disponible</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                La consulta devolvió un resultado vacío para esta tabla.
              </p>
            </div>
          ) : data.rows.length === 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {data.columns.map((col) => (
                  <Badge key={col} variant="outline" className="font-mono text-[11px]">
                    {col}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                <Table2 className="mb-2 size-7 text-muted-foreground/50" />
                <p className="text-sm font-medium">Tabla sin registros (0 filas)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  La tabla existe y tiene {data.columns.length} columnas definidas, pero aún no contiene filas.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="max-h-[calc(100vh-11rem)] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 border-r text-center font-mono text-[11px] text-muted-foreground">
                        #
                      </TableHead>
                      {data.columns.map((col) => (
                        <TableHead
                          key={col}
                          className="border-r font-mono text-xs font-semibold last:border-r-0"
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="border-r bg-muted/20 text-center font-mono text-[11px] text-muted-foreground tabular-nums">
                          {rowIdx + 1}
                        </TableCell>
                        {data.columns.map((col) => {
                          const rawVal = row[col]
                          const isNull = rawVal === null || rawVal === undefined
                          const text = renderCellValue(rawVal)
                          const isNumeric = typeof rawVal === 'number'
                          return (
                            <TableCell
                              key={col}
                              title={isNull ? 'NULL' : text}
                              className={`max-w-[260px] truncate border-r font-mono text-xs last:border-r-0 ${
                                isNumeric ? 'text-right tabular-nums' : ''
                              }`}
                            >
                              {isNull ? (
                                <span className="text-[11px] text-muted-foreground/60 italic">
                                  NULL
                                </span>
                              ) : (
                                text
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
