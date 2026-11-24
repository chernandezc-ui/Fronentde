import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { notifyApiError } from '@/shared/lib/format'
import {
  activarUsuario,
  createUsuario,
  desactivarUsuario,
  fetchMatrizBiologica,
  fetchParametros,
  fetchReglas,
  fetchUsuarios,
  saveMatrizBiologica,
  updateParametro,
  updateParametrosBatch,
} from './configuracionApi'
import type { BatchParametroItem, CreateUsuarioPayload } from './types'

export const configuracionQueryKeys = {
  all: ['configuracion'] as const,
  parametros: () => [...configuracionQueryKeys.all, 'parametros'] as const,
  reglasAll: () => [...configuracionQueryKeys.all, 'reglas'] as const,
  reglas: (pagina: number, tamano: number) =>
    [...configuracionQueryKeys.reglasAll(), pagina, tamano] as const,
  matriz: () => [...configuracionQueryKeys.all, 'matriz-biologica'] as const,
  usuarios: () => [...configuracionQueryKeys.all, 'usuarios'] as const,
}

export function useParametros(enabled = true) {
  return useQuery({
    queryKey: configuracionQueryKeys.parametros(),
    queryFn: () => fetchParametros(1, 200),
    staleTime: 60_000,
    enabled,
  })
}

export function useUpdateParametroMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nombre, valor }: { nombre: string; valor: string }) =>
      updateParametro(nombre, valor),
    onSuccess: (res, variables) => {
      toast.success(`Parámetro "${variables.nombre}" actualizado`, {
        description: res.mensaje,
      })
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.parametros(),
      })
    },
    onError: (err, variables) => {
      notifyApiError(
        err,
        `No se pudo actualizar el parámetro "${variables.nombre}"`,
      )
    },
  })
}

export function useUpdateParametrosBatchMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (parametros: BatchParametroItem[]) =>
      updateParametrosBatch(parametros),
    onSuccess: (res) => {
      if (res.fallos.length > 0) {
        toast.warning('Lote guardado con observaciones', {
          description: `${res.mensaje}. Fallos: ${res.fallos.join(', ')}`,
        })
      } else {
        toast.success('Lote de parámetros guardado', {
          description: res.mensaje,
        })
      }
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.parametros(),
      })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo guardar el lote de parámetros')
    },
  })
}

export function useReglas(pagina: number, tamano: number, enabled = true) {
  return useQuery({
    queryKey: configuracionQueryKeys.reglas(pagina, tamano),
    queryFn: () => fetchReglas(pagina, tamano),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}

export function useMatrizBiologica(enabled = true) {
  return useQuery({
    queryKey: configuracionQueryKeys.matriz(),
    queryFn: fetchMatrizBiologica,
    staleTime: 60_000,
    enabled,
  })
}

export function useSaveMatrizBiologicaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (matriz: Record<string, Record<string, number | null>>) =>
      saveMatrizBiologica(matriz),
    onSuccess: () => {
      toast.success('Matriz biológica Six-Week guardada', {
        description:
          'Los porcentajes de maduración quedaron persistidos para futuras proyecciones.',
      })
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.matriz(),
      })
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.parametros(),
      })
    },
    onError: (err) => {
      notifyApiError(err, 'No se pudo guardar la matriz biológica')
    },
  })
}

/**
 * Consulta GET /auth/usuarios.
 * IMPORTANTE: pasar `enabled: canAdmin && active` — nunca disparar sin rol `admin`.
 */
export function useUsuarios(enabled: boolean) {
  return useQuery({
    queryKey: configuracionQueryKeys.usuarios(),
    queryFn: fetchUsuarios,
    staleTime: 60_000,
    enabled,
  })
}

export function useCreateUsuarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateUsuarioPayload) => createUsuario(payload),
    onSuccess: (created) => {
      toast.success(`Usuario "${created.nombre_usuario}" creado`, {
        description: `${created.nombre_display} · Rol: ${created.rol}`,
      })
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.usuarios(),
      })
    },
  })
}

export function useToggleUsuarioEstadoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      nombreUsuario,
      activar,
    }: {
      nombreUsuario: string
      activar: boolean
    }) =>
      activar
        ? activarUsuario(nombreUsuario)
        : desactivarUsuario(nombreUsuario),
    onSuccess: (res, variables) => {
      toast.success(
        variables.activar ? 'Usuario activado' : 'Usuario desactivado',
        {
          description: res.mensaje,
        },
      )
      void queryClient.invalidateQueries({
        queryKey: configuracionQueryKeys.usuarios(),
      })
    },
    onError: (err, variables) => {
      notifyApiError(
        err,
        variables.activar
          ? `No se pudo activar a "${variables.nombreUsuario}"`
          : `No se pudo desactivar a "${variables.nombreUsuario}"`,
      )
    },
  })
}
