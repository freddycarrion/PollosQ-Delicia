import { createClient } from '@/lib/supabase/server'
import { Bell } from 'lucide-react'
import ComunicadosClient from './ComunicadosClient'

export const dynamic = 'force-dynamic'

export default async function ComunicadosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: comunicados } = await supabase
    .from('comunicados')
    .select('*, creador_id(nombre, apellido)')
    .order('created_at', { ascending: false })

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bell className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
          Avisos Generales
        </h1>
        <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
          Publica comunicados para el personal operativo (Meseros, Cocineros, etc) para que lo vean en su portal al ingresar.
        </p>
      </div>

      <ComunicadosClient 
        comunicados={comunicados || []} 
        userId={user?.id || ''}
      />
    </div>
  )
}
