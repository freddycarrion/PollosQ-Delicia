import { createClient } from '@/lib/supabase/server'
import InsumosClient from './InsumosClient'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InsumosAdminPage() {
  const supabase = await createClient()

  // Traer sucursales para el filtro y el form
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  // Traer insumos con el nombre de su sucursal
  const { data: insumos, error } = await supabase
    .from('insumos')
    .select('*, sucursales(nombre)')
    .order('nombre', { ascending: true })

  if (error) {
    console.error("Error cargando insumos:", error)
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
            Control de Insumos y Stock Base
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Gestiona los productos que compras para tu negocio (Pollo, papas, bebidas) y configura alertas de stock bajo.
          </p>
        </div>
      </div>

      <InsumosClient 
        initialData={insumos || []} 
        sucursales={sucursales || []} 
      />
    </div>
  )
}
