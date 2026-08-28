'use client'

import { useState } from 'react'
import { Plus, Edit2, AlertTriangle, Package, MapPin, Tag, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import InsumoModal from './InsumoModal'

interface Sucursal {
  id: string
  nombre: string
}

interface Insumo {
  id: string
  sucursal_id: string
  nombre: string
  descripcion: string | null
  unidad: 'kg' | 'g' | 'litro' | 'ml' | 'unidad' | 'docena' | 'caja'
  stock_actual: number
  stock_minimo: number
  precio_referencia: number | null
  activo: boolean
  sucursales?: { nombre: string }
}

interface Props {
  initialData: Insumo[]
  sucursales: Sucursal[]
}

export default function InsumosClient({ initialData, sucursales }: Props) {
  const router = useRouter()
  const insumos = initialData || []

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all')
  
  const handleSuccess = () => {
    router.refresh()
  }

  const handleToggleEstado = async (i: Insumo) => {
    const supabase = createClient()
    const nuevoEstado = !i.activo
    try {
      const { error } = await supabase
        .from('insumos')
        .update({ activo: nuevoEstado })
        .eq('id', i.id)
      
      if (error) throw error
      toast.success(nuevoEstado ? 'Insumo activado' : 'Insumo inhabilitado')
      router.refresh()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const filteredInsumos = selectedSucursal === 'all' 
    ? insumos 
    : insumos.filter(i => i.sucursal_id === selectedSucursal)

  return (
    <div className="insumos-client animate-fade-in">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        
        {/* Filtro Sucursal */}
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-yellow" style={{ color: 'var(--yellow)' }} />
          <select 
            className="filter-select"
            value={selectedSucursal}
            onChange={(e) => setSelectedSucursal(e.target.value)}
          >
            <option value="all">Todas las sucursales</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '0.95rem' }}
          onClick={() => {
            setEditingInsumo(null)
            setIsModalOpen(true)
          }}
        >
          <Plus size={18} /> Nuevo Insumo
        </button>
      </div>

      <div className="insumos-grid">
        {filteredInsumos.map(insumo => {
          const isLowStock = insumo.stock_actual <= insumo.stock_minimo
          const precentage = insumo.stock_minimo > 0 ? (insumo.stock_actual / insumo.stock_minimo) * 100 : 100
          
          return (
            <div key={insumo.id} className={`insumo-card ${!insumo.activo ? 'inactivo' : ''} ${isLowStock && insumo.activo ? 'alerta' : ''}`}>
              {/* Header */}
              <div className="card-header">
                 <div className="header-titles">
                   <h3 className="s-name" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                     {isLowStock && insumo.activo ? <AlertTriangle size={18} style={{ color: 'var(--red-light)', flexShrink: 0, marginTop: '2px' }} /> : <Package size={18} style={{ color: 'var(--text-400)', flexShrink: 0, marginTop: '2px' }} />}
                     {insumo.nombre}
                   </h3>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-500)', marginTop: '4px' }}>
                     {insumo.sucursales?.nombre || 'Sucursal no asignada'}
                   </div>
                 </div>
                 <div className="card-actions">
                   <button 
                     className="btn-icon-soft"
                     onClick={() => {
                       setEditingInsumo(insumo)
                       setIsModalOpen(true)
                     }}
                     title="Editar insumo"
                   >
                     <Edit2 size={16} />
                   </button>
                 </div>
              </div>

              {/* Body */}
              <div className="card-body">
                <div className="stock-container">
                  <div className="stock-info">
                    <span className="stock-label">Stock Actual</span>
                    <div className="stock-value" style={{ color: isLowStock ? 'var(--red-light)' : 'var(--text-100)' }}>
                      {insumo.stock_actual} <span className="stock-unit">{insumo.unidad}</span>
                    </div>
                  </div>
                  <div className="stock-info" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                    <span className="stock-label text-yellow">Stock Mínimo</span>
                    <div className="stock-value">
                      {insumo.stock_minimo} <span className="stock-unit">{insumo.unidad}</span>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso visual para el stock basado en el minimo */}
                <div className="progress-bg">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(precentage, 100)}%`,
                      background: isLowStock ? 'var(--red)' : '#4CAF50'
                    }} 
                  />
                </div>

                {isLowStock && insumo.activo && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--red-light)', margin: 0, fontWeight: 600 }}>
                    ¡Stock Crítico! Necesitas reabastecer.
                  </p>
                )}

                {(insumo.precio_referencia || insumo.descripcion) && (
                  <div className="extra-info">
                     {insumo.precio_referencia ? (
                       <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                         <Tag size={12}/> Ref: {insumo.precio_referencia} Bs.
                       </span>
                     ) : null}
                     {insumo.descripcion && <p className="i-desc">{insumo.descripcion}</p>}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="card-footer">
                <button 
                  onClick={() => handleToggleEstado(insumo)}
                  className={`btn-toggle-status ${insumo.activo ? 'desactivar' : 'activar'}`}
                >
                  {insumo.activo ? 'Inhabilitar / No usar más' : 'Activar Insumo'}
                </button>
              </div>
            </div>
          )
        })}

        {filteredInsumos.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: 'var(--bg-800)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--text-400)', fontSize: '1.1rem' }}>No se encontraron insumos.</p>
            <button 
                className="btn btn-primary" 
                style={{ marginTop: '16px' }}
                onClick={() => {
                  setEditingInsumo(null)
                  setIsModalOpen(true)
                }}
              >
              Crear primer insumo
            </button>
          </div>
        )}
      </div>

      <InsumoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        insumoToEdit={editingInsumo}
        sucursales={sucursales}
        onSuccess={handleSuccess}
      />

      <style>{`
        .filter-select {
          background: var(--bg-900);
          border: 1px solid var(--border);
          color: var(--text-100);
          padding: 8px 16px;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.9rem;
          outline: none;
          max-width: 250px;
        }

        .insumos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
          gap: 20px;
        }

        .insumo-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          transition: var(--transition);
        }
        .insumo-card:hover { border-color: var(--text-400); }
        .insumo-card.alerta { border-color: rgba(239, 83, 80, 0.4); background: rgba(239, 83, 80, 0.03); }
        .insumo-card.alerta:hover { border-color: var(--red); box-shadow: 0 10px 30px rgba(239,83,80,0.15); }
        .insumo-card.inactivo { opacity: 0.6; filter: grayscale(0.8); border-color: var(--border); }
        
        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: rgba(255,255,255,0.02);
        }
        .insumo-card.alerta .card-header { border-bottom-color: rgba(239, 83, 80, 0.2); }
        .s-name { font-size: 1.1rem; font-weight: 800; color: var(--text-100); margin-bottom: 2px; }
        
        .btn-icon-soft {
          background: transparent; border: none; color: var(--text-500); width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md);
          cursor: pointer; transition: var(--transition); margin-top: -6px; margin-right: -10px;
        }
        .btn-icon-soft:hover { background: rgba(255,255,255,0.05); color: var(--text-200); }

        .card-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; flex: 1; }
        
        .stock-container { display: flex; justify-content: space-between; align-items: flex-end; }
        .stock-info { display: flex; flex-direction: column; gap: 4px; }
        .stock-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-500); letter-spacing: 0.05em; }
        .stock-label.text-yellow { color: var(--yellow); opacity: 0.8; }
        .stock-value { font-size: 1.5rem; font-weight: 900; line-height: 1; }
        .stock-unit { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: var(--text-500); }

        .progress-bg { width: 100%; height: 6px; background: var(--bg-900); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

        .extra-info {
          margin-top: 4px;
          padding-top: 14px;
          border-top: 1px dashed var(--border);
          font-size: 0.8rem;
          color: var(--text-400);
          display: flex; flex-direction: column; gap: 8px;
        }
        .i-desc { color: var(--text-500); font-style: italic; margin: 0; line-height: 1.3;}

        .card-footer {
          padding: 12px 20px;
          border-top: 1px solid var(--border);
          background: var(--bg-900);
          border-bottom-left-radius: var(--radius-xl);
          border-bottom-right-radius: var(--radius-xl);
        }
        .insumo-card.alerta .card-footer { border-top-color: rgba(239, 83, 80, 0.2); }
        
        .btn-toggle-status {
          width: 100%; border: none; background: transparent; font-size: 0.8rem; font-weight: 600; padding: 4px 0;
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
