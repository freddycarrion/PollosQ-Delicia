'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, Building2, User, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import NuevaCompraModal from './NuevaCompraModal'
import { toast } from 'react-hot-toast'

interface Compra {
  id: string
  sucursal_id: string
  proveedor_id: string | null
  registrado_por: string
  numero_factura: string | null
  total: number
  observaciones: string | null
  fecha_compra: string
  created_at: string
  sucursales?: { nombre: string }
  proveedores?: { nombre: string }
  perfiles?: { nombre: string, apellido: string }
}

interface DetalleCompra {
  id: string
  compra_id: string
  insumo_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  insumos?: { nombre: string, unidad: string }
}

interface Props {
  initialData: Compra[]
  sucursales: any[]
  proveedores: any[]
  insumos: any[]
}

export default function ComprasClient({ initialData, sucursales, proveedores, insumos }: Props) {
  const router = useRouter()
  const [compras, setCompras] = useState<Compra[]>(initialData || [])

  useEffect(() => {
    setCompras(initialData || [])
  }, [initialData])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroMes, setFiltroMes] = useState<string>('')

  const handleSuccess = (nuevaCompra: any) => {
    // Optimistic UI: agregamos la nueva compra al instante
    setCompras([nuevaCompra, ...compras])
    router.refresh() // refresca los datos en segundo plano
  }

  const handleVerDetalles = (c: Compra) => {
    // Para simplificar, en vez de otro modal grande, mostramos un resumen rápido por toast
    // o en una futura iteración se haría una vista detalle `/admin/inventario/compras/[id]`
    toast('\`Detalles de compra estarán en la siguiente actualización.\`', { icon: 'ℹ️' })
  }

  const filteredCompras = compras.filter(c => {
    // Filtro por mes
    if (filtroMes && c.fecha_compra.slice(0, 7) !== filtroMes) return false
    // Filtro por búsqueda de texto
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (c.numero_factura && c.numero_factura.toLowerCase().includes(term)) ||
      (c.proveedores?.nombre && c.proveedores.nombre.toLowerCase().includes(term)) ||
      (c.sucursales?.nombre && c.sucursales.nombre.toLowerCase().includes(term))
    )
  })

  const totalFiltrado = filteredCompras.reduce((sum, c) => sum + Number(c.total), 0)

  return (
    <div className="compras-client animate-fade-in">
      <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        
        {/* Buscador */}
        <div className="search-box" style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input 
            type="text" 
            placeholder="Buscar por factura, proveedor o sucursal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              background: 'var(--bg-900)', 
              border: '1px solid var(--border)',
              padding: '12px 16px 12px 42px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-100)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Filtro por mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '0 16px', height: '46px' }}>
          <Calendar size={16} style={{ color: 'var(--text-400)', flexShrink: 0 }} />
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-100)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="" style={{ background: '#1a1a2e' }}>📅 Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date()
              d.setDate(1)
              d.setMonth(d.getMonth() - i)
              const val   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              const label = d.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })
              return <option key={val} value={val} style={{ background: '#1a1a2e' }}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
            })}
          </select>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '0.95rem' }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} /> Registrar Nueva Compra
        </button>
      </div>

      {/* Resumen del mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 20px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ color: 'var(--text-400)', fontSize: '0.9rem', fontWeight: 600 }}>
          {filteredCompras.length} compra{filteredCompras.length !== 1 ? 's' : ''} en el período
        </span>
        <span style={{ color: '#4CAF50', fontWeight: 900, fontSize: '1.15rem', fontFamily: 'monospace' }}>
          Total invertido: {totalFiltrado.toFixed(2)} Bs
        </span>
      </div>

      <div className="compras-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredCompras.map(compra => {
          const fechaFormateada = new Date(compra.fecha_compra).toLocaleDateString('es-BO', { 
            day: '2-digit', month: 'short', year: 'numeric' 
          })

          const registradoNombre = compra.perfiles 
            ? `${compra.perfiles.nombre} ${compra.perfiles.apellido}` 
            : 'Sistema'

          return (
            <div key={compra.id} className="compra-card" style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', transition: 'var(--transition)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 200px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-400)' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {compra.numero_factura ? `Factura #${compra.numero_factura}` : 'Comprobante S/N'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-500)', fontSize: '0.85rem', marginTop: '4px' }}>
                    <Calendar size={14} /> {fechaFormateada}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: '2 1 300px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-600)', fontWeight: 700, marginBottom: '2px' }}>Proveedor / Origen</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-200)' }}>
                    <Building2 size={16} className="text-yellow" style={{ color: 'var(--yellow)' }} />
                    {compra.proveedores?.nombre || 'Proveedor Varios'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-600)', fontWeight: 700, marginBottom: '2px' }}>Registrado por</div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-200)' }}>
                    <User size={16} />
                    {registradoNombre} ({compra.sucursales?.nombre})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flex: '1 1 auto' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-600)', fontWeight: 700, marginBottom: '2px' }}>Total Invertido</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4CAF50', letterSpacing: '-0.5px' }}>
                    {Number(compra.total).toFixed(2)} Bs
                  </div>
                </div>
                
                <button 
                  className="btn btn-ghost" 
                  onClick={() => handleVerDetalles(compra)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', color: 'var(--text-400)' }}
                  title="Detalles (Próximamente)"
                >
                  <Eye size={20} />
                </button>
              </div>

            </div>
          )
        })}

        {filteredCompras.length === 0 && (
          <div className="empty-state" style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-800)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--text-400)', fontSize: '1.1rem' }}>No hay compras registradas con esos filtros.</p>
          </div>
        )}
      </div>

      <NuevaCompraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sucursales={sucursales}
        proveedores={proveedores}
        insumos={insumos}
        onSuccess={handleSuccess}
      />

      <style>{`
        .search-box input:focus { border-color: var(--yellow) !important; color: var(--text-100); }
        .compra-card:hover { border-color: var(--text-400) !important; }
        @media (max-width: 640px) {
          .toolbar { flex-direction: column; align-items: stretch !important; }
          .search-box { max-width: 100% !important; }
          .compra-card { flex-direction: column !important; }
        }
      `}</style>
    </div>
  )
}
