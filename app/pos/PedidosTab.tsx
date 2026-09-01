'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Printer, Receipt, Clock, CheckCircle, XCircle, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TicketData } from './TicketVenta'

interface DetalleVentaItem {
  id: string
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
  notas_item: string | null
}

interface VentaTurno {
  id: string
  numero_ticket: number
  total: number
  metodo_pago: string
  metodo_pago_2: string | null
  monto_pago_2: number | null
  monto_recibido: number | null
  vuelto: number | null
  tipo_pedido: string
  estado: 'completada' | 'anulada' | 'pendiente'
  created_at: string
  detalle_ventas: DetalleVentaItem[]
}

interface Props {
  turnoId: string
  cajeroNombre: string
  sucursalNombre: string
  onReimprimir: (ticket: TicketData) => void
}

const METODO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  qr: 'QR',
  transferencia: 'Transferencia',
}

export default function PedidosTab({ turnoId, cajeroNombre, sucursalNombre, onReimprimir }: Props) {
  const supabase = createClient()
  const [ventas, setVentas] = useState<VentaTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'completada' | 'anulada'>('todos')
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const cargarVentas = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          id, numero_ticket, total, metodo_pago, metodo_pago_2, monto_pago_2,
          monto_recibido, vuelto, tipo_pedido, estado, created_at,
          detalle_ventas (
            id, nombre_producto, precio_unitario, cantidad, subtotal, notas_item
          )
        `)
        .eq('turno_id', turnoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVentas((data as VentaTurno[]) || [])
    } catch (err: any) {
      console.error('Error cargando ventas del turno:', err)
    } finally {
      setLoading(false)
    }
  }, [turnoId, supabase])

  useEffect(() => {
    cargarVentas()
  }, [cargarVentas])

  const handleReimprimir = (venta: VentaTurno) => {
    const metodoPago = venta.metodo_pago_2
      ? `${METODO_LABELS[venta.metodo_pago] || venta.metodo_pago} + ${METODO_LABELS[venta.metodo_pago_2] || venta.metodo_pago_2}`
      : (METODO_LABELS[venta.metodo_pago] || venta.metodo_pago)

    const ticket: TicketData = {
      sucursalNombre,
      cajeroNombre,
      numeroTicket: String(venta.numero_ticket).padStart(4, '0'),
      tipoPedido: venta.tipo_pedido,
      metodoPago: metodoPago,
      metodoPago2: venta.metodo_pago_2 || undefined,
      montoPago2: venta.monto_pago_2 || undefined,
      total: venta.total,
      recibido: venta.monto_recibido || venta.total,
      vuelto: venta.vuelto || 0,
      items: venta.detalle_ventas.map(d => ({
        nombre: d.nombre_producto,
        cantidad: d.cantidad,
        precio: d.precio_unitario,
        subtotal: d.subtotal,
        notas: d.notas_item || undefined,
      })),
      fecha: new Date(venta.created_at).toLocaleString('es-BO'),
      esReimpresion: true,
    }
    onReimprimir(ticket)
  }

  const handleAnular = async (ventaId: string, ticketNum: number) => {
    const confirmar = window.confirm(`¿Estás seguro que deseas ANULAR el ticket #${String(ticketNum).padStart(4, '0')}? Esta acción no se puede deshacer.`)
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('ventas')
        .update({ estado: 'anulada' })
        .eq('id', ventaId)

      if (error) throw error
      
      // Actualizar estado localmente sin recargar todo
      setVentas(prev => prev.map(v => v.id === ventaId ? { ...v, estado: 'anulada' } : v))
      alert('Venta anulada correctamente.')
    } catch (err) {
      console.error(err)
      alert('Error al anular la venta.')
    }
  }

  const ventasFiltradas = ventas.filter(v =>
    filtroEstado === 'todos' ? true : v.estado === filtroEstado
  )

  const totalCompletadas = ventas.filter(v => v.estado === 'completada').reduce((s, v) => s + v.total, 0)
  const countCompletadas = ventas.filter(v => v.estado === 'completada').length
  const countAnuladas = ventas.filter(v => v.estado === 'anulada').length

  return (
    <div className="pedidos-tab">

      {/* Resumen del turno */}
      <div className="pedidos-resumen">
        <div className="pedidos-stat">
          <span className="pedidos-stat-val text-yellow">{countCompletadas}</span>
          <span className="pedidos-stat-label">Completadas</span>
        </div>
        <div className="pedidos-stat">
          <span className="pedidos-stat-val" style={{ color: 'var(--red)' }}>{countAnuladas}</span>
          <span className="pedidos-stat-label">Anuladas</span>
        </div>
        <div className="pedidos-stat">
          <span className="pedidos-stat-val text-green">Bs. {fmt(totalCompletadas)}</span>
          <span className="pedidos-stat-label">Total Turno</span>
        </div>
        <button
          className="pedidos-refresh-btn"
          onClick={cargarVentas}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="pedidos-filtros">
        {(['todos', 'completada', 'anulada'] as const).map(f => (
          <button
            key={f}
            className={`pedidos-filtro-btn ${filtroEstado === f ? 'active' : ''}`}
            onClick={() => setFiltroEstado(f)}
          >
            {f === 'todos' && <Filter size={13} />}
            {f === 'completada' && <CheckCircle size={13} />}
            {f === 'anulada' && <XCircle size={13} />}
            {f === 'todos' ? 'Todos' : f === 'completada' ? 'Completadas' : 'Anuladas'}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="pedidos-list">
        {loading ? (
          <div className="pedidos-loading">
            <RefreshCw size={24} className="spin" style={{ opacity: 0.4 }} />
            <span>Cargando pedidos...</span>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="pedidos-empty">
            <Receipt size={36} style={{ opacity: 0.2 }} />
            <p>No hay pedidos {filtroEstado !== 'todos' ? filtroEstado + 's' : ''} en este turno</p>
          </div>
        ) : (
          ventasFiltradas.map(venta => {
            const isExpanded = ventaExpandida === venta.id
            const completada = venta.estado === 'completada'
            const hora = new Date(venta.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
            const metodoPago = venta.metodo_pago_2
              ? `${METODO_LABELS[venta.metodo_pago] || venta.metodo_pago} + ${METODO_LABELS[venta.metodo_pago_2]}`
              : (METODO_LABELS[venta.metodo_pago] || venta.metodo_pago)

            return (
              <div key={venta.id} className={`pedido-card ${completada ? '' : 'anulado'}`}>
                {/* Fila principal */}
                <div
                  className="pedido-card-header"
                  onClick={() => setVentaExpandida(isExpanded ? null : venta.id)}
                >
                  <div className="pedido-ticket-info">
                    <span className="pedido-num">#{String(venta.numero_ticket).padStart(4, '0')}</span>
                    <div className={`pedido-estado-dot ${completada ? 'completada' : 'anulada'}`} />
                  </div>

                  <div className="pedido-meta">
                    <span className="pedido-hora">
                      <Clock size={12} />
                      {hora}
                    </span>
                    <span className="pedido-tipo">
                      {venta.tipo_pedido === 'para_llevar' ? 'Para llevar' : 'Comer aquí'}
                    </span>
                    <span className="pedido-metodo">{metodoPago}</span>
                  </div>

                  <div className="pedido-total-area">
                    <span className={`pedido-total ${completada ? 'text-yellow' : ''}`}>
                      {completada ? `Bs. ${fmt(venta.total)}` : 'Anulado'}
                    </span>
                    {completada && (
                      <>
                        <button
                          className="pedido-action-btn print"
                          onClick={(e) => { e.stopPropagation(); handleReimprimir(venta) }}
                          title="Reimprimir ticket"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          className="pedido-action-btn cancel"
                          onClick={(e) => { e.stopPropagation(); handleAnular(venta.id, venta.numero_ticket) }}
                          title="Anular venta"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="pedido-detalle">
                    <div className="pedido-detalle-items">
                      {venta.detalle_ventas.map((item, idx) => (
                        <div key={item.id + idx} className="pedido-detalle-item">
                          <span className="pedido-detalle-cant">{item.cantidad}x</span>
                          <div className="pedido-detalle-info">
                            <span className="pedido-detalle-nombre">{item.nombre_producto}</span>
                            {item.notas_item && (
                              <span className="pedido-detalle-notas">{item.notas_item}</span>
                            )}
                          </div>
                          <span className="pedido-detalle-subtotal">Bs. {fmt(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pedido-detalle-total">
                      <span>TOTAL</span>
                      <span>Bs. {fmt(venta.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`
        .pedidos-tab {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .pedidos-resumen {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-900);
          flex-shrink: 0;
        }
        .pedidos-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .pedidos-stat + .pedidos-stat {
          border-left: 1px solid var(--border);
        }
        .pedidos-stat-val {
          font-size: 1.1rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text-100);
        }
        .text-green { color: #4CAF50; }
        .text-yellow { color: var(--yellow); }
        .pedidos-stat-label {
          font-size: 0.7rem;
          color: var(--text-500);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pedidos-refresh-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--bg-700);
          border: 1px solid var(--border);
          color: var(--text-400);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }
        .pedidos-refresh-btn:hover { background: var(--bg-600); color: var(--text-100); }
        .pedidos-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        .pedidos-filtros {
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          overflow-x: auto;
        }
        .pedidos-filtro-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 600;
          background: var(--bg-700);
          border: 1px solid var(--border);
          color: var(--text-400);
          white-space: nowrap;
          transition: var(--transition);
        }
        .pedidos-filtro-btn:hover { border-color: var(--border-hover); color: var(--text-200); }
        .pedidos-filtro-btn.active {
          background: var(--red);
          border-color: var(--red);
          color: #fff;
        }

        .pedidos-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .pedidos-loading,
        .pedidos-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: var(--text-500);
          font-size: 0.9rem;
          text-align: center;
        }

        .pedido-card {
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .pedido-card:hover { background: rgba(255,255,255,0.02); }
        .pedido-card.anulado { opacity: 0.65; }

        .pedido-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          cursor: pointer;
        }

        .pedido-ticket-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pedido-num {
          font-size: 0.85rem;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-100);
        }
        .pedido-estado-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pedido-estado-dot.completada { background: #4CAF50; }
        .pedido-estado-dot.anulada { background: var(--red); }

        .pedido-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .pedido-hora {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--text-500);
          font-weight: 600;
        }
        .pedido-tipo {
          font-size: 0.75rem;
          color: var(--text-400);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pedido-metodo {
          font-size: 0.72rem;
          color: var(--text-500);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pedido-total-area {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .pedido-total {
          font-size: 0.9rem;
          font-weight: 800;
          font-family: monospace;
          color: var(--text-300);
        }
        .pedido-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          border: 1px solid transparent;
        }
        .pedido-action-btn.print {
          background: rgba(253,216,53,0.1);
          border-color: rgba(253,216,53,0.2);
          color: var(--yellow);
        }
        .pedido-action-btn.print:hover { background: var(--yellow); color: #000; }
        
        .pedido-action-btn.cancel {
          background: rgba(211,47,47,0.1);
          border-color: rgba(211,47,47,0.2);
          color: var(--red);
        }
        .pedido-action-btn.cancel:hover { background: var(--red); color: #fff; }

        .pedido-detalle {
          padding: 0 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px dashed rgba(255,255,255,0.06);
          margin-top: 0;
          animation: fadeIn 0.2s ease;
        }
        .pedido-detalle-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pedido-detalle-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.8rem;
        }
        .pedido-detalle-cant {
          color: var(--text-500);
          font-weight: 700;
          min-width: 24px;
          flex-shrink: 0;
        }
        .pedido-detalle-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .pedido-detalle-nombre {
          color: var(--text-200);
          font-weight: 600;
        }
        .pedido-detalle-notas {
          font-size: 0.72rem;
          color: var(--yellow);
          font-style: italic;
        }
        .pedido-detalle-subtotal {
          font-family: monospace;
          font-weight: 700;
          color: var(--text-300);
          flex-shrink: 0;
        }
        .pedido-detalle-total {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-100);
          padding-top: 6px;
          border-top: 1px solid var(--border);
          margin-top: 4px;
          font-family: monospace;
        }
      `}</style>
    </div>
  )
}
