import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularTotalesTurnos, type VentaParaTurno } from '../turnos-totales'

export async function leerTotalesTurnos(supabase: SupabaseClient, ids: string[]): Promise<ReturnType<typeof calcularTotalesTurnos>> {
  if (!ids.length) return {}
  const ventas: VentaParaTurno[] = []
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabase.from('ventas')
      .select('turno_id, estado, total, metodo_pago, metodo_pago_2, monto_pago_2')
      .in('turno_id', ids).eq('estado', 'completada').order('id').range(inicio, inicio + 999)
    if (error) throw new Error('No se pudieron consultar las ventas reales de caja. Actualiza antes de continuar.')
    ventas.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return calcularTotalesTurnos(ventas)
}
