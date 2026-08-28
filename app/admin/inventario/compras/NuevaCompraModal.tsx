'use client'

import { useState, useEffect } from 'react'
import { X, Check, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { registrarCompraAccion } from './actions'

interface Proveedor { id: string, nombre: string }
interface Insumo { id: string, nombre: string, unidad: string, sucursal_id: string }
interface Sucursal { id: string, nombre: string }

interface CartItem {
  insumo: Insumo
  cantidad: number
  precio_unitario: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  sucursales: any[]
  proveedores: any[]
  insumos: Insumo[]
  onSuccess: (compra: any) => void
}

export default function NuevaCompraModal({ isOpen, onClose, sucursales, proveedores, insumos, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  
  const [sucursalId, setSucursalId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [factura, setFactura] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Selección de Insumo temporal
  const [selectedInsumoId, setSelectedInsumoId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precioUnidad, setPrecioUnidad] = useState(0)

  // Carrito de compras
  const [cart, setCart] = useState<CartItem[]>([])

  const handleReset = () => {
    setProveedorId('')
    setFactura('')
    setObservaciones('')
    setCart([])
    setSelectedInsumoId('')
    setCantidad(1)
    setPrecioUnidad(0)
  }

  useEffect(() => {
    if (isOpen) {
      if (sucursales.length > 0) setSucursalId(sucursales[0].id)
      handleReset()
    }
  }, [isOpen, sucursales])

  if (!isOpen) return null

  const getFilteredInsumos = () => insumos.filter(i => i.sucursal_id === sucursalId)

  const handleAddInsumo = () => {
    if (!selectedInsumoId) return toast.error('Selecciona un insumo')
    if (cantidad <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (precioUnidad < 0) return toast.error('El precio no puede ser negativo')

    const insumoItem = insumos.find(i => i.id === selectedInsumoId)
    if (!insumoItem) return

    // Revisar si ya está en el carrito
    const curIdx = cart.findIndex(c => c.insumo.id === selectedInsumoId)
    if (curIdx >= 0) {
      const newCart = [...cart]
      newCart[curIdx].cantidad += Number(cantidad)
      newCart[curIdx].precio_unitario = Number(precioUnidad) // actualiza precio
      setCart(newCart)
    } else {
      setCart([...cart, { insumo: insumoItem, cantidad: Number(cantidad), precio_unitario: Number(precioUnidad) }])
    }

    // Reset miniform
    setSelectedInsumoId('')
    setCantidad(1)
    setPrecioUnidad(0)
  }

  const removeCartItem = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx))
  }

  const total = cart.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return toast.error('Debes agregar al menos un insumo a la compra')
    if (!sucursalId) return toast.error('Debes seleccionar una sucursal')

    setLoading(true)

    try {
      const total = cart.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0)

      const compraData = {
        sucursal_id: sucursalId,
        proveedor_id: proveedorId || null,
        numero_factura: factura || null,
        total: total,
        observaciones: observaciones || null
      }

      const detallesData = cart.map(item => ({
        insumo_id: item.insumo.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario
      }))

      const nuevaCompraBackend = await registrarCompraAccion(compraData, detallesData)

      // Optimistic UI: Preparamos el objeto completo para la tabla inmediatamente
      const sucursalSelec = sucursales.find(s => s.id === sucursalId)
      const proveedorSelec = proveedores.find(p => p.id === proveedorId)
      
      const compraCompleta = {
        ...nuevaCompraBackend,
        sucursales: sucursalSelec ? { nombre: sucursalSelec.nombre } : undefined,
        proveedores: proveedorSelec ? { nombre: proveedorSelec.nombre } : undefined,
      }

      toast.success('¡Compra registrada exitosamente!\nEl stock fue actualizado.')
      handleReset()
      onSuccess(compraCompleta)
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-4xl animate-zoom-in">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart className="text-yellow" size={24} style={{ color: 'var(--yellow)' }} />
            Registrar Nueva Compra
          </h2>
          <button className="md-close-btn" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        <div className="modal-body compra-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
          
          {/* Header data */}
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Sucursal de Destino *</label>
              <select className="form-input" value={sucursalId} onChange={e => { setSucursalId(e.target.value); setCart([]); }} disabled={cart.length > 0}>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              {cart.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-500)', marginTop: '2px' }}>Vacía la lista para cambiar</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Proveedor (Opcional)</label>
              <select className="form-input" value={proveedorId} onChange={e => setProveedorId(e.target.value)}>
                <option value="">-- Sin proveedor / Varios --</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nº Factura / Recibo (Opcional)</label>
              <input type="text" className="form-input" value={factura} onChange={e => setFactura(e.target.value)} placeholder="Ej. 001-492" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* Buscador de insumos */}
            <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-800)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Agregar Insumos</h3>
              
              <div className="form-group">
                <label className="form-label">Seleccionar Insumo *</label>
                <select className="form-input" value={selectedInsumoId} onChange={e => setSelectedInsumoId(e.target.value)}>
                  <option value="">-- Elige un insumo --</option>
                  {getFilteredInsumos().map(ins => (
                    <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Cantidad Comprada</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={cantidad} onChange={e => setCantidad(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Unitario (Bs)</label>
                  <input type="number" min="0" step="0.5" className="form-input" value={precioUnidad} onChange={e => setPrecioUnidad(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleAddInsumo}
                disabled={!selectedInsumoId || cantidad <= 0}
                style={{ marginTop: '8px' }}
              >
                + Añadir a la lista
              </button>
            </div>

            {/* Carrito de comprobantes */}
            <div style={{ flex: '2', minWidth: '350px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Detalle de la Compra</h3>
                <span className="badge badge-yellow" style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(253,216,53,0.1)', color: '#FDD835' }}>
                  {cart.length} items
                </span>
              </div>
              
              <div style={{ flex: 1, minHeight: '150px', background: 'var(--bg-900)', overflowY: 'auto' }}>
                {cart.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-500)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    La lista está vacía. Añade insumos con el panel lateral.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-800)', color: 'var(--text-400)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '8px 12px' }}>Producto</th>
                        <th style={{ padding: '8px 12px' }}>Cant.</th>
                        <th style={{ padding: '8px 12px' }}>P. Uni</th>
                        <th style={{ padding: '8px 12px' }}>Subtotal</th>
                        <th style={{ padding: '8px 12px', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px' }}>{item.insumo.nombre}</td>
                          <td style={{ padding: '8px 12px' }}>{item.cantidad} <span style={{fontSize:'0.7rem', color:'var(--text-500)'}}>{item.insumo.unidad}</span></td>
                          <td style={{ padding: '8px 12px' }}>{item.precio_unitario.toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{(item.cantidad * item.precio_unitario).toFixed(2)} Bs</td>
                          <td style={{ padding: '8px 12px' }}>
                            <button onClick={() => removeCartItem(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--red-light)', cursor: 'pointer' }}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Totales */}
              <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-400)' }}>Total General:</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--yellow)', letterSpacing: '-0.5px' }}>
                  {total.toFixed(2)} Bs.
                </span>
              </div>
            </div>

          </div>

          <div className="form-group" style={{ marginTop: '-8px' }}>
            <label className="form-label">Observaciones Adicionales</label>
            <input type="text" className="form-input" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Ej. Compra realizada en efectivo para reabastecimiento urgente" />
          </div>

        </div>

        <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading || cart.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} />
            {loading ? 'Procesando...' : 'Confirmar Registro de Compra'}
          </button>
        </div>

      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .modal-panel {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%; max-width: 900px;
          max-height: 90vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-title { font-size: 1.2rem; font-weight: 800; color: var(--text-100); }
        .md-close-btn { background: transparent; border: none; color: var(--text-400); cursor: pointer; }
        .md-close-btn:hover { color: var(--red); }
        
        .modal-body { overflow-y: auto; }
        
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
        .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
