import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatIdTiempo } from '../proyeccionesUtils'
import type { FiltrosProyeccionUrl, IntegridadProyeccion } from '../types'

interface StepCorteCoberturaProps {
  fechas: number[]
  isLoadingFechas: boolean
  effectiveFecha: number | null
  filters: FiltrosProyeccionUrl
  opciones: {
    fundos: string[]
    modulos: string[]
    variedades: string[]
    condiciones: string[]
  }
  isLoadingCombinaciones: boolean
  combinacionesCount: number
  integridad: IntegridadProyeccion | undefined
  isLoadingIntegridad: boolean
  isErrorIntegridad: boolean
  onFechaChange: (fecha: number) => void
  onFundoChange: (fundo: string) => void
  onModuloChange: (modulo: string) => void
  onVariedadChange: (variedad: string) => void
  onCondicionChange: (condicion: string) => void
  onResetFilters: () => void
  onContinue: () => void
}

const ALL_VALUE = '__all__'

function SourceIndicator({
  label,
  detail,
  tableRef,
  ok,
  blocking,
  loading,
  missingMessage,
}: {
  label: string
  detail: string
  tableRef: string
  ok: boolean | undefined
  blocking?: boolean
  loading: boolean
  missingMessage: string
}) {
  if (loading) {
    return <Skeleton className="h-12 w-full rounded-lg" />
  }

  return (
    <div className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:py-0">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : blocking ? (
        <AlertOctagon className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-help text-xs font-semibold text-foreground underline decoration-border decoration-dotted underline-offset-4" />
              }
            >
              {label}
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Origen de datos: <span className="font-mono">{tableRef}</span>
            </TooltipContent>
          </Tooltip>
          <span
            className={cn(
              'font-mono text-[11px] font-medium',
              ok
                ? 'text-emerald-700 dark:text-emerald-300'
                : blocking
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-amber-700 dark:text-amber-300',
            )}
          >
            {ok ? 'Disponible' : blocking ? 'Faltante' : 'Usará respaldo'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {ok ? detail : missingMessage}
        </p>
      </div>
    </div>
  )
}

