'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, ArrowLeft, Clock, Moon, Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CerrarTurnoModal from './CerrarTurnoModal'
import ComunicadosBell from './ComunicadosBell'

interface Props {
  children: React.ReactNode
  nombreUsuario: string
  esAdmin: boolean
  rol: string
  sucursal: string
  turnoId?: string
}

export default function PosSidebarHeader({ children, nombreUsuario, esAdmin, rol, sucursal, turnoId }: Props) {
  const router = useRouter()
  const [isCerrarModalOpen, setIsCerrarModalOpen] = useState(false)

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isDark = localStorage.getItem('pos-dark-mode') === 'true'
      if (isDark) {
        document.documentElement.classList.add('pos-dark')
      }
      return isDark
    }
    return false
  })

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('pos-dark-mode', String(next))
      if (next) document.documentElement.classList.add('pos-dark')
      else document.documentElement.classList.remove('pos-dark')
      return next
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="pos-layout">
      {/* Top Header */}
      <header className="pos-header">
        <div className="pos-header-left">
          <div className="pos-logo-wrap">
            <Image src="/logo.png" alt="Pollos Q' Delicia" width={40} height={40} className="pos-logo" />
          </div>
          <div className="pos-brand">
            <h1 className="pos-title">Pollos Q' Delicia</h1>
            <span className="pos-subtitle">Punto de Venta</span>
          </div>
        </div>

        <div className="pos-header-right">
          <div className="pos-store-info">
            <span className="pos-store-name">{sucursal}</span>
          </div>

          {turnoId ? (
            <button 
              className="pos-shift-status animate-fade-in" 
              style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(4px)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}
              onClick={() => setIsCerrarModalOpen(true)}
              title="Cerrar Turno"
            >
              <Clock size={14} />
              <span>Turno Abierto</span>
            </button>
          ) : (
            <div className="pos-shift-status" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.15)' }}>
              <Clock size={14} />
              <span>Caja Cerrada</span>
            </div>
          )}

          <div className="pos-user">
            <div className="pos-avatar">{nombreUsuario.charAt(0).toUpperCase()}</div>
            <div className="pos-user-details">
              <span className="pos-user-name">{nombreUsuario}</span>
              <span className="pos-user-role">{rol === 'admin' ? 'Administrador' : rol === 'supervisor' ? 'Supervisor' : 'Cajero'}</span>
            </div>
          </div>

          <div className="pos-actions">
            <button 
              onClick={toggleDarkMode}
              className="btn-pos-dark"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <ComunicadosBell rol={rol} />
            {esAdmin && (
              <button onClick={() => router.push('/admin/dashboard')} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }} title="Volver al Admin">
                <ArrowLeft size={16} /> Admin
              </button>
            )}
            <button onClick={handleLogout} className="btn-pos-logout" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content (The POS interface) */}
      <main className="pos-main">
        {children}
      </main>

      {turnoId && (
        <CerrarTurnoModal 
          isOpen={isCerrarModalOpen} 
          onClose={() => setIsCerrarModalOpen(false)} 
          turnoId={turnoId} 
          cajeroNombre={nombreUsuario}
          cajeroRol={rol}
        />
      )}

      <style>{`
        .pos-layout {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          background: var(--bg-900);
          overflow: hidden;
        }

        .pos-header {
          height: 68px;
          background: linear-gradient(135deg, #B71C1C 0%, #E65100 55%, #FBC02D 100%);
          border-bottom: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          flex-shrink: 0;
          z-index: 50;
          box-shadow: 0 4px 20px rgba(183,28,28,0.35);
        }

        .pos-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pos-logo-wrap {
          width: 42px; height: 42px;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          border: 2px solid rgba(255,255,255,0.4);
          backdrop-filter: blur(4px);
        }

        .pos-logo {
          object-fit: cover;
        }

        .pos-brand {
          display: flex;
          flex-direction: column;
        }

        .pos-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          letter-spacing: -0.02em;
          text-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .pos-subtitle {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.75);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          font-weight: 600;
        }

        .pos-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pos-store-info {
          display: flex;
          align-items: center;
          padding-right: 16px;
          border-right: 1px solid rgba(255,255,255,0.25);
        }

        .pos-store-name {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.85);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pos-shift-status {
          margin-left: 5px;
        }

        .pos-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 16px;
          border-left: 1px solid rgba(255,255,255,0.25);
        }

        .pos-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
          border: 2px solid rgba(255,255,255,0.4);
          backdrop-filter: blur(4px);
        }

        .pos-user-details {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .pos-user-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        
        .pos-user-role {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.75);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pos-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-pos-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.2);
          transition: var(--transition);
          backdrop-filter: blur(4px);
        }
        .btn-pos-logout:hover, .btn-pos-dark:hover {
          background: rgba(255,255,255,0.25);
          color: #fff;
          border-color: rgba(255,255,255,0.4);
        }

        .btn-pos-dark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.2);
          transition: var(--transition);
          backdrop-filter: blur(4px);
          cursor: pointer;
        }

        .pos-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        @media (max-width: 1024px) {
          .pos-store-info {
            display: none;
          }
          .pos-user-name {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .pos-header {
            padding: 0 12px;
          }
          .pos-store-info {
            display: none;
          }
          .pos-shift-status span {
            display: none;
          }
          .pos-shift-status {
            padding: 6px;
          }
          .pos-user-name {
            display: none;
          }
          .pos-user-role {
            font-size: 0.8rem;
          }
          .pos-brand .pos-subtitle {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
