import { supabase } from '../supabase'

export async function logAuditoria(
  usuarioId: string,
  usuarioNombre: string,
  accion: string,
  modulo: string,
  detalle?: Record<string, any>
) {
  try {
    await supabase.from('auditoria').insert({
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      accion,
      modulo,
      detalle: detalle ?? null,
    })
  } catch (e) {
    console.error('Error de auditoría:', e)
  }
}
