'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Eye, Filter, CalendarDays, ShoppingBag, Receipt } from 'lucide-react'

interface DetalleVenta {
  id: string
  producto_id: string
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

interface Venta {
  id: string
  numero_ticket: number
  cajero_id: string
  sucursal_id: string
  subtotal: number
  descuento: number
  total: number
  metodo_pago: 'efectivo' | 'tarjeta' | 'qr' | 'transferencia'
  monto_recibido: number | null
  vuelto: number | null
  tipo_pedido: string
  estado: 'completada' | 'anulada' | 'pendiente'
  motivo_anulacion: string | null
  created_at: string
  perfiles: { nombre: string; apellido: string } | null
  sucursales: { nombre: string } | null
  detalle_ventas: DetalleVenta[]
}

interface Props {
  initialVentas: any[] // Mapped internally to Venta[]
}

export default function VentasClient({ initialVentas }: Props) {
  const ventas: Venta[] = initialVentas || []

  // Statics summary
  const ventasCompletadas = ventas.filter(v => v.estado === 'completada')
  const totalHoy = ventasCompletadas.reduce((acc, v) => acc + v.total, 0)
  const ticketsEmitidos = ventas.length
  const ticketPromedio = ticketsEmitidos > 0 ? totalHoy / ticketsEmitidos : 0

  // Routing para filtros
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  
  // Date filter state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateDesde, setDateDesde] = useState(searchParams.get('desde') || '')
  const [dateHasta, setDateHasta] = useState(searchParams.get('hasta') || '')

  const aplicarFiltroFechas = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (dateDesde) params.set('desde', dateDesde)
    else params.delete('desde')
    
    if (dateHasta) params.set('hasta', dateHasta)
    else params.delete('hasta')

    setShowDatePicker(false)
    router.push(`/admin/ventas?${params.toString()}`)
  }

  const limpiarFiltroFechas = () => {
    setDateDesde('')
    setDateHasta('')
    setShowDatePicker(false)
    router.push(`/admin/ventas`)
  }

  // Filtering
  const filtradas = ventas.filter(v => {
    const q = busqueda.toLowerCase()
    const nombre = ((v.perfiles?.nombre || '') + ' ' + (v.perfiles?.apellido || '')).toLowerCase()
    const num = v.numero_ticket.toString()
    
    return num.includes(q) || nombre.includes(q)
  })

  // FormatHelpers
  const fmt = (n: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n)

  // Metodo Label
  const getMetodoLabel = (m: string) => {
    switch (m) {
      case 'efectivo': return 'Efectivo'
      case 'qr': return 'Código QR'
      case 'tarjeta': return 'Tarjeta'
      case 'transferencia': return 'Transferencia'
      default: return m
    }
  }

