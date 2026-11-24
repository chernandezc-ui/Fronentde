import { useMemo, useState } from 'react'
import {
  Database,
  Eye,
  GitBranch,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ApiErrorBanner } from '@/shared/components/ApiErrorBanner'
import type { FactDisponible } from '../types'

interface FactsCatalogGridProps {
  facts: FactDisponible[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  canOperate: boolean
  onRefresh: () => void
  onReprocessFacts: (factNames: string[]) => void
  onPreviewTable: (tabla: string) => void
}

export function FactsCatalogGrid({
  facts,
  isLoading,
  isFetching,
  isError,
  error,
  canOperate,
  onRefresh,
  onReprocessFacts,
  onPreviewTable,
}: FactsCatalogGridProps) {
  const [search, setSearch] = useState('')
  const [selectedFacts, setSelectedFacts] = useState<string[]>([])

  const sortedFacts = useMemo(
    () => [...facts].sort((a, b) => a.orden - b.orden),
    [facts],
  )

  const filteredFacts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedFacts
    return sortedFacts.filter((fact) => {
      return (
        fact.nombre_fact.toLowerCase().includes(q) ||
        fact.tabla_destino.toLowerCase().includes(q) ||
        fact.estrategia_rerun.toLowerCase().includes(q) ||
        fact.fuentes_bronce.some((s) => s.toLowerCase().includes(q)) ||
        fact.dependencias.some((d) => d.toLowerCase().includes(q)) ||
        fact.marts.some((m) => m.toLowerCase().includes(q))
      )
    })
  }, [sortedFacts, search])

  const toggleSelect = (factName: string, checked: boolean) => {
    setSelectedFacts((prev) => {
      if (checked) {
        return prev.includes(factName) ? prev : [...prev, factName]
      }
      return prev.filter((item) => item !== factName)
    })
  }

  return (
    <div className="space-y-4">
      {/* Search & batch actions bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fact, tabla destino, Bronce, dependencias o mart Gold..."
            aria-label="Buscar en catálogo de facts"
            className="pl-8 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[11px] tabular-nums">
            {filteredFacts.length} / {sortedFacts.length} facts
          </Badge>

          {canOperate && selectedFacts.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  onReprocessFacts(selectedFacts)
                  setSelectedFacts([])
                }}
              >
                <Play className="size-3.5" />
                Reprocesar seleccionados ({selectedFacts.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFacts([])}
              >
                Limpiar
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {isError && (
        <ApiErrorBanner
          error={error}
          title="No se pudo cargar el catálogo de facts"
          onRetry={onRefresh}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredFacts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="mb-2 size-7 text-muted-foreground/50" />
            <p className="text-sm font-medium">Sin coincidencias en el catálogo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajusta el término de búsqueda para ver los facts disponibles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filteredFacts.map((fact) => {
            const isSelected = selectedFacts.includes(fact.nombre_fact)
            return (
              <Card
                key={fact.nombre_fact}
                size="sm"
                className={cn(
                  'flex flex-col justify-between transition-colors',
                  isSelected && 'ring-2 ring-primary/50',
                )}
              >
                <CardHeader className="border-b pb-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      {canOperate && (
                        <Checkbox
                          aria-label={`Seleccionar ${fact.nombre_fact}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleSelect(fact.nombre_fact, Boolean(checked))
                          }
                          className="mt-0.5"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="h-5 px-1.5 font-mono text-[10px] tabular-nums"
                          >
                            #{String(fact.orden).padStart(2, '0')}
                          </Badge>
                          <CardTitle className="truncate font-mono text-sm font-semibold">
                            {fact.nombre_fact}
                          </CardTitle>
                        </div>
                        <p
                          title={fact.tabla_destino}
                          className="mt-1 truncate font-mono text-xs text-muted-foreground"
                        >
                          {fact.tabla_destino}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className="shrink-0 font-mono text-[10px]"
                      title="Estrategia de rerun"
                    >
                      {fact.estrategia_rerun}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-2.5 py-3 text-xs">
                  <ChipGroup
                    icon={<Database className="size-3 text-amber-600 dark:text-amber-400" />}
                    label="Fuentes Bronce"
                    items={fact.fuentes_bronce}
                    emptyLabel="Sin fuentes directas"
                    chipClass="border-amber-500/25 bg-amber-500/8 text-amber-800 dark:text-amber-300"
                  />

                  <ChipGroup
                    icon={<GitBranch className="size-3 text-sky-600 dark:text-sky-400" />}
                    label="Dependencias"
                    items={fact.dependencias}
                    emptyLabel="Ninguna"
                    chipClass="border-sky-500/25 bg-sky-500/8 text-sky-800 dark:text-sky-300"
                  />

                  <ChipGroup
                    icon={<Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />}
                    label="Marts Gold"
                    items={fact.marts}
                    emptyLabel="Sin marts asociados"
                    chipClass="border-emerald-500/25 bg-emerald-500/8 text-emerald-800 dark:text-emerald-300"
                  />

                  <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                    <RotateCcw className="size-3" />
                    <span>
                      Relectura Bronce por estado:{' '}
                      <strong className="font-mono text-foreground">
                        {fact.releer_bronce_por_estado ? 'Sí' : 'No'}
                      </strong>
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="justify-between gap-2 py-2.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onPreviewTable(fact.tabla_destino)}
                  >
                    <Eye className="size-3" />
                    Vista previa
                  </Button>

                  {canOperate && (
                    <Button
                      size="xs"
                      onClick={() => onReprocessFacts([fact.nombre_fact])}
                    >
                      <Play className="size-3" />
                      Reprocesar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChipGroup({
  icon,
  label,
  items,
  emptyLabel,
  chipClass,
}: {
  icon: React.ReactNode
  label: string
  items: string[]
  emptyLabel: string
  chipClass: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {items.length === 0 ? (
        <span className="text-[11px] text-muted-foreground/70">{emptyLabel}</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <span
              key={item}
              className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] leading-tight',
                chipClass,
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
