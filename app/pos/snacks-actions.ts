'use server'

import { createClient } from '@/lib/supabase/server'

export async function consultarStockSnacks(sucursal: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'No se pudo validar la sesión para consultar snacks.' }
    const { data: perfil } = await supabase.from('perfiles').select('activo, sucursal_id, rol').eq('id', user.id).single()
    if (!perfil?.activo || (perfil.rol !== 'admin' && perfil.sucursal_id !== sucursal)) return { error: 'No tienes acceso al stock de esta sucursal.' }
    const { data, error } = await supabase.from('stock_snacks').select('producto_id, cantidad').eq('sucursal_id', sucursal)
    if (error) return { error: 'No se pudo cargar el stock de snacks. Comprueba la conexión y la configuración del inventario.' }
    return { data: data || [] }
  } catch {
    return { error: 'Sin conexión al inventario de snacks. Actualiza antes de venderlos.' }
  }
}
