import { toast } from 'sonner'
import { ApiError } from '@/shared/api/client'
import { notifyApiError } from '@/shared/lib/format'

/**
 * Registro centralizado de rutas API del frontend (Etapa 1 activas + Etapa 2 listas para conectar).
 *
 * Cuando implementes cada endpoint en el backend FastAPI, solo verifica o ajusta
 * la ruta en este archivo y todo el módulo correspondiente quedará conectado sin tocar la UI.
 */
export const API_ENDPOINTS = {
  // ── 01. Centro de Control (Streams ya activos en backend) ───────────────────
  health: {
    /** GET SSE stream /health/calidad/stream */
    calidadStream: '/health/calidad/stream',
    /** GET ?ventana_horas=24 -> { tablas: Array<{ tabla, ultima_carga, filas, estado, atraso_horas }> } */
    frescuraTablas: '/api/v1/auditoria/frescura',
  },

  // ── 03. Cuarentena MDM (Etapa 2: búsqueda server-side y resolución en lote) ─
  cuarentena: {
    /** GET ?pagina&tamano&estado_filtro&tabla_filtro&q&columna */
    listar: '/api/v1/cuarentena',
    /** POST body: { registros: Array<{ tabla_origen, id_registro }>, valor_canonico, comentario } */
    resolverLote: '/api/v1/cuarentena/resolver-lote',
    /** POST body: { registros: Array<{ tabla_origen, id_registro }>, motivo } */
    rechazarLote: '/api/v1/cuarentena/rechazar-lote',
  },

  // ── 04. Datos Maestros (Etapa 2: Geografía, MDM Variedades y Campañas) ──────
  maestros: {
    /** POST crear / PUT o PATCH /{id} editar / PATCH /{id}/vigencia */
    geografiaBase: '/api/v1/catalogos/geografia',
    /** PATCH editar unidad geográfica */
    geografiaItem: (id: string) => `/api/v1/catalogos/geografia/${encodeURIComponent(id)}`,
    /** PATCH activar/desactivar vigencia geográfica */
    geografiaVigencia: (id: string) => `/api/v1/catalogos/geografia/${encodeURIComponent(id)}/vigencia`,

    /** POST crear / PATCH /{nombre} editar / PATCH /{nombre}/estado */
    mdmVariedadesBase: '/api/v1/catalogos/variedades',
    /** PATCH editar variedad MDM */
    mdmVariedadItem: (nombre: string) =>
      `/api/v1/catalogos/variedades/${encodeURIComponent(nombre)}`,
    /** PATCH activar/desactivar variedad MDM */
    mdmVariedadEstado: (nombre: string) =>
      `/api/v1/catalogos/variedades/${encodeURIComponent(nombre)}/estado`,

    /** GET ?pagina&tamano / POST crear / PATCH /{id} editar / PATCH /{id}/activar|cerrar */
    campanasBase: '/api/v1/catalogos/campanas',
    /** PATCH editar campaña */
    campanaItem: (id: string | number) =>
      `/api/v1/catalogos/campanas/${encodeURIComponent(String(id))}`,
    /** PATCH activar campaña */
    campanaActivar: (id: string | number) =>
      `/api/v1/catalogos/campanas/${encodeURIComponent(String(id))}/activar`,
    /** PATCH cerrar campaña */
    campanaCerrar: (id: string | number) =>
      `/api/v1/catalogos/campanas/${encodeURIComponent(String(id))}/cerrar`,
  },

  // ── 05. Operarios (Etapa 2: CRUD Dim_Personal + incidencias dedicadas) ──────
  operarios: {
    /** POST crear / PATCH /{dni} editar / PATCH /{dni}/desactivar / PATCH /{dni}/reactivar */
    personalBase: '/api/v1/catalogos/personal',
    /** PATCH editar operario */
    personalItem: (dni: string) =>
      `/api/v1/catalogos/personal/${encodeURIComponent(dni)}`,
    /** PATCH desactivar operario */
    personalDesactivar: (dni: string) =>
      `/api/v1/catalogos/personal/${encodeURIComponent(dni)}/desactivar`,
    /** PATCH reactivar operario */
    personalReactivar: (dni: string) =>
      `/api/v1/catalogos/personal/${encodeURIComponent(dni)}/reactivar`,
    /** GET ?pagina&tamano&estado -> PaginatedCuarentenaResponse filtrado por DNI en SQL Server */
    personalIncidencias: (dni: string) =>
      `/api/v1/catalogos/personal/${encodeURIComponent(dni)}/incidencias`,
  },

  // ── 06. Configuración, Reglas DQ y Usuarios (Etapa 2) ───────────────────────
  configuracion: {
    /** POST crear / PATCH /{clave} editar umbrales/acción/activo */
    reglasBase: '/api/v1/config/reglas',
    /** PATCH editar regla DQ */
    reglaItem: (clave: string) => `/api/v1/config/reglas/${encodeURIComponent(clave)}`,

    /** GET/PUT constantes biológicas extendidas (PLANTAS_POR_PUNTO, DECAY_FACTOR, DELTA_PRODUCTIVAS) */
    biologiaConstantes: '/api/v1/proyecciones/constantes',

    /** PATCH /{nombre_usuario} editar rol/display/email; POST /{nombre_usuario}/reset-clave */
    usuarioItem: (nombreUsuario: string) =>
      `/auth/usuarios/${encodeURIComponent(nombreUsuario)}`,
    /** POST resetear contraseña de usuario */
    usuarioResetClave: (nombreUsuario: string) =>
      `/auth/usuarios/${encodeURIComponent(nombreUsuario)}/reset-clave`,
  },

  // ── 07. Auditoría e Ingesta Excel (Etapa 2) ─────────────────────────────────
  ingesta: {
    /** GET ?estado=entrada|procesados|rechazados -> { carpetas: string[], archivos: ArchivoExcelIngesta[] } */
    excelArchivos: '/api/v1/ingesta/excel/archivos',
    /** POST multipart/form-data (archivo, carpeta_destino?, sobreescribir?) */
    excelSubir: '/api/v1/ingesta/excel/subir',
    /** DELETE ?carpeta&nombre */
    excelEliminar: '/api/v1/ingesta/excel/archivos',
  },

  auditoria: {
    /** GET ?pagina&tamano&usuario&accion&desde&hasta -> { items, total, pagina, tamano } */
    accesos: '/api/v1/auditoria/accesos',
  },

  // ── 08. Proyecciones Six-Week (Etapa 1 activas + Etapa 2 simulación) ────────
  proyecciones: {
    /** GET -> { fechas: number[] } (ID_Tiempo YYYYMMDD disponibles) */
    fechas: '/api/v1/proyecciones/fechas',
    /** GET -> Array<{ Fundo, Modulo, Variedad, Condicion }> */
    combinaciones: (idTiempo: number | string) =>
      `/api/v1/proyecciones/combinaciones/${encodeURIComponent(String(idTiempo))}`,
    /** GET ?modulo&variedad&condicion -> { conteo: boolean, peladas: boolean, pesos: boolean } */
    integridad: (idTiempo: number | string) =>
      `/api/v1/proyecciones/integridad/${encodeURIComponent(String(idTiempo))}`,
    /** GET / POST matriz biológica Six-Week (PROY_SIXWEEK_MATRIZ_INPUTS) */
    matriz: '/api/v1/proyecciones/matriz',
    /** POST -> calcula y persiste proyección Six-Week en Silver.Fact_Proyecciones */
    ejecutar: '/api/v1/proyecciones/ejecutar',
    /** POST (Etapa 2) -> simulación en memoria sin persistencia */
    simular: '/api/v1/proyecciones/simular',
  },
} as const

/**
 * Detecta si un error corresponde a un endpoint Etapa 2 todavía no publicado en el backend
 * (HTTP 404 Not Found, 405 Method Not Allowed o 501 Not Implemented).
 */
export function isEndpointNotImplementedError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 501)
}

/**
 * Notifica errores de mutaciones Etapa 2 diferenciando claramente cuando la ruta
 * todavía no existe en el backend vs un error real de negocio/validación.
 */
export function notifyStage2MutationError(
  err: unknown,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  fallbackTitle: string,
): void {
  if (isEndpointNotImplementedError(err)) {
    const status = err instanceof ApiError ? err.status : 404
    toast.warning('Ruta aún pendiente en el backend', {
      description: `El formulario y contrato frontend están listos, pero el backend devolvió HTTP ${status} en ${method} ${endpoint}.`,
    })
    return
  }
  notifyApiError(err, fallbackTitle)
}
