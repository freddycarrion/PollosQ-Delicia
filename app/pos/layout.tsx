import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PosSidebarHeader from './Header'
import { Toaster } from 'react-hot-toast'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select(`
      nombre, 
      apellido, 
      rol,
      sucursales ( nombre )
    `)
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`
  const esAdmin = ['admin', 'supervisor'].includes(perfil.rol)
  
  const sucursalNombre = typeof perfil.sucursales === 'object' && perfil.sucursales !== null && 'nombre' in perfil.sucursales
    ? (perfil.sucursales as any).nombre
    : 'Sucursal Principal';

  // Verificar turno activo para el botón del Header
  const { data: turnoActivo } = await supabase
    .from('turnos')
    .select('id')
    .eq('cajero_id', user.id)
    .eq('estado', 'abierto')
    .single()

  return (
    <div className="pos-layout-wrapper">
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <PosSidebarHeader 
        nombreUsuario={nombreCompleto} 
        esAdmin={esAdmin}
        rol={perfil.rol}
        sucursal={sucursalNombre}
        turnoId={turnoActivo?.id}
      >
        {children}
      </PosSidebarHeader>
    </div>
  )
}
