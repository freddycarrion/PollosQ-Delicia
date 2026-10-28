'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

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
}

interface Sucursal {
  id: string
  nombre: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  insumoToEdit: Insumo | null
  sucursales: Sucursal[]
  onSuccess: () => void
}

export default function InsumoModal({ isOpen, onClose, insumoToEdit, sucursales, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sucursal_id: sucursales.length > 0 ? sucursales[0].id : '',
    nombre: '',
    descripcion: '',
    unidad: 'unidad',
    stock_actual: 0,
    stock_minimo: 0,
    precio_referencia: 0,
    activo: true,
  })

  useEffect(() => {
    if (insumoToEdit) {
      setFormData({
        sucursal_id: insumoToEdit.sucursal_id,
        nombre: insumoToEdit.nombre,
        descripcion: insumoToEdit.descripcion || '',
        unidad: insumoToEdit.unidad,
        stock_actual: insumoToEdit.stock_actual,
        stock_minimo: insumoToEdit.stock_minimo,
        precio_referencia: insumoToEdit.precio_referencia || 0,
        activo: insumoToEdit.activo,
      })
    } else {
      setFormData({
        sucursal_id: sucursales.length > 0 ? sucursales[0].id : '',
        nombre: '',
        descripcion: '',
        unidad: 'unidad',
        stock_actual: 0,
        stock_minimo: 5,
        precio_referencia: 0,
        activo: true,
      })
    }
  }, [insumoToEdit, isOpen, sucursales])

  useEffect(() => {
    if (!isOpen) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!formData.sucursal_id) return toast.error('Debes asignar una sucursal')

    setLoading(true)
    const supabase = createClient()

    try {
      if (insumoToEdit) {
        const { error } = await supabase
          .from('insumos')
          .update({
            sucursal_id: formData.sucursal_id,
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            unidad: formData.unidad,
            stock_actual: Number(formData.stock_actual),
            stock_minimo: Number(formData.stock_minimo),
            precio_referencia: Number(formData.precio_referencia) || null,
            activo: formData.activo,
            updated_at: new Date().toISOString()
          })
          .eq('id', insumoToEdit.id)
        if (error) throw error
        toast.success('Insumo actualizado')
      } else {
        const { error } = await supabase
          .from('insumos')
          .insert([{
            sucursal_id: formData.sucursal_id,
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            unidad: formData.unidad,
            stock_actual: Number(formData.stock_actual),
            stock_minimo: Number(formData.stock_minimo),
            precio_referencia: Number(formData.precio_referencia) || null,
            activo: formData.activo
          }])
        if (error) throw error
        toast.success('Insumo registrado')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="modal-backdrop insumo-backdrop">
      <div className="modal-panel animate-zoom-in" role="dialog" aria-modal="true" aria-labelledby="insumo-modal-titulo">
        <div className="modal-header">
          <h2 id="insumo-modal-titulo" className="modal-title">
            {insumoToEdit ? 'Editar Insumo' : 'Nuevo Insumo'}
          </h2>
          <button className="md-close-btn" aria-label="Cerrar formulario de insumo" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          
          <div className="form-group">
            <label className="form-label">Sucursal Asignada *</label>
            <select 
              className="form-input" 
              value={formData.sucursal_id} 
              onChange={e => setFormData({ ...formData, sucursal_id: e.target.value })}
              required
            >
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombre del Producto / Insumo *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Papas Prefritas"
                required 
                autoFocus
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Unidad de Medida *</label>
              <select 
                className="form-input"
                value={formData.unidad}
                onChange={e => setFormData({ ...formData, unidad: e.target.value as any })}
                required
              >
                <option value="kg">Kilos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="litro">Litros (l)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="unidad">Unidades / Piezas</option>
                <option value="docena">Docenas</option>
                <option value="caja">Cajas</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción (Opcional)</label>
            <textarea 
              className="form-input" 
              rows={2}
              placeholder="Ej. Bolsas de papas corte delgado 10mm"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--yellow)' }}>Stock Físico Actual *</label>
              <div className="input-with-suffix">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-input flex-1" 
                  required
                  value={formData.stock_actual}
                  onChange={e => setFormData({ ...formData, stock_actual: parseFloat(e.target.value) || 0 })}
                />
                <span className="suffix">{formData.unidad}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label text-red">Aviso de Stock Mínimo *</label>
              <div className="input-with-suffix">
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-input flex-1" 
                  required
                  value={formData.stock_minimo}
                  onChange={e => setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) || 0 })}
                />
                <span className="suffix">{formData.unidad}</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-500)', marginTop: '-8px', marginBottom: '8px' }}>
            El sistema te alertará cuando el stock actual sea menor o igual al stock mínimo.
          </p>

          <div className="form-group" style={{ maxWidth: '240px' }}>
            <label className="form-label">Precio Referencial de Compra (Bs.)</label>
            <input 
              type="number" 
              step="0.5"
              min="0"
              className="form-input" 
              placeholder="0.00"
              value={formData.precio_referencia}
              onChange={e => setFormData({ ...formData, precio_referencia: parseFloat(e.target.value) || 0 })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-600)', marginTop: '4px' }}>Para estimación de costos (Opcional)</span>
          </div>

          {insumoToEdit && (
            <div className="form-group">
              <label className="flex items-center gap-2 text-sm text-gray-300 font-medium" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.activo} 
                  onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--red)' }}
                />
                Insumo Activo 
              </label>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={18} />
              {loading ? 'Guardando...' : 'Guardar Insumo'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .insumo-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex; align-items: flex-start; justify-content: center;
          padding: clamp(8px, 3dvh, 24px) 12px 12px;
          overflow: hidden;
        }
        .insumo-backdrop .modal-panel {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%; max-width: 580px;
          max-height: calc(100dvh - clamp(8px, 3dvh, 24px) - 12px);
          min-height: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .insumo-backdrop .modal-header {
          flex-shrink: 0; margin-bottom: 0;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-title { font-size: 1.2rem; font-weight: 800; color: var(--text-100); }
        .md-close-btn { background: transparent; border: none; color: var(--text-400); cursor: pointer; }
        .md-close-btn:hover { color: var(--red); }
        .insumo-backdrop .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; min-height: 0; overscroll-behavior: contain; }
        .insumo-backdrop .form-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
        .insumo-backdrop .form-input { min-width: 0; max-width: 100%; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8rem; font-weight: 600; color: var(--text-400); text-transform: uppercase; letter-spacing: 0.05em; }
        
        .form-input { 
          background: var(--bg-900); 
          border: 1px solid var(--border); 
          color: var(--text-100); 
          padding: 10px 12px; 
          border-radius: var(--radius-md); 
          font-size: 0.95rem; 
        }
        .form-input:focus { border-color: var(--yellow); outline: none; }
        
        .input-with-suffix {
          display: flex;
          background: var(--bg-900);
          border: 1px solid var(--border); 
          border-radius: var(--radius-md); 
          overflow: hidden;
        }
        .input-with-suffix:focus-within { border-color: var(--yellow); }
        .input-with-suffix .form-input { border: none !important; border-radius: 0; }
        .input-with-suffix .suffix {
          background: var(--bg-700);
          color: var(--text-500);
          padding: 0 16px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          border-left: 1px solid var(--border);
        }

        .text-red { color: var(--red-light); }
        
        .insumo-backdrop .modal-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; border-top: 1px solid var(--border); padding-top: 20px; }
        
        @media (max-width: 500px) {
          .insumo-backdrop .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>,
    document.body
  )
}
