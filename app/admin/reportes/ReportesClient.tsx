'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, Package, Users, DollarSign, Calendar as CalIcon,
  Printer, BarChart3, ShoppingBag, Tag
} from 'lucide-react'
import EstadoResultadosPrint from './EstadoResultadosPrint'

interface Props {
  ventasDiarias:      any[]
  topProductos:       any[]
  desempenoCajeros:   any[]
  ventasMensuales:    any[]
  ventasPorCategoria: any[]
  compras:            any[]
  pagosPersonal:      any[]
  initialDesde: string
  initialHasta: string
}

const COLORS = ['#FDD835','#F57F17','#FF9800','#FF5722','#F44336','#D32F2F','#4CAF50','#8BC34A','#5E35B1','#2196F3']
const PAY_COLORS: Record<string, string> = { 'Efectivo': '#4CAF50', 'Tarjeta': '#2196F3', 'QR': '#9C27B0', 'Transferencia': '#FF9800' }

const fmt = (n: number) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Tab = 'resumen' | 'mensual' | 'categorias' | 'compras'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'resumen',    label: 'Resumen General',   icon: <BarChart3 size={16}/> },
  { key: 'mensual',   label: 'Ventas Mensuales',  icon: <TrendingUp size={16}/> },
  { key: 'categorias',label: 'Por Categoría',     icon: <Tag size={16}/> },
  { key: 'compras',   label: 'Compras',           icon: <ShoppingBag size={16}/> },
]

