'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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
