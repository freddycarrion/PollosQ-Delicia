import { createClient } from '@/lib/supabase/server'
import ProveedoresClient from './ProveedoresClient'
import { Briefcase } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProveedoresAdminPage() {
  const supabase = await createClient()

  const { data: proveedores, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    console.error("Error cargando proveedores:", error)
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Briefcase className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
            Proveedores de Insumos
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Gestiona las empresas o contactos comerciales que suministran productos para el negocio.
          </p>
        </div>
      </div>

      <ProveedoresClient initialData={proveedores || []} />
    </div>
  )
}
