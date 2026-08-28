import { createClient } from '@/lib/supabase/server'
import SucursalesClient from './SucursalesClient'
import { Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SucursalesAdminPage() {
  const supabase = await createClient()

  // Traer todas las sucursales con conteo de empleados
  const { data: sucursales, error } = await supabase
    .from('sucursales')
    .select(`
      *,
      perfiles ( count )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    console.error("Error cargando sucursales:", error)
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Store className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
            Gestión de Sucursales
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Administra tus locales, agrega nuevas franquicias y entra a sus paneles de control.
          </p>
        </div>
      </div>

      <SucursalesClient initialData={sucursales || []} />
    </div>
  )
}
