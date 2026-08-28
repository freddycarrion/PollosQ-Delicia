'use client'

import { usePathname } from 'next/navigation'
import { Menu, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import NotificacionesBell from './NotificacionesBell'

const pageNames: Record<string, string> = {
  '/admin/dashboard':    'Dashboard',
  '/admin/ventas':       'Ventas',
  '/admin/caja':         'Caja',
  '/admin/empleados':    'Empleados',
  '/admin/menu':         'Menú',
  '/admin/inventario':   'Inventario',
  '/admin/inventario/proveedores': 'Proveedores',
  '/admin/inventario/insumos':     'Insumos',
  '/admin/inventario/compras':     'Registro de Compras',
  '/admin/reportes':     'Reportes',
  '/admin/sucursales':   'Sucursales',
  '/admin/configuracion':'Configuración',
}

interface Props { nombreUsuario: string }

export default function AdminHeader({ nombreUsuario }: Props) {
  const pathname = usePathname()
  const title = pageNames[pathname] ?? 'Panel Admin'

  const now = new Date()
  const hora = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
  const fecha = now.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  function handleOpenSidebar() {
    window.dispatchEvent(new Event('toggle-sidebar'))
  }

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={handleOpenSidebar}
          title="Abrir Menú"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="admin-header-title">{title}</h1>
          <span className="admin-header-date">{fecha} · {hora}</span>
        </div>
      </div>

      <div className="admin-header-right">
        <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <NotificacionesBell />
        <div className="admin-header-user">
          <span className="admin-header-greeting">Hola, <strong>{nombreUsuario}</strong></span>
          <div className="admin-header-avatar">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <style>{`
        .admin-header {
          height: auto;
          min-height: var(--header-h);
          background: transparent;
          border-bottom: none;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 24px 32px 12px;
          position: relative;
          z-index: 50;
          gap: 16px;
        }
        .admin-header-left { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
        }
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-200);
          padding: 8px;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .admin-header { padding: 0 16px; }
          .mobile-menu-btn { display: flex; }
          .admin-header-date { display: none; }
          .admin-header-greeting { display: none; }
        }
        .admin-header-title {
          font-size: 2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .admin-header-title {
          margin-bottom: 2px;
        }
        .admin-header-date {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.95);
          text-transform: capitalize;
          font-weight: 500;
        }
        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-header-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-header-greeting {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.9);
        }
        .admin-header-greeting strong {
          color: #ffffff;
          font-weight: 700;
        }
        .theme-toggle {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #ffffff;
          padding: 8px;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .theme-toggle:hover {
          background: rgba(255,255,255,0.2);
        }
        .admin-header-avatar {
          width: 40px; height: 40px;
          border-radius: 50%;
          background: #ffffff;
          color: #F05B17;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </header>
  )
}
