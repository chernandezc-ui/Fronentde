import { z } from 'zod'
import type { RolUsuario } from '@/shared/auth/authStore'
import type { OperationalTone } from '@/shared/components/StatusBadge'
import type {
  ConfiguracionTab,
  CreateUsuarioPayload,
  GrupoParametro,
} from './types'

export const PARAMETRO_VALOR_MIN = 1
export const PARAMETRO_VALOR_MAX = 500

export const USUARIO_NOMBRE_MIN = 3
export const USUARIO_NOMBRE_MAX = 100
export const USUARIO_DISPLAY_MIN = 1
export const USUARIO_DISPLAY_MAX = 200
export const USUARIO_EMAIL_MAX = 200
export const USUARIO_CLAVE_MIN = 8
export const USUARIO_CLAVE_MAX = 200

export const ROLES_USUARIO_VALORES = [
  'admin',
  'operador_etl',
  'analista_mdm',
  'viewer',
] as const satisfies readonly RolUsuario[]

export interface RolMeta {
  value: RolUsuario
  label: string
  descripcion: string
  tone: OperationalTone
}

export const ROLES_USUARIO_META: readonly RolMeta[] = [
  {
    value: 'admin',
    label: 'Administrador (admin)',
    descripcion: 'Control total del DWH, variedades y administración de usuarios.',
    tone: 'error',
  },
  {
    value: 'operador_etl',
    label: 'Operador ETL (operador_etl)',
    descripcion: 'Ejecuta corridas ETL, monitorea pipeline y edita parámetros/biología.',
    tone: 'running',
  },
  {
    value: 'analista_mdm',
    label: 'Analista MDM (analista_mdm)',
    descripcion: 'Resuelve cuarentena, gestiona reglas/parámetros y matriz biológica.',
    tone: 'warning',
  },
  {
    value: 'viewer',
    label: 'Lector (viewer)',
    descripcion: 'Acceso de solo lectura a monitoreo, catálogos y auditoría.',
    tone: 'neutral',
  },
] as const

export function getRolMeta(rol: string | undefined | null): RolMeta {
  const norm = (rol ?? '').toLowerCase().trim()
  const found = ROLES_USUARIO_META.find((item) => item.value === norm)
  return (
    found ?? {
      value: 'viewer',
      label: rol || 'Desconocido',
      descripcion: 'Rol personalizado',
      tone: 'neutral',
    }
  )
}

export function parseConfiguracionTab(
  raw: string | null | undefined,
): ConfiguracionTab {
  if (
    raw === 'parametros' ||
    raw === 'biologia' ||
    raw === 'reglas' ||
    raw === 'usuarios'
  ) {
    return raw
  }
  return 'parametros'
}

export interface GrupoParametroMeta {
  key: GrupoParametro
  label: string
  descripcion: string
  badgeTone: OperationalTone
}

export const GRUPOS_PARAMETRO_META: readonly GrupoParametroMeta[] = [
  {
    key: 'campana',
    label: 'Campaña',
    descripcion: 'Ventanas temporales, campaña vigente y cierres operativos',
    badgeTone: 'pending',
  },
  {
    key: 'biologia',
    label: 'Biología / Proyección',
    descripcion: 'Parámetros Six-Week, maduración, márgenes y pesos de baya',
    badgeTone: 'ok',
  },
  {
    key: 'calidad_etl',
    label: 'Calidad / ETL',
    descripcion: 'Umbrales DQ, cuarentena, reintentos, lotes y ejecución ETL',
    badgeTone: 'running',
  },
  {
    key: 'general',
    label: 'General',
    descripcion: 'Configuración transversal del sistema y plataforma',
    badgeTone: 'neutral',
  },
] as const

const CAMPANA_PATTERN =
  /campa[nñ]a|temporada|zafra|anio_camp|cosecha_ini|cosecha_fin|semana_ini|semana_fin|fecha_ini|fecha_fin|periodo_activo/i

const BIOLOGIA_PATTERN =
  /proy|sixweek|six_week|madur|biolog|baya|decay|fenolog|plantas_por_punto|delta_prod|margen_pesimista|margen_optimista|peso_fallback|matriz/i

const CALIDAD_ETL_PATTERN =
  /calidad|(^|_)dq($|_)|cuarentena|etl|pipeline|umbral|timeout|batch|lote|retry|reintento|asertividad|tolerancia|validacion|regla|lock|staging|bronze|silver|gold|mdm|worker|hilo|thread/i

