export type EstadoCuarentenaFiltro = 'PENDIENTE' | 'RESUELTO' | 'DESCARTADO' | 'all'

export interface CuarentenaResumen {
  total: number
  pendientes: number
  resueltos: number
  descartados: number
}

export interface RegistroCuarentena {
  tabla_origen: string
  id_registro: string
  columna_origen: string
  valor_raw: string
  nombre_archivo: string | null
  fecha_ingreso: string | null
  estado: string
  motivo: string | null
  valor_corregido: string | null
  id_registro_origen: number | null
}

export interface RespuestaCuarentenaPaginada {
  total: number
  pagina: number
  tamano: number
  datos: RegistroCuarentena[]
}

export interface PeticionResolverCuarentena {
  valor_canonico: string
  comentario: string | null
}

export interface PeticionRechazarCuarentena {
  motivo: string
}

export interface RespuestaAccionCuarentena {
  id_registro: string
  estado_nuevo: string
  mensaje: string
}

export interface RespuestaCandidatosReinyeccion {
  candidatos: number
}

export interface RespuestaReinyeccion {
  reinyectados: number
  omitidos: number
  ya_en_cola: number
  marcados: number
  detalle: string[]
  mensaje: string
}

export interface CuarentenaFiltrosUrl {
  pagina: number
  tamano: number
  estado: EstadoCuarentenaFiltro
  tabla: string
}
