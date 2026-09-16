import { createClient } from '@/lib/supabase/server'
import PersonalOperativoClient from './PersonalOperativoClient'
import { ChefHat } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PersonalOperativoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: miPerfil } = user ? await supabase
    .from('perfiles')
    .select('sucursal_id, rol')
    .eq('id', user.id)
    .single() : { data: null }

  // Obtener personal operativo
  let query = supabase
    .from('personal_operativo')
    .select('*, sucursales(nombre)')
    .order('nombre', { ascending: true })

  // Supervisores solo ven su sucursal
  if (miPerfil?.rol === 'supervisor' && miPerfil.sucursal_id) {
    query = query.eq('sucursal_id', miPerfil.sucursal_id)
  }

  const { data: personal, error } = await query
  if (error) console.error('Error cargando personal:', error)

  // Sucursales activas
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre')

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ChefHat style={{ color: 'var(--yellow)' }} size={32} />
            Personal Operativo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: 4 }}>
            Gestiona cocineros, meseros, ayudantes y demás personal de operaciones.
          </p>
        </div>
      </div>

      <PersonalOperativoClient
        initialData={(personal || []) as any[]}
        sucursales={(sucursales || []) as any[]}
        miSucursalId={miPerfil?.sucursal_id || null}
      />
    </div>
  )
}