export function StepCorteCobertura({
  fechas,
  isLoadingFechas,
  effectiveFecha,
  filters,
  opciones,
  isLoadingCombinaciones,
  combinacionesCount,
  integridad,
  isLoadingIntegridad,
  isErrorIntegridad,
  onFechaChange,
  onFundoChange,
  onModuloChange,
  onVariedadChange,
  onCondicionChange,
  onResetFilters,
  onContinue,
}: StepCorteCoberturaProps) {
  const hasScopeFilters = Boolean(
    filters.fundo || filters.modulo || filters.variedad || filters.condicion,
  )
  const missingConteo = !isLoadingIntegridad && integridad?.conteo === false

  return (
    <section
      aria-label="Paso 1: Seleccionar corte y revisar cobertura"
      className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border"
    >
      {/* Cabecera limpia de paso */}
      <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">
            Selecciona la fecha de evaluación y el alcance agrícola
          </h2>
          <p className="text-xs text-muted-foreground">
            Elige el corte semanal y acota opcionalmente por fundo, módulo, variedad o condición antes de revisar los supuestos.
          </p>
        </div>
        {hasScopeFilters && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onResetFilters}
            className="self-start sm:self-auto"
          >
            <RotateCcw className="size-3" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Filtros en cascada — grid optimizado para 1440 / 1024 / 390 */}
      <div className="grid grid-cols-1 gap-3.5 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="proy-fecha" className="flex items-center gap-1.5 text-xs">
            <Calendar className="size-3 text-muted-foreground" />
            Fecha de evaluación
          </Label>
          {isLoadingFechas ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <Select
              value={effectiveFecha ? String(effectiveFecha) : ''}
              onValueChange={(val) => {
                if (val) onFechaChange(Number(val))
              }}
              disabled={fechas.length === 0}
            >
              <SelectTrigger id="proy-fecha" size="sm" className="w-full font-mono text-xs">
                <SelectValue placeholder="Sin cortes disponibles" />
              </SelectTrigger>
              <SelectContent>
                {fechas.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    <span className="font-mono text-xs">{formatIdTiempo(f, true)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proy-fundo" className="text-xs">
            Fundo
          </Label>
          <Select
            value={filters.fundo || ALL_VALUE}
            onValueChange={(val) => onFundoChange(val === ALL_VALUE || !val ? '' : val)}
            disabled={isLoadingCombinaciones || opciones.fundos.length === 0}
          >
            <SelectTrigger id="proy-fundo" size="sm" className="w-full text-xs">
              <SelectValue placeholder="Todos los fundos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los fundos</SelectItem>
              {opciones.fundos.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proy-modulo" className="text-xs">
            Módulo
          </Label>
          <Select
            value={filters.modulo || ALL_VALUE}
            onValueChange={(val) => onModuloChange(val === ALL_VALUE || !val ? '' : val)}
            disabled={isLoadingCombinaciones || opciones.modulos.length === 0}
          >
            <SelectTrigger id="proy-modulo" size="sm" className="w-full font-mono text-xs">
              <SelectValue placeholder="Todos los módulos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los módulos</SelectItem>
              {opciones.modulos.map((m) => (
                <SelectItem key={m} value={m}>
                  Módulo {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proy-variedad" className="text-xs">
            Variedad
          </Label>
          <Select
            value={filters.variedad || ALL_VALUE}
            onValueChange={(val) => onVariedadChange(val === ALL_VALUE || !val ? '' : val)}
            disabled={isLoadingCombinaciones || opciones.variedades.length === 0}
          >
            <SelectTrigger id="proy-variedad" size="sm" className="w-full text-xs">
              <SelectValue placeholder="Todas las variedades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las variedades</SelectItem>
              {opciones.variedades.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proy-condicion" className="text-xs">
            Condición de cultivo
          </Label>
          <Select
            value={filters.condicion || ALL_VALUE}
            onValueChange={(val) => onCondicionChange(val === ALL_VALUE || !val ? '' : val)}
            disabled={isLoadingCombinaciones || opciones.condiciones.length === 0}
          >
            <SelectTrigger id="proy-condicion" size="sm" className="w-full text-xs">
              <SelectValue placeholder="Todas las condiciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las condiciones</SelectItem>
              {opciones.condiciones.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cobertura de datos de campo (inline, sin tarjetas anidadas) */}
      <div className="space-y-3 bg-muted/15 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Disponibilidad de datos de campo ({formatIdTiempo(effectiveFecha)})
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {isLoadingCombinaciones
              ? 'Verificando combinaciones…'
              : `${combinacionesCount} combinaciones fundo–módulo–variedad`}
          </span>
        </div>

        {isErrorIntegridad ? (
          <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-4 shrink-0" />
            No se pudo verificar la disponibilidad de datos de campo. Puedes reintentar o continuar bajo tu criterio.
          </p>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:gap-5 sm:divide-y-0">
            <SourceIndicator
              label="Conteo fenológico"
              detail="Frutos evaluados por estado para esta semana."
              tableRef="Silver.Fact_Conteo_Fenologico"
              ok={integridad?.conteo}
              blocking
              loading={isLoadingIntegridad || effectiveFecha === null}
              missingMessage="Sin conteo en esta semana — no habrá unidades proyectables."
            />
            <SourceIndicator
              label="Censo de plantas"
              detail="Población de plantas disponible por unidad."
              tableRef="Silver.Fact_Censo_Plantas"
              ok={integridad?.peladas}
              loading={isLoadingIntegridad || effectiveFecha === null}
              missingMessage="Se estimará con respaldo de 1,500 plantas (80% productivas)."
            />
            <SourceIndicator
              label="Evaluación de pesos"
              detail="Peso promedio de baya disponible para la semana."
              tableRef="Silver.Fact_Evaluacion_Pesos"
              ok={integridad?.pesos}
              loading={isLoadingIntegridad || effectiveFecha === null}
              missingMessage="Se aplicará histórico más reciente o 2.89 g/baya por defecto."
            />
          </div>
        )}

        {filters.fundo && !isErrorIntegridad && (
          <p className="text-[11px] text-muted-foreground">
            Nota: el semáforo de disponibilidad verifica el corte completo y los filtros de módulo, variedad y condición; el filtro de fundo se aplica al calcular la simulación.
          </p>
        )}

        {missingConteo && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/8 px-3 py-2 text-xs text-rose-800 dark:text-rose-200"
          >
            <AlertOctagon className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>
              No existe conteo fenológico registrado para este corte y filtros. Selecciona otra fecha de evaluación o amplía los filtros para poder proyectar.
            </span>
          </div>
        )}
      </div>

      {/* Pie de paso: única acción primaria */}
      <div className="flex flex-col-reverse gap-2 bg-muted/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Siguiente: revisar bandas pesimista/optimista y calcular vista previa sin guardar.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onContinue}
          disabled={effectiveFecha === null}
        >
          Continuar a supuestos
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </section>
  )
}
