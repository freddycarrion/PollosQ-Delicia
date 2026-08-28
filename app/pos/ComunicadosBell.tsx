'use client'

import { useState } from 'react'
import { Bell, Megaphone } from 'lucide-react'
import { useComunicados } from '@/lib/hooks/useComunicados'
import toast from 'react-hot-toast'

interface Props {
  rol: string
}

export default function ComunicadosBell({ rol }: Props) {
  const [open, setOpen] = useState(false)
  const { comunicados, unseenCount, markAsSeen } = useComunicados(rol)

  const handleOpen = () => {
    setOpen(prev => !prev)
    if (!open && unseenCount > 0) markAsSeen()
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        className="btn btn-icon"
        onClick={handleOpen}
        style={{ position: 'relative', color: '#fff', padding: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(4px)' }}
        title="Comunicados del Administrador"
      >
        <Bell size={20} />
        {unseenCount > 0 && (
          <span className="animate-pulse" style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: 'var(--yellow)', color: '#000',
            borderRadius: '50%', width: '18px', height: '18px',
            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', border: '2px solid transparent'
          }}>
            {unseenCount > 9 ? '+9' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: '50px', right: '0', width: '350px',
          background: 'var(--bg-800)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          zIndex: 100, overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-900)' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-100)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Megaphone size={16} color="var(--yellow)" /> Avisos
            </h3>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {comunicados.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-500)', fontSize: '0.9rem' }}>
                <Bell size={32} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                No hay comunicados del administrador.
              </div>
            ) : (
              comunicados.map((c, i) => (
                <div key={c.id} style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border)',
                  background: i < unseenCount ? 'rgba(253, 216, 53, 0.05)' : 'transparent',
                  borderLeft: i < unseenCount ? '4px solid var(--yellow)' : '4px solid transparent'
                }}>
                  <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 800, marginBottom: '4px' }}>{c.titulo}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-300)', lineHeight: '1.4' }}>{c.mensaje}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-500)', marginTop: '8px' }}>
                    {new Date(c.created_at || c.fecha || Date.now()).toLocaleString('es-BO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
