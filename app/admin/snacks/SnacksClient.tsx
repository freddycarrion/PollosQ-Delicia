'use client'

import { useEffect, useRef, useState } from 'react'
import { Cookie, RefreshCw, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { listarSnacks, guardarStockSnack } from './actions'
import type { StockSnack } from '@/lib/snacks'

export default function SnacksClient({ sucursales, sucursalInicial }: {
  sucursales: { id: string; nombre: string }[]; sucursalInicial: string
}) {
  const [sucursal, setSucursal] = useState(sucursalInicial)
  const [productos, setProductos] = useState<StockSnack[]>([])
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)
  const bloqueo = useRef(false)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    setProductos([])
    if (!sucursal) { setCargando(false); return }
    listarSnacks(sucursal).then(result => {
      if (!vigente) return
      setError(result.error || '')
      setProductos(result.data || [])
      setCantidades(Object.fromEntries((result.data || []).map(p => [p.producto_id, String(p.cantidad)])))
    }).catch(() => { if (vigente) setError('No se pudo conectar. Vuelve a actualizar el listado.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [sucursal, recarga])

  async function guardar(producto: StockSnack) {
    if (bloqueo.current) return
    const valor = cantidades[producto.producto_id]
    if (!valor?.trim()) { toast.error('Ingresa la cantidad disponible.'); return }
    bloqueo.current = true
    setGuardando(producto.producto_id)
    try {
      const result = await guardarStockSnack(sucursal, producto.producto_id, Number(valor), producto.version)
      if (!result.data) { toast.error(result.error || 'No se pudo guardar.'); return }
      const stock = result.data
      setProductos(prev => prev.map(p => p.producto_id === producto.producto_id ? { ...p, ...stock } : p))
      toast.success(`Stock de ${producto.nombre} actualizado`)
    } catch { toast.error('No se pudo confirmar el guardado. Actualiza antes de reintentar.') }
    finally { bloqueo.current = false; setGuardando(null) }
  }

  return <div className="admin-page animate-fade-in">
    <h1 className="page-title"><Cookie size={28} /> Snacks</h1>
    <p style={{ color: 'var(--text-400)', margin: '12px 0 24px' }}>Carga la cantidad total disponible por producto y sucursal. Las ventas descuentan unidades automáticamente y el stock se conserva entre turnos.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
      <label>Sucursal <select aria-label="Sucursal" disabled={!!guardando} value={sucursal} onChange={e => setSucursal(e.target.value)} className="form-input">
        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select></label>
      <button className="btn btn-ghost" disabled={cargando || !!guardando} onClick={() => setRecarga(n => n + 1)}><RefreshCw size={16} /> Actualizar</button>
    </div>
    {error && <p role="alert" style={{ color: 'var(--red)', padding: 16 }}>{error}</p>}
    {cargando ? <p>Cargando snacks…</p> : !error && !productos.length ? <p>No hay productos en la categoría Snacks para mostrar.</p> :
      <div style={{ overflowX: 'auto', background: 'var(--bg-800)', borderRadius: 16, border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Producto', 'Stock registrado', 'Cantidad disponible', 'Acción'].map(t => <th key={t} style={{ textAlign: 'left', padding: 16 }}>{t}</th>)}</tr></thead>
          <tbody>{productos.map(p => <tr key={p.producto_id} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: 16 }}>{p.nombre}{!p.disponible && <small style={{ display: 'block' }}>No disponible en el menú</small>}</td>
            <td style={{ padding: 16 }}>{p.cantidad === 0 ? 'Agotado' : `${p.cantidad} unidades`}</td>
            <td style={{ padding: 16 }}><input className="form-input" style={{ width: 130 }} aria-label={`Cantidad de ${p.nombre}`} type="number" min="0" step="1" disabled={!!guardando} value={cantidades[p.producto_id] ?? ''} onChange={e => setCantidades(prev => ({ ...prev, [p.producto_id]: e.target.value }))} /></td>
            <td style={{ padding: 16 }}><button className="btn btn-primary" disabled={!!guardando} onClick={() => guardar(p)}><Save size={16} />{guardando === p.producto_id ? 'Guardando…' : 'Guardar'}</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
  </div>
}
