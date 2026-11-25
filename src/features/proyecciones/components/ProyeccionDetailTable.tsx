import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber } from '@/shared/lib/format'
import {
  aggregateDetalleBy,
  buildDetalleProyeccionCsv,
  formatKg,
} from '../proyeccionesUtils'
import type { DetalleUnidadProyeccion } from '../types'

interface ProyeccionDetailTableProps {
  detalle: DetalleUnidadProyeccion[]
  idTiempo: number | null
}

type DetailViewMode = 'granular' | 'variedad' | 'fundo' | 'certificacion'

const PAGE_SIZE = 20

const VIEW_MODES: readonly { id: DetailViewMode; label: string }[] = [
  { id: 'granular', label: 'Por válvula' },
  { id: 'variedad', label: 'Por variedad' },
  { id: 'fundo', label: 'Por fundo' },
  { id: 'certificacion', label: 'Por certificación' },
] as const

export function ProyeccionDetailTable({ detalle, idTiempo }: ProyeccionDetailTableProps) {
  const [viewMode, setViewMode] = useState<DetailViewMode>('granular')
  const [searchText, setSearchText] = useState('')
  const [weekFilter, setWeekFilter] = useState<string>('all')
  const [pageIndex, setPageIndex] = useState(0)

  const filteredDetalle = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return detalle.filter((row) => {
      if (weekFilter !== 'all' && String(row.semana) !== weekFilter) return false
      if (!q) return true
      const haystack = `${row.fundo} ${row.modulo} ${row.turno} ${row.valvula} ${row.variedad} ${row.condicion} ${row.certificacion}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [detalle, searchText, weekFilter])

  const aggregated = useMemo(() => {
    if (viewMode === 'granular') return []
    return aggregateDetalleBy(filteredDetalle, viewMode)
  }, [filteredDetalle, viewMode])

  const totalPages = Math.max(1, Math.ceil(filteredDetalle.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const pageRows = useMemo(() => {
    const start = safePageIndex * PAGE_SIZE
    return filteredDetalle.slice(start, start + PAGE_SIZE)
  }, [filteredDetalle, safePageIndex])

  function handleExportCsv() {
    if (filteredDetalle.length === 0) return
    const csv = buildDetalleProyeccionCsv(filteredDetalle)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `proyeccion_sixweek_${idTiempo ?? 'corte'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`CSV exportado (${formatNumber(filteredDetalle.length)} filas)`)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
      {/* Cabecera y modos de agrupación */}
      <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Desglose por válvula y resúmenes comerciales
          </h3>
          <p className="text-xs text-muted-foreground">
            Cada fila mantiene la identidad exacta de su fundo, módulo, turno, válvula y variedad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Nivel de agrupación del detalle"
            className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5 text-xs"
          >
            {VIEW_MODES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={viewMode === opt.id}
                onClick={() => setViewMode(opt.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === opt.id
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredDetalle.length === 0}
          >
            <Download className="size-3.5" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda y filtro de semana */}
      <div className="flex flex-col gap-2 bg-muted/15 px-5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar por fundo, módulo, variedad o certificación"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setPageIndex(0)
            }}
            placeholder="Buscar fundo, módulo, variedad, orgánico…"
            className="h-8 bg-background pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Select
            value={weekFilter}
            onValueChange={(v) => {
              setWeekFilter(v || 'all')
              setPageIndex(0)
            }}
          >
            <SelectTrigger
              aria-label="Filtrar por semana proyectada"
              size="sm"
              className="w-36 bg-background font-mono text-xs"
            >
              <SelectValue placeholder="Todas las semanas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas (W1–W6)</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Solo W{w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatNumber(filteredDetalle.length)} filas
          </span>
        </div>
      </div>

      {/* Tabla a sangre completa (cero borde duplicado) */}
      {viewMode !== 'granular' ? (
        <div className="min-w-0 overflow-x-auto" tabIndex={0} aria-label="Tabla agregada de proyección">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="px-4">
                  {viewMode === 'variedad'
                    ? 'Variedad'
                    : viewMode === 'fundo'
                      ? 'Fundo'
                      : 'Certificación'}
                </TableHead>
                <TableHead className="px-4 text-right font-mono">Unidades</TableHead>
                <TableHead className="px-4 text-right font-mono">Pesimista (kg)</TableHead>
                <TableHead className="px-4 text-right font-mono">Base (kg)</TableHead>
                <TableHead className="px-4 text-right font-mono">Optimista (kg)</TableHead>
                <TableHead className="px-4">Participación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Sin datos agregados para el filtro actual.
                  </TableCell>
                </TableRow>
              ) : (
                aggregated.map((item) => (
                  <TableRow key={item.clave}>
                    <TableCell className="px-4 font-medium text-foreground">{item.clave}</TableCell>
                    <TableCell className="metric-value px-4 text-right font-mono text-muted-foreground">
                      {formatNumber(item.unidades)}
                    </TableCell>
                    <TableCell className="metric-value px-4 text-right font-mono text-muted-foreground">
                      {formatKg(item.kg_pesimista, 2)}
                    </TableCell>
                    <TableCell className="metric-value px-4 text-right font-mono font-semibold text-foreground">
                      {formatKg(item.kg_base, 2)}
                    </TableCell>
                    <TableCell className="metric-value px-4 text-right font-mono text-muted-foreground">
                      {formatKg(item.kg_optimista, 2)}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, item.participacion_pct))}%`,
                              backgroundColor: 'var(--chart-1)',
                            }}
                          />
                        </div>
                        <span className="metric-value w-11 text-right font-mono text-foreground">
                          {item.participacion_pct.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <>
          <div className="min-w-0 overflow-x-auto" tabIndex={0} aria-label="Tabla detallada por válvula y semana">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-4">Fundo</TableHead>
                  <TableHead className="px-4">Mód / Tur / Válv</TableHead>
                  <TableHead className="px-4">Variedad</TableHead>
                  <TableHead className="px-4">Certificación</TableHead>
                  <TableHead className="px-4">Semana</TableHead>
                  <TableHead className="px-4 text-right font-mono">Pes. (kg)</TableHead>
                  <TableHead className="px-4 text-right font-mono">Base (kg)</TableHead>
                  <TableHead className="px-4 text-right font-mono">Opt. (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Sin filas coincidentes con el filtro actual.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => (
                    <TableRow
                      key={`${row.id_geografia}-${row.id_variedad}-${row.semana}-${row.id_tiempo_proy}`}
                    >
                      <TableCell className="px-4 font-medium text-foreground">{row.fundo}</TableCell>
                      <TableCell className="px-4 font-mono text-muted-foreground">
                        M{row.modulo} · T{row.turno} · V{row.valvula}
                      </TableCell>
                      <TableCell className="px-4 text-foreground">{row.variedad}</TableCell>
                      <TableCell className="px-4 text-muted-foreground">{row.certificacion}</TableCell>
                      <TableCell className="px-4 font-mono text-foreground">
                        {row.semana_label || `W${row.semana}`}
                      </TableCell>
                      <TableCell className="metric-value px-4 text-right font-mono text-muted-foreground">
                        {formatKg(row.kg_pesimista, 2)}
                      </TableCell>
                      <TableCell className="metric-value px-4 text-right font-mono font-semibold text-foreground">
                        {formatKg(row.kg_base, 2)}
                      </TableCell>
                      <TableCell className="metric-value px-4 text-right font-mono text-muted-foreground">
                        {formatKg(row.kg_optimista, 2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-muted/10 px-5 py-2.5 text-xs text-muted-foreground">
              <span className="font-mono">
                Página {safePageIndex + 1} de {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  disabled={safePageIndex === 0}
                >
                  <ChevronLeft className="size-3.5" />
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePageIndex >= totalPages - 1}
                >
                  Siguiente
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
