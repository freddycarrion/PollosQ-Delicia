import { createClient } from '@/lib/supabase/server'
import { UsersIcon } from 'lucide-react'
import EmpleadosClient from './EmpleadosClient'

export const dynamic = 'force-dynamic'

export default async function EmpleadosPage() {
  const supabase = await createClient()

  // 1. Obtener lista de sucursales para el formulario
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('activa', true)
    
  // 2. Obtener la lista de empleados (perfiles)
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('*, sucursales(nombre)')
    .order('created_at', { ascending: false })

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UsersIcon className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
          Gestión de Personal
        </h1>
        <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
          Administra los cajeros y supervisores, asigna sus sucursales y controla sus roles de acceso al sistema.
        </p>
      </div>

      <EmpleadosClient 
        empleados={perfiles || []} 
        sucursales={sucursales || []} 
      />
    </div>
  )
}
