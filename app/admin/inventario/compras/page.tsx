import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ComprasClient from './ComprasClient'
import { ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ComprasAdminPage() {
  const supabase = await createClient()

  // 1. Sucursales activas
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  // 2. Proveedores activos
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  // 3. Insumos activos (para el dropdown de compra)
  const { data: insumos } = await supabase
    .from('insumos')
    .select('id, nombre, unidad, sucursal_id')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await adminClient.from('perfiles').select('rol, sucursal_id').eq('id', user?.id).single()

  // 4. Historial de compras resumido
  let query = adminClient
    .from('compras')
    .select(`
      *,
      sucursales(nombre),
      proveedores(nombre),
      perfiles(nombre, apellido)
    `)
    .order('fecha_compra', { ascending: false })
    .order('created_at', { ascending: false })

  if (perfil?.rol === 'supervisor') {
    query = query.eq('sucursal_id', perfil.sucursal_id)
  }

  const { data: compras, error } = await query

  if (error) {
    console.error("Error cargando historial de compras:", error)
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
            Registro de Compras
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Registra y visualiza el historial de reabastecimiento. El stock de tu inventario aumentará automáticamente al guardar.
          </p>
        </div>
      </div>

      <ComprasClient 
        initialData={compras || []} 
        sucursales={sucursales || []} 
        proveedores={proveedores || []}
        insumos={insumos || []}
      />
    </div>
  )
}
