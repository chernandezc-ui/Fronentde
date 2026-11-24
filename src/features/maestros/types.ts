export type MaestrosTab = 'variedades' | 'mdm' | 'geografia' | 'campanas'

export interface PaginatedCatalogoResponse<T> {
  total: number
  pagina: number
  tamano: number
  datos: T[]
}

export interface DimVariedad {
  id_variedad: number
  nombre_variedad: string
  breeder: string | null
  es_activa: boolean
  fecha_creacion: string | null
  fecha_modificacion: string | null
}

export interface CreateDimVariedadPayload {
  nombre_variedad: string
  breeder: string | null
}

export interface OperacionVariedadResponse {
  ok: boolean
  mensaje: string
  dato: Record<string, unknown> | null
}

export interface MdmVariedad {
  nombre_canonico: string
  breeder: string | null
  es_activa: boolean
}

export interface GeografiaItem {
  id_geografia?: number | string | null
  fundo: string | null
  sector: string | null
  modulo: number | null
  turno: number | null
  valvula: string | null
  cama: string | null
  es_test_block: boolean
  codigo_sap_campo: string | null
  es_vigente: boolean
}

export interface UpsertGeografiaPayload {
  fundo: string
  sector: string
  modulo: number | null
  turno: number | null
  valvula: string | null
  cama: string | null
  codigo_sap_campo: string | null
  es_test_block: boolean
  es_vigente: boolean
}

export interface UpsertMdmVariedadPayload {
  nombre_canonico: string
  breeder: string | null
  es_activa: boolean
}

export interface CampanaItem {
  id_campana: number
  codigo: string | null
  nombre_campana: string
  fecha_inicio: string
  fecha_fin: string
  es_activa: boolean
  cerrada: boolean
  descripcion: string | null
}

export interface UpsertCampanaPayload {
  codigo: string | null
  nombre_campana: string
  fecha_inicio: string
  fecha_fin: string
  es_activa: boolean
  descripcion: string | null
}

export interface GeografiaQueryParams {
  pagina: number
  tamano: number
  texto?: string
  fundo?: string
  sector?: string
}
