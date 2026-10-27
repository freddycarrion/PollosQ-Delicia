'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface DetalleCompraVista {
  id: string
  numero_factura: string | null
  fecha_compra: string
  total: number
  observaciones: string | null
  proveedor: string
  sucursal: string
  registradoPor: string
  articulos: { id: string; nombre: string; unidad: string; cantidad: number; precio_unitario: number; subtotal: number }[]
}

export async function obtenerDetalleCompra(id: string): Promise<{ data?: DetalleCompraVista; error?: string }> {
  try {
    if (!id || typeof id !== 'string') return { error: 'Selecciona una compra.' }
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'Vuelve a iniciar sesión para consultar la compra.' }
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: perfil, error: perfilError } = await admin.from('perfiles').select('rol, sucursal_id, activo').eq('id', user.id).single()
    if (perfilError || !perfil?.activo || !['admin', 'supervisor'].includes(perfil.rol)) return { error: 'No tienes permiso para consultar compras.' }
    let query = admin.from('compras').select(`
      id, numero_factura, fecha_compra, total, observaciones,
      proveedores(nombre), sucursales(nombre), perfiles(nombre, apellido),
      detalle_compras(id, nombre_insumo, cantidad, precio_unitario, subtotal, insumos(nombre, unidad))
    `).eq('id', id)
    if (perfil.rol === 'supervisor') {
      if (!perfil.sucursal_id) return { error: 'No tienes una sucursal asignada.' }
      query = query.eq('sucursal_id', perfil.sucursal_id)
    }
    const { data: compra, error } = await query.single()
    if (error || !compra) return { error: 'No se pudo consultar la compra. Comprueba tu conexión y el acceso a su sucursal.' }
    const proveedor = Array.isArray(compra.proveedores) ? compra.proveedores[0] : compra.proveedores
    const sucursal = Array.isArray(compra.sucursales) ? compra.sucursales[0] : compra.sucursales
    const registrado = Array.isArray(compra.perfiles) ? compra.perfiles[0] : compra.perfiles
    return { data: {
      id: compra.id, numero_factura: compra.numero_factura, fecha_compra: compra.fecha_compra,
      total: Number(compra.total), observaciones: compra.observaciones,
      proveedor: proveedor?.nombre || 'Proveedor Varios', sucursal: sucursal?.nombre || 'Sin sucursal',
      registradoPor: registrado ? `${registrado.nombre} ${registrado.apellido}`.trim() : 'Sin registro',
      articulos: (compra.detalle_compras || []).map(d => {
        const insumo = Array.isArray(d.insumos) ? d.insumos[0] : d.insumos
        return { id: d.id, nombre: d.nombre_insumo || insumo?.nombre || 'Artículo sin nombre',
          unidad: insumo?.unidad || 'unid.', cantidad: Number(d.cantidad), precio_unitario: Number(d.precio_unitario), subtotal: Number(d.subtotal) }
      }),
    } }
  } catch {
    return { error: 'No se pudo conectar para consultar la compra. Vuelve a intentarlo.' }
  }
}

export async function revalidateCompras() {
  revalidatePath('/admin/inventario/compras')
}

export async function registrarCompraAccion(compraData: any, detallesData: any[]) {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Validate user role
  const { data: perfil } = await adminClient.from('perfiles').select('rol, sucursal_id').eq('id', user.id).single()
  if (!perfil) throw new Error("Perfil no encontrado")
  if (perfil.rol !== 'admin' && perfil.rol !== 'supervisor') {
    throw new Error("No tienes permisos para registrar compras")
  }
  if (perfil.rol === 'supervisor' && compraData.sucursal_id !== perfil.sucursal_id) {
    throw new Error("Solo puedes registrar compras para tu sucursal")
  }

  // Insert compra
  const { data: compra, error: errorCompra } = await adminClient
    .from('compras')
    .insert([{ ...compraData, registrado_por: user.id }])
    .select()
    .single()

  if (errorCompra) {
    console.error("Error insertando compra:", errorCompra)
    throw new Error(errorCompra.message)
  }

  // Insert detalles
  const detallesToInsert = detallesData.map(d => ({ ...d, compra_id: compra.id }))
  const { error: errorDetalle } = await adminClient
    .from('detalle_compras')
    .insert(detallesToInsert)

  if (errorDetalle) {
    console.error("Error insertando detalles:", errorDetalle)
    await adminClient.from('compras').delete().eq('id', compra.id)
    throw new Error(errorDetalle.message)
  }

  revalidatePath('/admin/inventario/compras')
  return compra
}
