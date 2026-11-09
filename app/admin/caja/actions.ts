'use server'

import { createClient } from '@/lib/supabase/server'
import { leerTotalesTurnos } from '@/lib/supabase/turnos-totales'
import { turnoSinVentas } from '@/lib/turnos-totales'

export async function cerrarTurnoComoAdmin(turnoId: string, cierreConfirmado: number) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Inicia sesión para cerrar la caja.' }

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()
  if (perfilError || perfil?.rol !== 'admin') return { error: 'Solo un administrador puede cerrar cajas de otros empleados.' }

  const { data: turno, error: turnoError } = await supabase
    .from('turnos')
    .select('id, estado, monto_apertura, cajero_id')
    .eq('id', turnoId)
    .eq('estado', 'abierto')
    .single()
  if (turnoError || !turno) return { error: 'Este turno ya no está abierto. Actualiza la pantalla.' }

  try {
    const totales = (await leerTotalesTurnos(supabase, [turnoId]))[turnoId] || turnoSinVentas
    const montoCierre = Number(turno.monto_apertura) + totales.total_efectivo
    if (!Number.isFinite(cierreConfirmado) || Math.round(montoCierre * 100) !== Math.round(cierreConfirmado * 100)) {
      return { error: 'El monto esperado cambió desde que cargaste la pantalla. Actualiza y confirma el cierre nuevamente.' }
    }

    const { data, error } = await supabase.from('turnos').update({
      ...totales,
      estado: 'cerrado',
      monto_cierre: montoCierre,
      fecha_cierre: new Date().toISOString(),
    }).eq('id', turnoId).eq('estado', 'abierto').select('id').maybeSingle()

    if (error || !data) return { error: 'No se confirmó el cierre. Actualiza el estado del turno antes de reintentar.' }
    return { data: { cierre: montoCierre, cajeroId: turno.cajero_id } }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo calcular el cierre de caja.' }
  }
}