/**
 * Clasifica un parámetro de `Config.Parametros_Pipeline` en un grupo lógico
 * a partir de su nombre (y descripción como pista secundaria).
 */
export function clasificarGrupoParametro(
  nombreParametro: string,
  descripcion?: string | null,
): GrupoParametro {
  const nombre = nombreParametro.trim()
  if (BIOLOGIA_PATTERN.test(nombre)) return 'biologia'
  if (CAMPANA_PATTERN.test(nombre)) return 'campana'
  if (CALIDAD_ETL_PATTERN.test(nombre)) return 'calidad_etl'

  const desc = (descripcion ?? '').trim()
  if (desc) {
    if (BIOLOGIA_PATTERN.test(desc)) return 'biologia'
    if (CAMPANA_PATTERN.test(desc)) return 'campana'
    if (CALIDAD_ETL_PATTERN.test(desc)) return 'calidad_etl'
  }

  return 'general'
}

export function getGrupoParametroMeta(grupo: GrupoParametro): GrupoParametroMeta {
  return (
    GRUPOS_PARAMETRO_META.find((g) => g.key === grupo) ??
    GRUPOS_PARAMETRO_META[GRUPOS_PARAMETRO_META.length - 1]
  )
}

export const parametroValorSchema = z
  .string()
  .min(
    PARAMETRO_VALOR_MIN,
    'El valor no puede quedar vacío (mínimo 1 carácter).',
  )
  .max(
    PARAMETRO_VALOR_MAX,
    `El valor no puede exceder ${PARAMETRO_VALOR_MAX} caracteres.`,
  )

const EMAIL_SIMPLE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const createUsuarioSchema = z.object({
  nombre_usuario: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(
          USUARIO_NOMBRE_MIN,
          `El usuario debe tener al menos ${USUARIO_NOMBRE_MIN} caracteres.`,
        )
        .max(
          USUARIO_NOMBRE_MAX,
          `El usuario no puede exceder ${USUARIO_NOMBRE_MAX} caracteres.`,
        )
        .regex(
          /^\S+$/,
          'El nombre de usuario no puede contener espacios en blanco.',
        ),
    ),
  nombre_display: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(
          USUARIO_DISPLAY_MIN,
          'Ingresa el nombre visible del usuario.',
        )
        .max(
          USUARIO_DISPLAY_MAX,
          `El nombre visible no puede exceder ${USUARIO_DISPLAY_MAX} caracteres.`,
        ),
    ),
  email: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .max(
          USUARIO_EMAIL_MAX,
          `El correo no puede exceder ${USUARIO_EMAIL_MAX} caracteres.`,
        )
        .refine(
          (val) => val.length === 0 || EMAIL_SIMPLE_REGEX.test(val),
          'Ingresa un correo electrónico válido o deja el campo vacío.',
        ),
    ),
  clave: z
    .string()
    .min(
      USUARIO_CLAVE_MIN,
      `La contraseña debe tener al menos ${USUARIO_CLAVE_MIN} caracteres.`,
    )
    .max(
      USUARIO_CLAVE_MAX,
      `La contraseña no puede exceder ${USUARIO_CLAVE_MAX} caracteres.`,
    ),
  rol: z.enum(ROLES_USUARIO_VALORES, {
    error: 'Selecciona un rol válido.',
  }),
})

export const createUsuarioFormSchema = createUsuarioSchema
  .extend({
    confirmar_clave: z.string().min(1, 'Confirma la contraseña inicial.'),
  })
  .refine((data) => data.clave === data.confirmar_clave, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmar_clave'],
  })

export type CreateUsuarioSchemaValues = z.infer<typeof createUsuarioSchema>
export type CreateUsuarioFormValues = z.infer<typeof createUsuarioFormSchema>

export function toCreateUsuarioPayload(
  values: CreateUsuarioSchemaValues,
): CreateUsuarioPayload {
  const emailTrimmed = values.email.trim()
  return {
    nombre_usuario: values.nombre_usuario.trim(),
    nombre_display: values.nombre_display.trim(),
    email: emailTrimmed.length > 0 ? emailTrimmed : null,
    clave: values.clave,
    rol: values.rol,
  }
}
