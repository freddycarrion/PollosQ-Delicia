import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from './Sidebar'
import AdminHeader from './Header'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, apellido, rol, sucursales(nombre)')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.rol === 'cajero') redirect('/pos')
  // Operativos al Portal
  const rolesOperativos = ['mesero', 'cocinero', 'repartidor', 'limpieza']
  if (rolesOperativos.includes(perfil.rol)) redirect('/portal')

  const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`
  const sucursalNombre = typeof perfil.sucursales === 'object' && perfil.sucursales !== null && 'nombre' in perfil.sucursales
    ? (perfil.sucursales as any).nombre
    : 'Sucursal Principal';

  return (
    <div className="admin-layout">
      <AdminSidebar nombreUsuario={nombreCompleto} rolUsuario={perfil.rol} sucursal={sucursalNombre} />
      <div className="admin-main">
        <AdminHeader nombreUsuario={perfil.nombre} />
        <main className="admin-content">
          {children}
        </main>
      </div>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100dvh;
          background: var(--bg-900);
        }
        .admin-main {
          margin-left: var(--sidebar-w);
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          position: relative;
        }
        .admin-main::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 280px;
          background: linear-gradient(135deg, #B71C1C 0%, #E65100 50%, #FBC02D 100%);
          border-bottom-left-radius: 40% 15%;
          border-bottom-right-radius: 60% 25%;
          z-index: 0;
          opacity: 0.95;
        }
        .admin-content {
          flex: 1;
          padding: 28px 32px;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
        @media (max-width: 1024px) {
          .admin-main { margin-left: 0; }
        }
        @media (max-width: 768px) {
          .admin-main { margin-left: 0; }
          .admin-content { padding: 16px; }
        }
        @media (max-width: 480px) {
          .admin-content { padding: 12px; }
        }
      `}</style>
    </div>
  )
}
