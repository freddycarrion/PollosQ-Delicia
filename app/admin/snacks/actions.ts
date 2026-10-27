'use server'

import { createClient } from '@/lib/supabase/server'
import { cantidadSnackValida, esCategoriaSnack, type StockSnack } from '@/lib/snacks'

async function contexto(sucursal: string) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Vuelve a iniciar sesión para gestionar snacks.')
  const { data: perfil } = await supabase.from('perfiles').select('rol, activo, sucursal_id').eq('id', user.id).single()
  if (!perfil?.activo || !['admin', 'supervisor'].includes(perfil.rol)
    || (perfil.rol === 'supervisor' && perfil.sucursal_id !== sucursal)) {
    throw new Error('No tienes permiso para gestionar snacks en esta sucursal.')
  }
  return supabase
}

export async function listarSnacks(sucursal: string): Promise<{ data?: StockSnack[]; error?: string }> {
  try {
    const supabase = await contexto(sucursal)
    const { data: categorias, error: catError } = await supabase.from('categorias').select('id, nombre')
    if (catError) throw new Error('No se pudieron cargar las categorías.')
    const ids = (categorias || []).filter(c => esCategoriaSnack(c.nombre)).map(c => c.id)
    if (!ids.length) return { data: [] }
    const { data: productos, error: prodError } = await supabase.from('productos')
      .select('id, nombre, disponible').in('categoria_id', ids).order('nombre')
    if (prodError) throw new Error('No se pudieron cargar los productos.')
    const { data: stock, error: stockError } = await supabase.from('stock_snacks')
      .select('producto_id, cantidad, version').eq('sucursal_id', sucursal)
    if (stockError) throw new Error('No se pudo cargar el stock. Comprueba que la migración de Snacks esté aplicada en Supabase.')
    return { data: (productos || []).map(p => {
      const fila = stock?.find(s => s.producto_id === p.id)
      return { producto_id: p.id, nombre: p.nombre, disponible: p.disponible, cantidad: fila?.cantidad ?? 0, version: fila?.version ?? null }
    }) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo cargar el inventario.' }
  }
}

export async function guardarStockSnack(sucursal: string, producto: string, cantidad: number, version: number | null) {
  try {
    if (!cantidadSnackValida(cantidad)) return { error: 'La cantidad debe ser un número entero mayor o igual a cero.' }
    const supabase = await contexto(sucursal)
    const { data: prod } = await supabase.from('productos').select('categoria_id').eq('id', producto).single()
    const { data: categoria } = prod ? await supabase.from('categorias').select('nombre').eq('id', prod.categoria_id).single() : { data: null }
    if (!categoria || !esCategoriaSnack(categoria.nombre)) return { error: 'Este producto no pertenece a la categoría Snacks.' }
    const query = version === null
      ? supabase.from('stock_snacks').insert({ sucursal_id: sucursal, producto_id: producto, cantidad })
      : supabase.from('stock_snacks').update({ cantidad }).eq('sucursal_id', sucursal).eq('producto_id', producto).eq('version', version)
    const { data, error } = await query.select('cantidad, version').single()
    if (error || !data) return { error: 'El stock cambió o no se pudo guardar. Actualiza el listado antes de volver a cargar la cantidad.' }
    return { data }
  } catch {
    return { error: 'No se pudo confirmar el guardado. Actualiza el listado antes de reintentar.' }
  }
}
