'use client'

import { useEffect, useRef, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { obtenerDetalleCompra, type DetalleCompraVista } from './actions'

const dinero = (n: number) => n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cantidad = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 3 })

export default function DetalleCompraModal({ compraId, onClose }: { compraId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [compra, setCompra] = useState<DetalleCompraVista | null>(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => { dialog.current?.showModal() }, [])
  useEffect(() => {
    let vigente = true
    setCompra(null)
    setError('')
    obtenerDetalleCompra(compraId).then(result => {
      if (!vigente) return
      if (result.data) setCompra(result.data)
      else setError(result.error || 'No se encontró el detalle de esta compra.')
    }).catch(() => { if (vigente) setError('No se pudo cargar la compra. Revisa tu conexión y vuelve a intentar.') })
    return () => { vigente = false }
  }, [compraId, intento])

  return <dialog ref={dialog} aria-labelledby="detalle-compra-titulo" onCancel={onClose} className="detalle-compra-dialog">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid var(--border)' }}>
      <h2 id="detalle-compra-titulo" style={{ fontSize: '1.2rem', fontWeight: 800 }}>Detalle de compra{compra ? ` · ${compra.numero_factura || 'S/N'}` : ''}</h2>
      <button className="btn btn-ghost" aria-label="Cerrar detalle de compra" onClick={onClose}><X size={20} /></button>
    </div>
    <div style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh' }}>
      {error ? <div role="alert"><p>{error}</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setIntento(n => n + 1)}><RefreshCw size={16} /> Reintentar</button></div> : !compra ? <p role="status">Cargando detalle de compra…</p> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div><strong>Fecha</strong><p>{new Date(`${compra.fecha_compra}T12:00:00`).toLocaleDateString('es-BO')}</p></div>
          <div><strong>Proveedor / Origen</strong><p>{compra.proveedor}</p></div>
          <div><strong>Sucursal</strong><p>{compra.sucursal}</p></div>
          <div><strong>Registrado por</strong><p>{compra.registradoPor}</p></div>
        </div>
        {compra.articulos.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead><tr>{['Artículo', 'Cantidad', 'Precio unitario', 'Subtotal'].map(t => <th key={t} style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{t}</th>)}</tr></thead>
          <tbody>{compra.articulos.map(a => <tr key={a.id}>
            <td style={{ padding: 12 }}>{a.nombre}</td><td style={{ padding: 12, whiteSpace: 'nowrap' }}>{cantidad(a.cantidad)} {a.unidad}</td>
            <td style={{ padding: 12, whiteSpace: 'nowrap' }}>Bs. {dinero(a.precio_unitario)}</td><td style={{ padding: 12, whiteSpace: 'nowrap' }}>Bs. {dinero(a.subtotal)}</td>
          </tr>)}</tbody>
        </table></div> : <p>No hay artículos guardados para esta compra.</p>}
        <p style={{ marginTop: 20, textAlign: 'right', color: '#4CAF50', fontSize: '1.2rem', fontWeight: 800 }}>Total registrado: Bs. {dinero(compra.total)}</p>
        {compra.observaciones && <div style={{ marginTop: 20 }}><strong>Observaciones</strong><p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{compra.observaciones}</p></div>}
      </>}
    </div>
    <style>{`.detalle-compra-dialog { margin: auto; width: min(900px, calc(100% - 32px)); max-height: 90vh; padding: 0; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-800); color: var(--text-100); box-shadow: 0 24px 80px rgba(0,0,0,.4); } .detalle-compra-dialog::backdrop { background: rgba(0,0,0,.65); backdrop-filter: blur(4px); }`}</style>
  </dialog>
}
