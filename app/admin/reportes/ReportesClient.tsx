'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, Package, Users, DollarSign, Calendar as CalIcon, Printer } from 'lucide-react'
import EstadoResultadosPrint from './EstadoResultadosPrint'

interface Props {
  ventasDiarias: any[]
  topProductos: any[]
  desempenoCajeros: any[]
  initialDesde: string
  initialHasta: string
}

const COLORS = ['#FDD835', '#F57F17', '#FF9800', '#FF5722', '#F44336', '#D32F2F', '#4CAF50', '#8BC34A', '#CDDC39', '#5E35B1']
const PAY_COLORS = { 'Efectivo': '#4CAF50', 'Tarjeta': '#2196F3', 'QR': '#9C27B0', 'Transferencia': '#FF9800' }

export default function ReportesClient({ ventasDiarias, topProductos, desempenoCajeros, initialDesde, initialHasta }: Props) {
  const router = useRouter()
  const [selectedSucursal, setSelectedSucursal] = useState<string>('all')
  const [desde, setDesde] = useState(initialDesde)
  const [hasta, setHasta] = useState(initialHasta)

  const handleFiltrar = () => {
    router.push(`/admin/reportes?desde=${desde}&hasta=${hasta}`)
  }

  // =============== 1. AGREGACIÓN DE VENTAS DIARIAS ===============
  const dailyChartData = useMemo(() => {
    let filtered = ventasDiarias
    if (selectedSucursal !== 'all') {
      filtered = filtered.filter(v => v.sucursal_id === selectedSucursal)
    }

    const dict: Record<string, any> = {}
    filtered.forEach(v => {
      const fecha = new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
      if (!dict[fecha]) {
        dict[fecha] = { 
          nombre: fecha, 
          Ingresos: 0, 
          Pedidos: 0,
          Efectivo: 0, Tarjeta: 0, QR: 0, Transferencia: 0 
        }
      }
      dict[fecha].Ingresos += Number(v.total_bs || 0)
      dict[fecha].Pedidos += Number(v.num_ventas || 0)
      dict[fecha].Efectivo += Number(v.total_efectivo || 0)
      dict[fecha].Tarjeta += Number(v.total_tarjeta || 0)
      dict[fecha].QR += Number(v.total_qr || 0)
      dict[fecha].Transferencia += Number(v.total_transferencia || 0)
    })
    return Object.values(dict)
  }, [ventasDiarias, selectedSucursal])

  // Métricas Totales (Kpis)
  const totalIngresos = dailyChartData.reduce((acc, curr) => acc + curr.Ingresos, 0)
  const totalPedidos = dailyChartData.reduce((acc, curr) => acc + curr.Pedidos, 0)
  
  const paymentData = [
    { name: 'Efectivo', value: dailyChartData.reduce((acc, curr) => acc + curr.Efectivo, 0) },
    { name: 'Tarjeta', value: dailyChartData.reduce((acc, curr) => acc + curr.Tarjeta, 0) },
    { name: 'QR', value: dailyChartData.reduce((acc, curr) => acc + curr.QR, 0) },
    { name: 'Transferencia', value: dailyChartData.reduce((acc, curr) => acc + curr.Transferencia, 0) }
  ].filter(p => p.value > 0)

  // =============== 2. TOP PRODUCTOS ===============
  const topProductsChartData = useMemo(() => {
    return topProductos.map(p => ({
      name: p.nombre_producto,
      Unidades: Number(p.total_unidades || 0),
      Ingresos: Number(p.total_bs || 0)
    }))
  }, [topProductos])

  return (
    <div className="reportes-client animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div className="dashboard-content no-print" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* TOOLBAR FECHAS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-800)', padding: '16px 20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-400)' }}>
          <CalIcon size={20} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Filtro de Fechas:</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <label style={{ fontSize: '0.75rem', color: 'var(--text-500)', fontWeight: 700, textTransform: 'uppercase' }}>Desde</label>
             <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <label style={{ fontSize: '0.75rem', color: 'var(--text-500)', fontWeight: 700, textTransform: 'uppercase' }}>Hasta</label>
             <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none' }} />
          </div>
          <button onClick={handleFiltrar} className="btn btn-primary" style={{ padding: '8px 20px', height: '42px', fontWeight: 700 }}>Aplicar Filtro</button>
          
          <button 
            onClick={() => window.print()} 
            className="btn btn-ghost no-print" 
            style={{ padding: '8px 16px', height: '42px', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid var(--border)' }}
            title="Exportar como PDF para imprimir"
          >
            <Printer size={18} />
            Exportar PDF
          </button>
        </div>
      </div>
      
      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        <div className="kpi-card">
           <div className="kpi-icon-box" style={{ background: 'rgba(253, 216, 53, 0.1)', color: 'var(--yellow)' }}><DollarSign size={24}/></div>
           <div className="kpi-info">
             <span className="kpi-label">Ingresos Totales (14 días)</span>
             <span className="kpi-value">{totalIngresos.toFixed(2)} Bs.</span>
           </div>
        </div>

        <div className="kpi-card">
           <div className="kpi-icon-box" style={{ background: 'rgba(33, 150, 243, 0.1)', color: '#2196F3' }}><TrendingUp size={24}/></div>
           <div className="kpi-info">
             <span className="kpi-label">Pedidos Completados</span>
             <span className="kpi-value">{totalPedidos}</span>
           </div>
        </div>

        <div className="kpi-card">
           <div className="kpi-icon-box" style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}><Package size={24}/></div>
           <div className="kpi-info">
             <span className="kpi-label">Producto Máz Vendido</span>
             <span className="kpi-value" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {topProductsChartData[0]?.name || 'N/A'}
             </span>
           </div>
        </div>

        <div className="kpi-card">
           <div className="kpi-icon-box" style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336' }}><Users size={24}/></div>
           <div className="kpi-info">
             <span className="kpi-label">Promedio Diario (Ventas)</span>
             <span className="kpi-value">
               {(dailyChartData.length > 0 ? (totalIngresos / dailyChartData.length) : 0).toFixed(2)} Bs.
             </span>
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* GRAFICO: INGRESOS POR DIA */}
          <div className="chart-panel" style={{ flex: '2 1 500px' }}>
            <h3 className="panel-title">Evolución de Ingresos (Últimos 14 días)</h3>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <LineChart data={dailyChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="nombre" stroke="var(--text-400)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-400)" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-900)', borderColor: 'var(--border)', color: 'var(--text-100)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--yellow)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Ingresos" stroke="var(--yellow)" strokeWidth={3} dot={{ r: 4, fill: 'var(--yellow)' }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Pedidos" stroke="#2196F3" strokeWidth={2} opacity={0.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRAFICO: METODOS DE PAGO */}
          <div className="chart-panel" style={{ flex: '1 1 300px' }}>
            <h3 className="panel-title">Métodos de Pago Utilizados</h3>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(PAY_COLORS as any)[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-900)', borderColor: 'var(--border)', color: 'var(--text-100)', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* GRAFICA: RANKING PRODUCTOS MÁS VENDIDOS */}
        <div className="chart-panel" style={{ flex: '1 1 500px' }}>
          <h3 className="panel-title">Ranking: 10 Productos Más Populares</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-500)" />
                <YAxis dataKey="name" type="category" stroke="var(--text-300)" width={120} tick={{ fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-900)', borderColor: 'var(--border)', borderRadius: '8px' }}
                />
                <Bar dataKey="Unidades" fill="var(--yellow)" radius={[0, 4, 4, 0]}>
                  {topProductsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLA: DESEMPEÑO CAJEROS */}
        <div className="chart-panel" style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column' }}>
           <h3 className="panel-title">Desempeño de Cajeros Activos</h3>
           
           <div style={{ flex: 1, background: 'var(--bg-900)', borderRadius: 'var(--radius-md)', overflowX: 'auto', border: '1px solid var(--border)' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-800)', borderBottom: '1px solid var(--border)', color: 'var(--text-400)' }}>
                    <th style={{ padding: '12px 16px' }}>Cajero</th>
                    <th style={{ padding: '12px 16px' }}>Sucursal</th>
                    <th style={{ padding: '12px 16px' }}>Ventas</th>
                    <th style={{ padding: '12px 16px' }}>Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {desempenoCajeros.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-500)' }}>No hay datos suficientes de cajeros</td></tr>
                  )}
                  {desempenoCajeros.map(cajero => (
                    <tr key={cajero.cajero_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--yellow)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                          {cajero.cajero.charAt(0)}
                        </div>
                        {cajero.cajero}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-400)', fontSize: '0.8rem' }}>{cajero.sucursal}</td>
                      <td style={{ padding: '12px 16px' }}>{cajero.total_ventas}</td>
                      <td style={{ padding: '12px 16px', color: '#4CAF50', fontWeight: 700 }}>{cajero.ticket_promedio} Bs</td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>

      </div>
      </div>

      <style>{`
        .kpi-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .kpi-icon-box {
          width: 54px; height: 54px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .kpi-info { display: flex; flex-direction: column; overflow: hidden; }
        .kpi-label { font-size: 0.8rem; font-weight: 700; color: var(--text-500); text-transform: uppercase; margin-bottom: 4px; whiteSpace: nowrap; }
        .kpi-value { font-size: 1.6rem; font-weight: 900; color: var(--text-100); line-height: 1; }

        .chart-panel {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 24px;
          display: flex; flex-direction: column;
        }
        .panel-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-100);
          margin-bottom: 24px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Estilos de impresión para PDF */
        @media print {
          body { 
            background: white !important; 
            color: black !important;
          }
          .admin-sidebar, 
          .admin-header, 
          .no-print,
          .page-header p {
            display: none !important;
          }
          .admin-main { margin-left: 0 !important; }
          .admin-content { padding: 0 !important; overflow: visible !important; }
          .reportes-client { gap: 0 !important; }
          
          .kpi-card { 
            border: 1px solid #ddd !important; 
            background: #f9f9f9 !important; 
            break-inside: avoid;
            box-shadow: none !important;
          }
          .kpi-label, .kpi-value { color: #000 !important; }
          
          .chart-panel { 
            background: #fff !important; 
            border: 1px solid #ccc !important;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 16px;
          }
          .panel-title { color: #000 !important; }
          
          text { fill: #333 !important; } /* Texto de los gráficos */
          table th { background: #eee !important; color: #000 !important; border-bottom: 2px solid #ccc !important; }
          table td { border-bottom: 1px solid #eee !important; color: #333 !important; }
        }
      `}</style>
      
      {/* COMPONENTE DE IMPRESIÓN (Oculto en pantalla, visible al imprimir) */}
      <EstadoResultadosPrint 
        desde={desde}
        hasta={hasta}
        ingresosTotales={totalIngresos}
      />
    </div>
  )
}