  return (
    <div className="ventas-wrapper animate-fade-in">
      
      {/* Tarjetas de Resumen Rápido */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap bg-green/10 text-green">
             <CalendarDays size={24} />
          </div>
          <div className="stat-info">
             <p className="stat-label">Ventas Ingresadas (Historial)</p>
             <p className="stat-value font-mono text-green">Bs. {fmt(totalHoy)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap bg-blue/10 text-blue" style={{background: 'rgba(33, 150, 243, 0.1)', color: '#2196F3'}}>
             <Receipt size={24} />
          </div>
          <div className="stat-info">
             <p className="stat-label">Tickets Generados</p>
             <p className="stat-value font-mono text-white">{ticketsEmitidos}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap bg-yellow/10 text-yellow">
             <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
             <p className="stat-label">Ticket Promedio</p>
             <p className="stat-value font-mono text-yellow">Bs. {fmt(ticketPromedio)}</p>
          </div>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="data-table-section">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por Cajero o Nº de Ticket (#)..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              className={`btn ${searchParams.get('desde') ? 'btn-primary' : 'btn-ghost'} btn-icon`}
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Filter size={18} /> {searchParams.get('desde') ? 'Fechas Filtradas' : 'Filtrar Fechas'}
            </button>

            {showDatePicker && (
              <div className="date-picker-popover" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 50,
                background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                padding: '16px', width: '280px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}>
                <h4 className="text-white font-bold mb-3">Rango de Fechas</h4>
                <div className="mb-3">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Desde</label>
                  <input 
                    type="date" 
                    value={dateDesde}
                    onChange={(e) => setDateDesde(e.target.value)}
                    className="search-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Hasta</label>
                  <input 
                    type="date" 
                    value={dateHasta}
                    onChange={(e) => setDateHasta(e.target.value)}
                    className="search-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-ghost" onClick={limpiarFiltroFechas} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Limpiar</button>
                  <button className="btn btn-primary" onClick={aplicarFiltroFechas} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Aplicar</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Cajero</th>
                <th>Fecha / Hora</th>
                <th>Estado</th>
                <th>Método de Pago</th>
                <th>Tipo Pedido</th>
                <th className="text-right">Total Bs.</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => {
                const nombre = ((v.perfiles?.nombre || '') + ' ' + (v.perfiles?.apellido || '')).trim()
                const isCompletada = v.estado === 'completada'
                
                return (
                  <tr key={v.id}>
                    <td className="font-mono font-bold text-gray-300">#{v.numero_ticket.toString().padStart(6, '0')}</td>
                    <td className="text-gray-200 font-semibold">{nombre || 'Desconocido'}</td>
                    <td className="text-sm text-gray-400 font-mono">
                      {new Date(v.created_at).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      {isCompletada ? (
                        <span className="badge badge-green">Completada</span>
                      ) : (
                        <span className="badge badge-red">Anulada</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-300 font-semibold">{getMetodoLabel(v.metodo_pago)}</td>
                    <td className="text-sm text-gray-400 capitalize">{v.tipo_pedido.replace('_', ' ')}</td>
                    <td className={`text-right font-mono font-bold ${isCompletada ? 'text-yellow' : 'text-gray-500'}`}>
                      {isCompletada ? `Bs. ${fmt(v.total)}` : 'Bs. 0.00'}
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn btn-ghost btn-icon-only text-blue-400 hover:text-white"
                        style={{ color: '#64B5F6' }}
                        onClick={() => {
                          setVentaSeleccionada(v)
                          setModalOpen(true)
                        }}
                        title="Ver Detalles"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: '40px', color: 'var(--text-500)' }}>
                    No se encontraron coincidencias para la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ticket Virtual */}
      {modalOpen && ventaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '500px' }}>
            <div className="modal-title-bar" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-800)' }}>
               <h3 className="font-bold text-lg text-white">
                 Resumen de Ticket #{ventaSeleccionada.numero_ticket.toString().padStart(6, '0')}
               </h3>
               <button onClick={() => setModalOpen(false)} className="btn-close text-gray-400 hover:text-red">✖</button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px', background: 'var(--bg-900)' }}>
              
              <div className="ticket-meta grid grid-cols-2 gap-4 mb-6" style={{ background: 'var(--bg-800)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                 <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Cajero</p>
                   <p className="text-sm text-white font-semibold">{((ventaSeleccionada.perfiles?.nombre || '') + ' ' + (ventaSeleccionada.perfiles?.apellido || '')).trim()}</p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Fecha / Hora</p>
                   <p className="text-sm text-gray-300 font-mono">
                     {new Date(ventaSeleccionada.created_at).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pago / Retiro</p>
                   <p className="text-sm text-gray-300">{getMetodoLabel(ventaSeleccionada.metodo_pago)} - <span className="capitalize">{ventaSeleccionada.tipo_pedido.replace('_',' ')}</span></p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Estado</p>
                   {ventaSeleccionada.estado === 'completada' 
                      ? <p className="text-sm text-green font-bold flex items-center gap-1">Venta Exitosa</p> 
                      : <p className="text-sm text-red font-bold">Anulada ({ventaSeleccionada.motivo_anulacion || 'Sin motivo'})</p>
                   }
                 </div>
              </div>

              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Productos Vendidos</h4>
              
              <div className="ticket-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {ventaSeleccionada.detalle_ventas.map((item, idx) => (
                  <div key={item.id + idx} className="ticket-row flex justify-between items-center bg-bg-800 p-3 rounded-lg border border-border">
                    <div className="flex flex-col">
                       <span className="font-bold text-gray-200">{item.cantidad}x <span className="text-white ml-2">{item.nombre_producto}</span></span>
                       <span className="text-xs text-gray-500 font-mono">Bs. {fmt(item.precio_unitario)} c/u</span>
                    </div>
                    <div className="font-mono font-bold text-yellow">
                      Bs. {fmt(item.subtotal)}
                    </div>
                  </div>
                ))}

                {ventaSeleccionada.detalle_ventas.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">Sin detalles registrados.</p>
                )}
              </div>

              {/* Totals */}
              <div className="ticket-totals" style={{ borderTop: '2px dashed var(--border)', paddingTop: '16px' }}>
                 <div className="flex justify-between items-center text-gray-400 mb-2">
                   <span>Subtotal:</span>
                   <span className="font-mono">Bs. {fmt(ventaSeleccionada.subtotal)}</span>
                 </div>
                 <div className="flex justify-between items-center text-gray-400 mb-2">
                   <span>Descuento:</span>
                   <span className="font-mono text-red">Bs. {fmt(ventaSeleccionada.descuento)}</span>
                 </div>
                 <div className="flex justify-between items-center text-white font-bold text-xl mt-4 bg-bg-800 p-4 rounded-lg border border-border">
                   <span>TOTAL:</span>
                   <span className="font-mono text-yellow">Bs. {fmt(ventaSeleccionada.total)}</span>
                 </div>

                 {ventaSeleccionada.metodo_pago === 'efectivo' && ventaSeleccionada.monto_recibido && (
                   <div className="mt-4 pt-4 border-t border-border flex flex-col gap-1 text-sm text-gray-400">
                     <div className="flex justify-between">
                       <span>Efectivo Recibido:</span>
                       <span className="font-mono text-white">Bs. {fmt(ventaSeleccionada.monto_recibido)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Cambio / Vuelto:</span>
                       <span className="font-mono text-green font-bold">Bs. {fmt(ventaSeleccionada.vuelto || 0)}</span>
                     </div>
                   </div>
                 )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Vanilla CSS Global Styles para la página Venta */}
      <style>{`
        .bg-green\\/10 { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }
        .text-green { color: #4CAF50; }
        .bg-yellow\\/10 { background: rgba(253, 216, 53, 0.1); color: var(--yellow); }
        .text-yellow { color: var(--yellow); }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
           background: var(--bg-800);
           border: 1px solid var(--border);
           border-radius: var(--radius-xl);
           padding: 24px;
           display: flex;
           align-items: center;
           gap: 16px;
           box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .stat-icon-wrap {
           width: 56px; height: 56px;
           border-radius: 50%;
           display: flex; align-items: center; justify-content: center;
        }

        .stat-label {
           font-size: 0.8rem;
           font-weight: 700;
           color: var(--text-400);
           text-transform: uppercase;
           letter-spacing: 0.05em;
           margin-bottom: 4px;
        }

        .stat-value {
           font-size: 1.8rem;
           font-weight: 800;
           line-height: 1;
        }

        .data-table-section {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .table-toolbar {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
        }

        .search-bar {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-500);
        }

        .search-input {
          width: 100%;
          background: var(--bg-900);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 12px 16px 12px 42px;
          color: var(--text-100);
          font-weight: 500;
          transition: var(--transition);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--red);
          box-shadow: 0 0 0 3px rgba(211,47,47,0.15);
        }

        .table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background: rgba(0,0,0,0.2);
          padding: 16px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-400);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }

        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }

        .admin-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }

        .btn-ghost:hover {
          background: rgba(255,255,255,0.05);
        }

        .font-mono { font-family: monospace; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 800; }
        .capitalize { text-transform: capitalize; }
      `}</style>
    </div>
  )
}
