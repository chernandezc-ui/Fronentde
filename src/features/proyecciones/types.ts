import type {
  BiologiaConstantes,
  MatrizBiologicaCompleta,
} from '@/features/configuracion/types'

export type ProyeccionesTab = 'resumen' | 'detalle' | 'supuestos'

export type ProyeccionStepId = 'corte' | 'supuestos' | 'inspeccion' | 'publicar'

export type InspeccionSubTab = 'curva' | 'detalle' | 'comparar'

export type ProyeccionLifecycle = 'borrador' | 'simulado' | 'desactualizado' | 'publicado'

export type OrigenMatrizProyeccion = 'backend' | 'defaults' | 'override'

export interface CombinacionProyeccion {
  fundo: string
  modulo: string
  variedad: string
  condicion: string
}

export interface IntegridadProyeccion {
  conteo: boolean
  peladas: boolean
  pesos: boolean
}

export interface FilaSemanalProyeccion {
  semana: number
  semana_label: string
  fecha_semana: string
  kg_proyectados: number
  kg_pesimista: number
  kg_optimista: number
  kg_anterior: number
  pct_variacion: number
  tendencia: string
}

export interface DetalleUnidadProyeccion {
  id_geografia: number
  id_variedad: number
  id_fundo: number
  fundo: string
  condicion: string
  certificacion: string
  modulo: string
  turno: string
  valvula: string
  variedad: string
  semana: number
  id_tiempo_proy: number
  semana_label: string
  fecha_semana: string
  kg_base: number
  kg_pesimista: number
  kg_optimista: number
}

export interface KpisProyeccion {
  total_base: number | null
  total_opt: number | null
  total_pes: number | null
  variedad_top: string
  total_plantas: number | null
  kg_por_planta: number | null
  unidades_cubiertas: number | null
  unidades_totales: number | null
}

export interface RespuestaProyeccion {
  df_semanal: FilaSemanalProyeccion[]
  kpis: KpisProyeccion
  df_detalle: DetalleUnidadProyeccion[]
}

export interface PeticionEjecutarProyeccion {
  id_tiempo: number
  matriz_inputs: Record<string, Record<string, number | null>>
  margen_pesimista: number
  margen_optimista: number
  modulo?: number | null
  variedad?: string | null
  condicion?: string | null
  fundo?: string | null
  constantes?: Pick<BiologiaConstantes, 'plantas_por_punto' | 'decay_factor' | 'delta_productivas'>
}

export interface FiltrosProyeccionUrl {
  fecha: number | null
  fundo: string
  modulo: string
  variedad: string
  condicion: string
  tab: ProyeccionesTab
}

export interface EscenarioEjecutadoMeta {
  id_tiempo: number
  fundo: string
  modulo: string
  variedad: string
  condicion: string
  margen_pesimista: number
  margen_optimista: number
  origen_matriz: OrigenMatrizProyeccion
  matriz_snapshot: MatrizBiologicaCompleta
  ejecutado_en: string
  modo: 'ejecutar' | 'simular'
}

export interface ResumenAgregadoDimension {
  clave: string
  unidades: number
  kg_base: number
  kg_pesimista: number
  kg_optimista: number
  participacion_pct: number
}

export interface EscenarioSnapshot {
  id: string
  label: string
  fingerprint: string
  meta: EscenarioEjecutadoMeta
  result: RespuestaProyeccion
}

export interface StepVisualState {
  id: ProyeccionStepId
  numero: number
  titulo: string
  descripcionCorta: string
  enabled: boolean
  completed: boolean
  active: boolean
  disabledReason?: string
}

export interface FilaComparacionSemanal {
  semana: number
  semana_label: string
  kg_base_a: number
  kg_base_b: number
  delta_kg: number
  delta_pct: number | null
}

export interface ComparacionEscenarios {
  totalBaseA: number
  totalBaseB: number
  deltaBaseKg: number
  deltaBasePct: number | null
  totalPesA: number
  totalPesB: number
  totalOptA: number
  totalOptB: number
  semanas: FilaComparacionSemanal[]
}
