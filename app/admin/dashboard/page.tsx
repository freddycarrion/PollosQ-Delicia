import { createClient } from '@/lib/supabase/server'
import {
  TrendingUp, ShoppingCart, Users, Package,
  AlertTriangle, Banknote, CreditCard, Smartphone, ArrowUpRight
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]

  // Ventas de hoy
  const { data: ventasHoy } = await supabase
    .from('ventas')
    .select('total, metodo_pago, estado')
    .gte('created_at', `${hoy}T00:00:00`)
    .lte('created_at', `${hoy}T23:59:59`)

  const ventasCompletadas = ventasHoy?.filter(v => v.estado === 'completada') ?? []
  const totalHoy = ventasCompletadas.reduce((s, v) => s + Number(v.total), 0)
  const numVentasHoy = ventasCompletadas.length

  const totalEfectivo      = ventasCompletadas.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + Number(v.total), 0)
  const totalTarjeta       = ventasCompletadas.filter(v => v.metodo_pago === 'tarjeta').reduce((s, v) => s + Number(v.total), 0)
  const totalQR            = ventasCompletadas.filter(v => v.metodo_pago === 'qr').reduce((s, v) => s + Number(v.total), 0)
  const totalTransferencia = ventasCompletadas.filter(v => v.metodo_pago === 'transferencia').reduce((s, v) => s + Number(v.total), 0)

  // Ticket promedio
  const ticketPromedio = numVentasHoy > 0 ? totalHoy / numVentasHoy : 0

  // Empleados activos
  const { count: numEmpleados } = await supabase
    .from('perfiles')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)
    .eq('rol', 'cajero')

  // Alertas de stock bajo
  const { count: stockAlertas } = await supabase
    .from('insumos')
    .select('*', { count: 'exact', head: true })
    .filter('stock_actual', 'lte', 'stock_minimo')
    .eq('activo', true)

  // Últimas 8 ventas
  const { data: ultimasVentas } = await supabase
    .from('ventas')
    .select(`
      id, numero_ticket, total, metodo_pago, estado, created_at,
      cajero:perfiles(nombre, apellido)
    `)
    .order('created_at', { ascending: false })
    .limit(8)

  // Productos más vendidos hoy
  const { data: topProductos } = await supabase
    .from('detalle_ventas')
    .select('nombre_producto, cantidad, subtotal')
    .gte('created_at', `${hoy}T00:00:00`)
    .order('cantidad', { ascending: false })
    .limit(5)

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const fmtHora = (d: string) =>
    new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })

  const metodoPagoIcon = (m: string) => {
    if (m === 'efectivo')      return <Banknote size={14} className="text-green" />
    if (m === 'tarjeta')       return <CreditCard size={14} className="text-blue" />
    if (m === 'qr')            return <Smartphone size={14} className="text-yellow" />
    if (m === 'transferencia') return <ArrowUpRight size={14} className="text-orange" />
    return null
  }

  const metodoBadge = (m: string) => {
    const map: Record<string, string> = {
      efectivo: 'badge-green', tarjeta: 'badge-blue',
      qr: 'badge-yellow', transferencia: 'badge-orange'
    }
    return map[m] ?? 'badge-gray'
  }

  const estadoBadge = (e: string) =>
    e === 'completada' ? 'badge-green' : e === 'anulada' ? 'badge-red' : 'badge-gray'

  return (
    <div className="dashboard animate-fade-in">

      {/* ── KPIs principales ── */}
      <section className="dashboard-kpis">
        <div className="kpi-card red">
          <span className="kpi-label">Ventas del día</span>
          <span className="kpi-value">Bs. {fmt(totalHoy)}</span>
          <span className="kpi-sub">{numVentasHoy} ticket{numVentasHoy !== 1 ? 's' : ''} emitidos</span>
          <TrendingUp size={48} className="kpi-icon" />
        </div>

        <div className="kpi-card yellow">
          <span className="kpi-label">Ticket promedio</span>
          <span className="kpi-value">Bs. {fmt(ticketPromedio)}</span>
          <span className="kpi-sub">Por venta completada</span>
          <ShoppingCart size={48} className="kpi-icon" />
        </div>

        <div className="kpi-card green">
          <span className="kpi-label">Cajeros activos</span>
          <span className="kpi-value">{numEmpleados ?? 0}</span>
          <span className="kpi-sub">Empleados con acceso</span>
          <Users size={48} className="kpi-icon" />
        </div>

        <div className={`kpi-card ${(stockAlertas ?? 0) > 0 ? 'red' : 'green'}`}>
          <span className="kpi-label">Alertas de stock</span>
          <span className="kpi-value">{stockAlertas ?? 0}</span>
          <span className="kpi-sub">Insumos bajo mínimo</span>
          <AlertTriangle size={48} className="kpi-icon" />
        </div>
      </section>

      {/* ── Métodos de pago ── */}
      <section className="dashboard-metodos">
        <h2 className="section-title">Recaudación por método — Hoy</h2>
        <div className="metodos-grid">
          {[
            { label: 'Efectivo',       total: totalEfectivo,      icon: <Banknote size={22} />,    cls: 'metodo-card green' },
            { label: 'Tarjeta',        total: totalTarjeta,       icon: <CreditCard size={22} />,  cls: 'metodo-card blue' },
            { label: 'QR / Billetera', total: totalQR,            icon: <Smartphone size={22} />,  cls: 'metodo-card yellow' },
            { label: 'Transferencia',  total: totalTransferencia, icon: <ArrowUpRight size={22} />, cls: 'metodo-card orange' },
          ].map(m => (
            <div key={m.label} className={`card ${m.cls}`}>
              <div className="metodo-icon">{m.icon}</div>
              <span className="metodo-label">{m.label}</span>
              <span className="metodo-total">Bs. {fmt(m.total)}</span>
              {totalHoy > 0 && (
                <div className="metodo-bar-wrap">
                  <div
                    className="metodo-bar"
                    style={{ width: `${(m.total / totalHoy * 100).toFixed(0)}%` }}
                  />
                  <span className="metodo-pct">{(m.total / totalHoy * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Tabla + Productos ── */}
      <div className="dashboard-bottom">

        {/* Últimas ventas */}
        <section className="card dashboard-ventas-card">
          <div className="section-header">
            <h2 className="section-title">Últimas ventas</h2>
            <a href="/admin/ventas" className="btn btn-ghost btn-sm">Ver todo</a>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#Ticket</th>
                  <th>Hora</th>
                  <th>Cajero</th>
                  <th>Método</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVentas && ultimasVentas.length > 0 ? (
                  ultimasVentas.map((v: any) => (
                    <tr key={v.id}>
                      <td><span className="ticket-num">#{v.numero_ticket}</span></td>
                      <td style={{ color: 'var(--text-500)', fontSize: '0.85rem' }}>{fmtHora(v.created_at)}</td>
                      <td>
                        {v.cajero ? `${v.cajero.nombre} ${v.cajero.apellido}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${metodoBadge(v.metodo_pago)}`}>
                          {metodoPagoIcon(v.metodo_pago)}
                          {v.metodo_pago}
                        </span>
                      </td>
                      <td><strong>Bs. {fmt(Number(v.total))}</strong></td>
                      <td>
                        <span className={`badge ${estadoBadge(v.estado)}`}>
                          {v.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-600)', padding: '32px' }}>
                      Sin ventas registradas hoy
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top productos */}
        <section className="card dashboard-productos-card">
          <div className="section-header">
            <h2 className="section-title">Top productos hoy</h2>
            <a href="/admin/reportes" className="btn btn-ghost btn-sm">Reportes</a>
          </div>
          <div className="top-productos">
            {topProductos && topProductos.length > 0 ? (
              topProductos.map((p, i) => (
                <div key={i} className="top-producto-item">
                  <span className="top-num">{i + 1}</span>
                  <div className="top-info">
                    <span className="top-nombre">
                      {i === 0 && '🏆 '}
                      {p.nombre_producto}
                    </span>
                    <span className="top-detail">{p.cantidad} unid. · Bs. {fmt(Number(p.subtotal))}</span>
                  </div>
                  <div className="top-bar-wrap">
                    <div
                      className="top-bar"
                      style={{
                        width: `${(p.cantidad / (topProductos[0]?.cantidad ?? 1) * 100).toFixed(0)}%`
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Package size={32} style={{ opacity: 0.3 }} />
                <p>Sin datos de ventas hoy</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .dashboard { display: flex; flex-direction: column; gap: 28px; }

        /* KPIs */
        .dashboard-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1200px) { .dashboard-kpis { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .dashboard-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
        @media (max-width: 400px)  { .dashboard-kpis { grid-template-columns: 1fr; } }

        /* Métodos */
        .section-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #B71C1C;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .card .section-title {
          color: #ffffff; /* Letras blancas dentro de las tarjetas oscuras */
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .section-header .section-title { margin-bottom: 0; }

        .metodos-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 1100px) { .metodos-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px)  { .metodos-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

        .metodo-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 18px;
        }
        .metodo-icon {
          width: 42px; height: 42px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.07);
          margin-bottom: 4px;
        }
        .metodo-card.green .metodo-icon { background: rgba(46,125,50,0.2); color: #4CAF50; }
        .metodo-card.blue  .metodo-icon { background: rgba(21,101,192,0.2); color: #42A5F5; }
        .metodo-card.yellow .metodo-icon { background: rgba(253,216,53,0.15); color: var(--yellow); }
        .metodo-card.orange .metodo-icon { background: rgba(255,111,0,0.15); color: var(--orange); }

        .metodo-label { font-size: 0.78rem; color: var(--text-500); font-weight: 500; }
        .metodo-total { font-size: 1.15rem; font-weight: 800; color: var(--text-100); }
        .metodo-bar-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .metodo-bar {
          height: 4px;
          background: var(--red);
          border-radius: 99px;
          flex: 1;
          max-width: calc(100% - 36px);
          transition: width 1s ease;
        }
        .metodo-card.green  .metodo-bar { background: #4CAF50; }
        .metodo-card.blue   .metodo-bar { background: #42A5F5; }
        .metodo-card.yellow .metodo-bar { background: var(--yellow); }
        .metodo-card.orange .metodo-bar { background: var(--orange); }
        .metodo-pct { font-size: 0.75rem; color: var(--text-500); }

        /* Bottom grid */
        .dashboard-bottom {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 16px;
        }
        @media (max-width: 1100px) {
          .dashboard-bottom { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dashboard { gap: 16px; }
          .section-title { font-size: 0.85rem; }
          .dashboard-bottom { gap: 12px; }
        }

        .ticket-num {
          font-weight: 700;
          color: var(--red);
          font-size: 0.85rem;
        }
        .text-green  { color: #4CAF50; }
        .text-blue   { color: #42A5F5; }
        .text-yellow { color: var(--yellow); }
        .text-orange { color: var(--orange); }

        /* Top productos */
        .top-productos { display: flex; flex-direction: column; gap: 12px; }
        .top-producto-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .top-num {
          width: 24px; height: 24px;
          background: var(--bg-600);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-400);
          flex-shrink: 0;
        }
        .top-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .top-nombre { font-size: 0.875rem; font-weight: 600; color: var(--text-200); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top-detail { font-size: 0.75rem; color: var(--text-600); }
        .top-bar-wrap { width: 60px; height: 4px; background: var(--bg-500); border-radius: 99px; }
        .top-bar { height: 100%; background: linear-gradient(90deg, var(--red-dark), var(--yellow)); border-radius: 99px; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 40px;
          color: var(--text-600);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
