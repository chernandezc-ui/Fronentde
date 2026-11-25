export type OperationalTone =
  | 'ok'
  | 'running'
  | 'pending'
  | 'warning'
  | 'error'
  | 'cancelled'
  | 'neutral'
  | 'readonly'

export function mapEstadoToTone(estado: string | null | undefined): OperationalTone {
  const norm = (estado || '').toUpperCase().trim()
  if (['OK', 'ACTIVO', 'LIBRE', 'COMPLETADO', 'RESUELTO', 'PUBLICADO', 'EXITOSO'].includes(norm)) return 'ok'
  if (['EJECUTANDO', 'EN_PROCESO', 'PROCESANDO', 'OCUPADO', 'RUNNING'].includes(norm)) return 'running'
  if (['PENDIENTE', 'EN_COLA', 'QUEUED', 'DEGRADADO'].includes(norm)) return 'pending'
  if (['PARCIAL', 'ADVERTENCIA', 'INCOMPLETO', 'ESTIMADO'].includes(norm)) return 'warning'
  if (['ERROR', 'FALLIDO', 'TIMEOUT', 'LOCK_VENCIDO', 'NO_LISTO', 'CONTROL_PLANE_ERROR', 'RECHAZADO'].includes(norm)) return 'error'
  if (['CANCELADO', 'DESCARTADO'].includes(norm)) return 'cancelled'
  return 'neutral'
}