export default function ReportesClient({
  ventasDiarias, topProductos, desempenoCajeros,
  ventasMensuales, ventasPorCategoria, compras, pagosPersonal,
  initialDesde, initialHasta
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const [desde, setDesde] = useState(initialDesde)
  const [hasta, setHasta] = useState(initialHasta)

  const handleFiltrar = () => router.push(`/admin/reportes?desde=${desde}&hasta=${hasta}`)

  // ─── Datos Tab Resumen ────────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    const dict: Record<string, any> = {}
    ventasDiarias.forEach(v => {
      const fecha = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
      if (!dict[fecha]) dict[fecha] = { nombre: fecha, Ingresos: 0, Pedidos: 0, Efectivo: 0, Tarjeta: 0, QR: 0, Transferencia: 0 }
      dict[fecha].Ingresos      += Number(v.total_bs || 0)
      dict[fecha].Pedidos       += Number(v.num_ventas || 0)
      dict[fecha].Efectivo      += Number(v.total_efectivo || 0)
      dict[fecha].Tarjeta       += Number(v.total_tarjeta || 0)
      dict[fecha].QR            += Number(v.total_qr || 0)
      dict[fecha].Transferencia += Number(v.total_transferencia || 0)
    })
    return Object.values(dict)
  }, [ventasDiarias])

  const totalIngresos = dailyChartData.reduce((a, c) => a + c.Ingresos, 0)
  const totalPedidos  = dailyChartData.reduce((a, c) => a + c.Pedidos, 0)
  const paymentData = [
    { name: 'Efectivo',      value: dailyChartData.reduce((a, c) => a + c.Efectivo, 0) },
    { name: 'Tarjeta',       value: dailyChartData.reduce((a, c) => a + c.Tarjeta, 0) },
    { name: 'QR',            value: dailyChartData.reduce((a, c) => a + c.QR, 0) },
    { name: 'Transferencia', value: dailyChartData.reduce((a, c) => a + c.Transferencia, 0) },
  ].filter(p => p.value > 0)

  const topProductsChartData = topProductos.map(p => ({
    name: p.nombre_producto, Unidades: Number(p.total_unidades || 0), Ingresos: Number(p.total_bs || 0)
  }))

  // ─── Datos Tab Mensual ────────────────────────────────────────────────
  const mensualChartData = ventasMensuales.map(m => ({
    name: m.label, Ingresos: Number(m.total_bs), Pedidos: Number(m.num_ventas)
  }))
  const totalMensualPeriodo = mensualChartData.reduce((a, c) => a + c.Ingresos, 0)
  const mejorMes = mensualChartData.reduce((best, c) => c.Ingresos > best.Ingresos ? c : best, { name: '—', Ingresos: 0 })

  // ─── Datos Tab Categorías ─────────────────────────────────────────────
  const catPieData  = ventasPorCategoria.map(c => ({ name: c.nombre, value: Number(c.total_bs) }))
  const totalCatBs  = ventasPorCategoria.reduce((a, c) => a + Number(c.total_bs), 0)
  const totalCatUnd = ventasPorCategoria.reduce((a, c) => a + Number(c.total_unidades), 0)

  const tooltipStyle = { backgroundColor: 'var(--bg-900)', borderColor: 'var(--border)', color: 'var(--text-100)', borderRadius: '8px' }

  return (
    <div className="reportes-client" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Selector de Tabs ──────────────────────────────────────── */}
      <div className="reportes-tabs no-print">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`reporte-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Toolbar de Fechas (solo para tabs que lo necesitan) ─── */}
      {(activeTab === 'resumen' || activeTab === 'compras') && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-800)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-400)' }}>
            <CalIcon size={18}/> <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Período:</span>
          </div>
          {[{ key: 'desde', val: desde, set: setDesde }, { key: 'hasta', val: hasta, set: setHasta }].map(f => (
            <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-500)', fontWeight: 700, textTransform: 'uppercase' }}>{f.key === 'desde' ? 'Desde' : 'Hasta'}</label>
              <input type="date" value={f.val} onChange={e => f.set(e.target.value)}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }} />
            </div>
          ))}
          <button onClick={handleFiltrar} className="btn btn-primary" style={{ padding: '8px 20px', height: '42px', fontWeight: 700 }}>Aplicar</button>
          <button onClick={() => window.print()} className="btn btn-ghost" style={{ padding: '8px 14px', height: '42px', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid var(--border)' }}>
            <Printer size={16}/> PDF
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: RESUMEN GENERAL
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {[
              { label: `Ingresos (${desde} → ${hasta})`, value: `${fmt(totalIngresos)} Bs.`, icon: <DollarSign size={24}/>, color: 'var(--yellow)' },
              { label: 'Pedidos Completados',  value: String(totalPedidos),                                icon: <TrendingUp size={24}/>, color: '#2196F3' },
              { label: 'Producto Más Vendido', value: topProductsChartData[0]?.name || 'N/A',             icon: <Package size={24}/>,    color: '#4CAF50' },
              { label: 'Promedio Diario',      value: `${fmt(dailyChartData.length > 0 ? totalIngresos / dailyChartData.length : 0)} Bs.`, icon: <Users size={24}/>, color: '#F44336' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-icon-box" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
                <div className="kpi-info">
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value" style={{ fontSize: '1.4rem' }}>{k.value}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div className="chart-panel" style={{ flex: '2 1 500px' }}>
              <h3 className="panel-title">Evolución de Ingresos Diarios</h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dailyChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
                  <XAxis dataKey="nombre" stroke="var(--text-400)" tick={{ fontSize: 11 }}/>
                  <YAxis stroke="var(--text-400)" tick={{ fontSize: 11 }}/>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--yellow)' }}/>
                  <Legend/>
                  <Line type="monotone" dataKey="Ingresos" stroke="var(--yellow)" strokeWidth={3} dot={{ r: 4, fill: 'var(--yellow)' }} activeDot={{ r: 8 }}/>
                  <Line type="monotone" dataKey="Pedidos"  stroke="#2196F3" strokeWidth={2} opacity={0.6}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-panel" style={{ flex: '1 1 280px' }}>
              <h3 className="panel-title">Métodos de Pago</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={5} dataKey="value">
                    {paymentData.map((entry, i) => <Cell key={i} fill={PAY_COLORS[entry.name] || COLORS[i]}/>)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `Bs. ${fmt(v)}`}/>
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div className="chart-panel" style={{ flex: '1 1 400px' }}>
              <h3 className="panel-title">Top 10 Productos Más Vendidos</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                  <XAxis type="number" stroke="var(--text-500)" tick={{ fontSize: 11 }}/>
                  <YAxis dataKey="name" type="category" stroke="var(--text-300)" width={115} tick={{ fontSize: 10 }}/>
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }}/>
                  <Bar dataKey="Unidades" radius={[0, 4, 4, 0]}>
                    {topProductsChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-panel" style={{ flex: '1 1 360px' }}>
              <h3 className="panel-title">Desempeño de Cajeros</h3>
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)' }}>
                      {['Cajero', 'Ventas', 'Total', 'Ticket Prom.'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {desempenoCajeros.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-500)' }}>Sin datos</td></tr>
                    )}
                    {desempenoCajeros.map(c => (
                      <tr key={c.cajero_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--yellow)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                            {c.cajero.charAt(0)}
                          </div>
                          {c.cajero}
                        </td>
                        <td style={{ padding: '10px 14px' }}>{c.total_ventas}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--yellow)', fontWeight: 700 }}>Bs. {fmt(c.total_bs)}</td>
                        <td style={{ padding: '10px 14px', color: '#4CAF50', fontWeight: 700 }}>Bs. {c.ticket_promedio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: VENTAS MENSUALES
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'mensual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* KPIs mensuales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Últimos 12 Meses', value: `${fmt(totalMensualPeriodo)} Bs.`, icon: <DollarSign size={24}/>, color: 'var(--yellow)' },
              { label: 'Mejor Mes',              value: mejorMes.name,                     icon: <TrendingUp size={24}/>, color: '#4CAF50' },
              { label: 'Mayor Ingreso en un Mes',value: `${fmt(mejorMes.Ingresos)} Bs.`,   icon: <BarChart3 size={24}/>,  color: '#2196F3' },
              { label: 'Meses con Datos',        value: String(mensualChartData.length),   icon: <CalIcon size={24}/>,    color: '#FF9800' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-icon-box" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
                <div className="kpi-info">
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value" style={{ fontSize: '1.3rem' }}>{k.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="chart-panel">
            <h3 className="panel-title">Ingresos Mensuales — Últimos 12 Meses</h3>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={mensualChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
                <XAxis dataKey="name" stroke="var(--text-400)" tick={{ fontSize: 11 }}/>
                <YAxis stroke="var(--text-400)" tick={{ fontSize: 11 }}/>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `Bs. ${fmt(v)}`}/>
                <Legend/>
                <Bar dataKey="Ingresos" fill="var(--yellow)" radius={[6, 6, 0, 0]}>
                  {mensualChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla mensual */}
          <div className="chart-panel">
            <h3 className="panel-title">Detalle por Mes</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)' }}>
                    {['Mes', 'Pedidos', 'Total Ingresos', 'Promedio por Pedido'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mensualChartData.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-500)' }}>Sin datos para el período seleccionado</td></tr>
                  )}
                  {[...mensualChartData].reverse().map((m, i) => (
                    <tr key={m.name} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{m.name}</td>
                      <td style={{ padding: '12px 16px' }}>{m.Pedidos}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--yellow)', fontWeight: 800, fontFamily: 'monospace' }}>Bs. {fmt(m.Ingresos)}</td>
                      <td style={{ padding: '12px 16px', color: '#4CAF50', fontFamily: 'monospace' }}>Bs. {fmt(m.Pedidos > 0 ? m.Ingresos / m.Pedidos : 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-900)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={2} style={{ padding: '12px 16px', fontWeight: 800 }}>TOTAL</td>
                    <td style={{ padding: '12px 16px', color: 'var(--yellow)', fontWeight: 900, fontFamily: 'monospace', fontSize: '1.05rem' }}>Bs. {fmt(totalMensualPeriodo)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: POR CATEGORÍA
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'categorias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Ingresos (período)', value: `${fmt(totalCatBs)} Bs.`, icon: <DollarSign size={24}/>, color: 'var(--yellow)' },
              { label: 'Total Unidades Vendidas',  value: String(totalCatUnd),       icon: <Package size={24}/>,    color: '#4CAF50' },
              { label: 'Categoría Top (Ingresos)', value: ventasPorCategoria[0]?.nombre || 'N/A', icon: <Tag size={24}/>, color: '#2196F3' },
              { label: 'Categorías con Ventas',    value: String(ventasPorCategoria.length), icon: <BarChart3 size={24}/>, color: '#FF9800' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-icon-box" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
                <div className="kpi-info">
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value" style={{ fontSize: '1.3rem' }}>{k.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div className="chart-panel" style={{ flex: '1 1 300px' }}>
              <h3 className="panel-title">Distribución por Categoría (Ingresos)</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={catPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={4} dataKey="value" label={(props: any) => `${props.name || ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {catPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `Bs. ${fmt(v)}`}/>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-panel" style={{ flex: '2 1 400px' }}>
              <h3 className="panel-title">Comparativa por Categoría</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={ventasPorCategoria.map(c => ({ name: c.nombre, Unidades: Number(c.total_unidades), Ingresos: Number(c.total_bs) }))} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)"/>
                  <XAxis dataKey="name" stroke="var(--text-400)" tick={{ fontSize: 10 }}/>
                  <YAxis yAxisId="left"  stroke="var(--yellow)"  tick={{ fontSize: 10 }}/>
                  <YAxis yAxisId="right" orientation="right" stroke="#4CAF50" tick={{ fontSize: 10 }}/>
                  <Tooltip contentStyle={tooltipStyle}/>
                  <Legend/>
                  <Bar yAxisId="left"  dataKey="Ingresos"  fill="var(--yellow)" radius={[4, 4, 0, 0]} name="Ingresos (Bs.)"/>
                  <Bar yAxisId="right" dataKey="Unidades"  fill="#4CAF50"       radius={[4, 4, 0, 0]} name="Unidades Vendidas"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla por categoría */}
          <div className="chart-panel">
            <h3 className="panel-title">Detalle por Categoría</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)' }}>
                    {['#', 'Categoría', 'Unidades Vendidas', 'Total Ingresos', '% del Total'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventasPorCategoria.map((c, i) => (
                    <tr key={c.nombre} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS[i % COLORS.length] + '30', color: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                          {i + 1}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.icono} {c.nombre}</td>
                      <td style={{ padding: '12px 16px' }}>{Number(c.total_unidades).toLocaleString('es-BO')}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--yellow)', fontWeight: 800, fontFamily: 'monospace' }}>Bs. {fmt(c.total_bs)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-900)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${totalCatBs > 0 ? (Number(c.total_bs) / totalCatBs * 100) : 0}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: '99px' }}/>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '40px' }}>
                            {totalCatBs > 0 ? (Number(c.total_bs) / totalCatBs * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4: COMPRAS
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'compras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Total Invertido (período)', value: `${fmt(compras.reduce((a, c) => a + Number(c.total), 0))} Bs.`, icon: <ShoppingBag size={24}/>, color: '#F44336' },
              { label: 'Cantidad de Compras',        value: String(compras.length), icon: <Package size={24}/>, color: '#FF9800' },
              { label: 'Promedio por Compra',        value: `${fmt(compras.length > 0 ? compras.reduce((a, c) => a + Number(c.total), 0) / compras.length : 0)} Bs.`, icon: <DollarSign size={24}/>, color: 'var(--yellow)' },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="kpi-icon-box" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
                <div className="kpi-info">
                  <span className="kpi-label">{k.label}</span>
                  <span className="kpi-value" style={{ fontSize: '1.3rem' }}>{k.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="chart-panel">
            <h3 className="panel-title">Historial de Compras del Período</h3>
            {compras.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-400)' }}>
                <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                <p>No hay compras registradas en el período seleccionado.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)' }}>
                      {['Fecha', 'Factura', 'Proveedor', 'Sucursal', 'Registrado por', 'Total'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((c: any, i: number) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-400)' }}>
                          {new Date(c.fecha_compra + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-300)' }}>
                          {c.numero_factura ? `#${c.numero_factura}` : 'S/N'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.proveedores?.nombre || 'Varios'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>{c.sucursales?.nombre || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>
                          {c.perfiles ? `${c.perfiles.nombre} ${c.perfiles.apellido}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4CAF50', fontWeight: 900, fontFamily: 'monospace', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          Bs. {fmt(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-900)', borderTop: '2px solid var(--border)' }}>
                      <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 800 }}>TOTAL</td>
                      <td style={{ padding: '12px 16px', color: '#F44336', fontWeight: 900, fontFamily: 'monospace', textAlign: 'right', fontSize: '1.05rem' }}>
                        Bs. {fmt(compras.reduce((a, c) => a + Number(c.total), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .reportes-tabs {
          display: flex; gap: 4px; flex-wrap: wrap;
          background: var(--bg-800); padding: 6px; border-radius: 14px;
          border: 1px solid var(--border);
        }
        .reporte-tab {
          flex: 1; min-width: 140px; padding: 10px 16px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: transparent; border: none; border-radius: 10px;
          color: var(--text-400); font-weight: 700; font-size: 0.9rem;
          transition: all 0.2s ease; cursor: pointer;
        }
        .reporte-tab:hover { background: var(--bg-700); color: var(--text-200); }
        .reporte-tab.active { background: var(--red); color: #fff; box-shadow: 0 4px 16px rgba(211,47,47,0.3); }
        .kpi-card {
          background: var(--bg-800); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px;
        }
        .kpi-icon-box { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .kpi-info { display: flex; flex-direction: column; overflow: hidden; }
        .kpi-label { font-size: 0.75rem; font-weight: 700; color: var(--text-500); text-transform: uppercase; margin-bottom: 4px; }
        .kpi-value { font-size: 1.5rem; font-weight: 900; color: var(--text-100); line-height: 1; }
        .chart-panel {
          background: var(--bg-800); border: 1px solid var(--border);
          border-radius: 16px; padding: 24px;
          display: flex; flex-direction: column;
        }
        .panel-title {
          font-size: 1.05rem; font-weight: 800; color: var(--text-100);
          margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }
        @media print {
          body { background: white !important; color: black !important; }
          .admin-sidebar, .admin-header, .no-print, .reportes-tabs { display: none !important; }
          .admin-main { margin-left: 0 !important; }
          .admin-content { padding: 0 !important; overflow: visible !important; }
          .kpi-card, .chart-panel { border: 1px solid #ddd !important; background: #f9f9f9 !important; break-inside: avoid; }
          .kpi-label, .kpi-value, .panel-title { color: #000 !important; }
          table th { background: #eee !important; color: #000 !important; }
          table td { color: #333 !important; border-bottom: 1px solid #eee !important; }
        }
      `}</style>

      {/* Print component */}
      <EstadoResultadosPrint 
        desde={desde} 
        hasta={hasta} 
        ingresosTotales={totalIngresos} 
        pedidosCompletados={totalPedidos}
        productoMasVendido={topProductsChartData[0]?.name || 'N/A'}
        promedioDiario={dailyChartData.length > 0 ? totalIngresos / dailyChartData.length : 0}
        ventasPorCategoria={ventasPorCategoria}
        compras={compras}
        pagosPersonal={pagosPersonal}
        paymentData={paymentData}
      />
    </div>
  )
}
