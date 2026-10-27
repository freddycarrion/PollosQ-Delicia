'use server'

import { createClient } from '@/lib/supabase/server'
import { leerTotalesTurnos } from '@/lib/supabase/turnos-totales'
import { turnoSinVentas } from '@/lib/turnos-totales'

async function resumen(turnoId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('No se pudo verificar tu sesión.')
  const { data: turno, error } = await supabase.from('turnos')
    .select('id, estado, monto_apertura').eq('id', turnoId).eq('cajero_id', user.id).single()
  if (error || !turno || turno.estado !== 'abierto') throw new Error('No se encontró un turno abierto de tu cuenta.')
  const totales = (await leerTotalesTurnos(supabase, [turnoId]))[turnoId] || turnoSinVentas
  return { supabase, user, turno, totales }
}

export async function consultarCierreTurno(turnoId: string) {
  try {
    const { turno, totales } = await resumen(turnoId)
    return { data: { apertura: Number(turno.monto_apertura), ventas: totales.total_efectivo, qr: totales.total_qr } }
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudieron consultar las ventas de caja.' } }
}

export async function cerrarTurnoReal(turnoId: string) {
  try {
    const { supabase, user, turno, totales } = await resumen(turnoId)
    const cierre = Number(turno.monto_apertura) + totales.total_efectivo
    const { data, error } = await supabase.from('turnos').update({
      ...totales, estado: 'cerrado', monto_cierre: cierre, fecha_cierre: new Date().toISOString(),
    }).eq('id', turnoId).eq('cajero_id', user.id).eq('estado', 'abierto').select('id').single()
    if (error || !data) return { error: 'No se confirmó el cierre. Actualiza el estado del turno antes de reintentar.' }
    return { data: { cierre, userId: user.id } }
  } catch (error) { return { error: error instanceof Error ? error.message : 'No se pudo confirmar el cierre.' } }
}
