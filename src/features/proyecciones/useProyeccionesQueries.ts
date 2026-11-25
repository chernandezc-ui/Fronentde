import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS, notifyStage2MutationError } from '@/shared/api/endpoints'
import { formatNumber, notifyApiError } from '@/shared/lib/format'
import {
  ejecutarProyeccionApi,
  fetchCombinacionesDisponibles,
  fetchFechasDisponibles,
  fetchIntegridadDatos,
} from './proyeccionesApi'
import type { PeticionEjecutarProyeccion } from './types'

export const proyeccionesQueryKeys = {
  all: ['proyecciones'] as const,
  fechas: () => [...proyeccionesQueryKeys.all, 'fechas'] as const,
  combinaciones: (idTiempo: number | null) =>
    [...proyeccionesQueryKeys.all, 'combinaciones', idTiempo] as const,
  integridad: (
    idTiempo: number | null,
    modulo: string,
    variedad: string,
    condicion: string,
  ) =>
    [...proyeccionesQueryKeys.all, 'integridad', idTiempo, modulo, variedad, condicion] as const,
}

export function useFechasProyeccion() {
  return useQuery({
    queryKey: proyeccionesQueryKeys.fechas(),
    queryFn: fetchFechasDisponibles,
    staleTime: 60_000,
  })
}

export function useCombinacionesProyeccion(idTiempo: number | null) {
  return useQuery({
    queryKey: proyeccionesQueryKeys.combinaciones(idTiempo),
    queryFn: () => fetchCombinacionesDisponibles(idTiempo!),
    enabled: idTiempo !== null,
    staleTime: 60_000,
  })
}

export function useIntegridadProyeccion(
  idTiempo: number | null,
  filters: { modulo: string; variedad: string; condicion: string },
) {
  return useQuery({
    queryKey: proyeccionesQueryKeys.integridad(
      idTiempo,
      filters.modulo,
      filters.variedad,
      filters.condicion,
    ),
    queryFn: () => fetchIntegridadDatos(idTiempo!, filters),
    enabled: idTiempo !== null,
    staleTime: 30_000,
  })
}

export function useEjecutarProyeccionMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      mode = 'ejecutar',
    }: {
      payload: PeticionEjecutarProyeccion
      mode?: 'ejecutar' | 'simular'
    }) => ejecutarProyeccionApi(payload, mode),
    onSuccess: (res, variables) => {
      const mode = variables.mode ?? 'ejecutar'
      if (res.df_semanal.length === 0) {
        toast.info('No se encontraron unidades proyectables para el corte y filtros seleccionados.')
        return
      }
      const totalKg = res.kpis.total_base
      const volumenTexto =
        totalKg !== null ? `${formatNumber(Math.round(totalKg))} kg base` : 'Volumen no disponible'
      if (mode === 'simular') {
        toast.success('Vista previa calculada (borrador sin guardar)', {
          description: `${volumenTexto} en 6 semanas · ${formatNumber(res.df_detalle.length)} filas de detalle.`,
        })
      } else {
        toast.success('Proyección publicada como versión oficial', {
          description: `${volumenTexto} · ${formatNumber(res.df_detalle.length)} filas guardadas para reportes.`,
        })
      }
    },
    onError: (err, variables) => {
      if (variables.mode === 'simular') {
        notifyStage2MutationError(
          err,
          'POST',
          API_ENDPOINTS.proyecciones.simular,
          'No se pudo ejecutar la simulación sin guardado',
        )
        return
      }
      notifyApiError(err, 'No se pudo ejecutar la proyección Six-Week')
    },
  })
}
