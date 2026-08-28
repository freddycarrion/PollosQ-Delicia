'use client'

import { useState } from 'react'
import { Plus, Edit2, Phone, Briefcase, Mail, Building2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import ProveedorModal from './ProveedorModal'

interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  nit: string | null
  activo: boolean
}

interface Props {
  initialData: Proveedor[]
}

export default function ProveedoresClient({ initialData }: Props) {
  const router = useRouter()
  const proveedores = initialData || []

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  
  const handleSuccess = () => {
    router.refresh()
  }

  const handleToggleEstado = async (p: Proveedor) => {
    const supabase = createClient()
    const nuevoEstado = !p.activo
    try {
      const { error } = await supabase
        .from('proveedores')
        .update({ activo: nuevoEstado })
        .eq('id', p.id)
      
      if (error) throw error
      toast.success(nuevoEstado ? 'Proveedor activado' : 'Proveedor inhabilitado')
      router.refresh()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  return (
    <div className="proveedores-client animate-fade-in">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <button 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '0.95rem' }}
          onClick={() => {
            setEditingProveedor(null)
            setIsModalOpen(true)
          }}
        >
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      <div className="proveedores-grid">
        {proveedores.map(prov => (
          <div key={prov.id} className={`proveedor-card ${!prov.activo ? 'inactivo' : ''}`}>
            {/* Header Card */}
            <div className="card-header">
               <div className="header-titles">
                 <h3 className="s-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   {prov.nombre}
                 </h3>
                 <div className="s-status">
                   {prov.activo 
                     ? <span className="badge-status online"><CheckCircle2 size={12}/> Activo</span>
                     : <span className="badge-status offline"><AlertCircle size={12}/> Inactivo</span>
                   }
                 </div>
               </div>
               <div className="card-actions">
                 <button 
                   className="btn-icon-soft"
                   onClick={() => {
                     setEditingProveedor(prov)
                     setIsModalOpen(true)
                   }}
                   title="Editar proveedor"
                 >
                   <Edit2 size={16} />
                 </button>
               </div>
            </div>

            {/* Body Card */}
            <div className="card-body">
              {prov.contacto && (
                <div className="info-row">
                  <Briefcase size={16} className="info-icon" />
                  <div className="info-text">
                    <p className="info-title">Representante / Contacto</p>
                    <p className="info-val">{prov.contacto}</p>
                  </div>
                </div>
              )}

              {(prov.telefono || prov.email) && (
                <div className="info-row grid-small">
                  {prov.telefono && (
                    <div className="info-text">
                      <p className="info-title" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><Phone size={12}/> Teléfono</p>
                      <p className="info-val">{prov.telefono}</p>
                    </div>
                  )}
                  {prov.email && (
                    <div className="info-text">
                      <p className="info-title" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}><Mail size={12}/> Correo</p>
                      <p className="info-val" style={{ fontSize: '0.85rem' }}>{prov.email}</p>
                    </div>
                  )}
                </div>
              )}

              {prov.direccion && (
                <div className="info-row">
                  <Building2 size={16} className="info-icon" />
                  <div className="info-text">
                    <p className="info-title">Dirección</p>
                    <p className="info-val" style={{ fontSize: '0.85rem' }}>{prov.direccion}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="card-footer">
              <button 
                onClick={() => handleToggleEstado(prov)}
                className={`btn-toggle-status ${prov.activo ? 'desactivar' : 'activar'}`}
              >
                {prov.activo ? 'Inhabilitar / Suspender Proveedor' : 'Activar Proveedor'}
              </button>
            </div>
          </div>
        ))}

        {proveedores.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--bg-800)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--text-400)', fontSize: '1.1rem' }}>No tienes proveedores registrados en tu inventario.</p>
            <button 
                className="btn btn-primary" 
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setEditingProveedor(null)
                  setIsModalOpen(true)
                }}
              >
              Agregar el primer proveedor
            </button>
          </div>
        )}
      </div>

      <ProveedorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        proveedorToEdit={editingProveedor}
        onSuccess={handleSuccess}
      />

      <style>{`
        .proveedores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
          gap: 20px;
        }

        .proveedor-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          transition: var(--transition);
        }
        .proveedor-card:hover { border-color: var(--yellow); }
        .proveedor-card.inactivo { opacity: 0.7; filter: grayscale(0.5); border-color: var(--border); }
        
        .card-header {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: rgba(255,255,255,0.02);
        }
        .s-name { font-size: 1.15rem; font-weight: 800; color: var(--text-100); margin-bottom: 6px; }
        
        .badge-status {
          display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;
          border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .badge-status.online { background: rgba(76, 175, 80, 0.1); color: #4CAF50; border: 1px solid rgba(76,175,80,0.2); }
        .badge-status.offline { background: rgba(158, 158, 158, 0.1); color: #9E9E9E; border: 1px solid rgba(158,158,158,0.2); }

        .btn-icon-soft {
          background: transparent; border: none; color: var(--text-500); width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md);
          cursor: pointer; transition: var(--transition);
        }
        .btn-icon-soft:hover { background: rgba(255,255,255,0.05); color: var(--text-200); }

        .card-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .info-row { display: flex; align-items: flex-start; gap: 12px; }
        .grid-small { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; margin-left: -2px; }
        
        .info-icon { color: var(--text-500); margin-top: 2px; flex-shrink: 0; }
        .info-text { display: flex; flex-direction: column; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; }
        .info-title { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-500); margin-bottom: 4px; letter-spacing: 0.05em; }
        .info-val { font-size: 0.95rem; color: var(--text-200); font-weight: 500; }

        .card-footer {
          padding: 12px 20px;
          border-top: 1px dashed var(--border);
          background: var(--bg-900);
          border-bottom-left-radius: var(--radius-xl);
          border-bottom-right-radius: var(--radius-xl);
        }
        
        .btn-toggle-status {
          width: 100%; border: none; background: transparent; font-size: 0.85rem; font-weight: 600; padding: 6px 0;
          cursor: pointer; transition: var(--transition);
        }
        .btn-toggle-status.desactivar { color: var(--text-500); }
        .btn-toggle-status.desactivar:hover { color: var(--red); }
        .btn-toggle-status.activar { color: #4CAF50; }
        .btn-toggle-status.activar:hover { color: #66BB6A; }
      `}</style>
    </div>
  )
}
