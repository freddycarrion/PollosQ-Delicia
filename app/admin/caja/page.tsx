import { createClient } from '@/lib/supabase/server'
import { Clock, CheckCircle2, AlertCircle, DollarSign, Wallet } from 'lucide-react'

export default async function CajaAdminPage() {
  const supabase = await createClient()

  const { data: turnos, error } = await supabase
    .from('turnos')
    .select(`
      id,
      estado,
      monto_apertura,
      monto_cierre,
      total_efectivo,
      total_tarjeta,
      total_qr,
      total_transferencia,
      num_ventas,
      fecha_apertura,
      fecha_cierre,
      perfiles!turnos_cajero_id_fkey (nombre, apellido),
      sucursales (nombre)
    `)
    .order('fecha_apertura', { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error cargando caja", error)
  }

  const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n || 0)

  const turnosAbiertos = turnos?.filter(t => t.estado === 'abierto') || []
  const ventasHoyEfectivo = turnosAbiertos.reduce((acc, t) => acc + (t.total_efectivo || 0), 0)

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Wallet className="text-yellow" size={32} /> 
            Auditoría de Cajas y Turnos
          </h1>
          <p className="page-subtitle">Controla el flujo de dinero, aperturas y cierres de turno de tus empleados.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Turnos Abiertos</p>
            <p className="stat-value">{turnosAbiertos.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: 'rgba(253, 216, 53, 0.1)', color: 'var(--yellow)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
             <p className="stat-label">Ventas Efectivo (En Curso)</p>
             <p className="stat-value font-mono text-yellow">Bs. {fmt(ventasHoyEfectivo)}</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Sucursal</th>
              <th>Estado</th>
              <th>Apertura</th>
              <th className="text-right">Efectivo Total</th>
              <th className="text-right">Cierre Físico</th>
              <th className="text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {turnos?.map(turno => {
              const nombre = ((turno.perfiles as any)?.nombre + ' ' + (turno.perfiles as any)?.apellido).trim()
              const sucursal = (turno.sucursales as any)?.nombre || 'N/A'
              
              const base = turno.monto_apertura || 0
              const ventasEfectivo = turno.total_efectivo || 0
              const cajaEsperada = base + ventasEfectivo
              
              const cajaFisica = turno.monto_cierre || 0
              const diferencia = cajaFisica - cajaEsperada

              const isAbierto = turno.estado === 'abierto'
              const difColor = isAbierto ? 'var(--text-400)' : diferencia < 0 ? 'var(--red)' : diferencia > 0 ? 'var(--yellow)' : '#4CAF50'

              return (
                <tr key={turno.id}>
                  <td className="font-semibold">{nombre}</td>
                  <td className="text-sm text-gray">{sucursal}</td>
                  <td>
                    {isAbierto ? (
                      <span className="badge badge-green">
                        <Clock size={12} /> Abierto
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'var(--bg-600)', color: 'var(--text-300)' }}>
                        <CheckCircle2 size={12} /> Cerrado
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-gray font-mono">
                    {new Date(turno.fecha_apertura).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  
                  <td className="text-right font-mono" style={{ color: 'var(--text-200)' }}>
                    Bs. {fmt(cajaEsperada)}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-500)', marginTop: '2px' }}>
                      (Base: {fmt(base)} + Ventas: {fmt(ventasEfectivo)})
                    </div>
                  </td>
                  
                  <td className="text-right font-mono font-bold">
                    {isAbierto ? '--' : `Bs. ${fmt(cajaFisica)}`}
                  </td>

                  <td className="text-right font-mono font-bold">
                     {isAbierto ? (
                        <span style={{ color: 'var(--text-500)' }}>En curso</span>
                     ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', color: difColor }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {diferencia < 0 ? <AlertCircle size={14}/> : diferencia === 0 ? <CheckCircle2 size={14}/> : null}
                            {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
                          </span>
                          {diferencia < 0 && <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>Faltante</span>}
                          {diferencia > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>Sobrante</span>}
                          {diferencia === 0 && <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>Cuadre Perfecto</span>}
                        </div>
                     )}
                  </td>
                </tr>
              )
            })}
            
            {turnos?.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center" style={{ padding: '40px', color: 'var(--text-500)' }}>
                  No hay turnos registrados en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .page-header {
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-title {
          font-size: 1.8rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .page-subtitle {
          color: #ffffff;
          font-size: 0.95rem;
          margin-top: 4px;
        }

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
          color: var(--text-100);
          line-height: 1;
        }

        .table-container {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
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
          color: var(--text-200);
        }
        .admin-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        
        .font-mono { font-family: monospace; }
        .text-right { text-align: right; }
        .text-gray { color: var(--text-400); }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 800; }
        .text-yellow { color: var(--yellow); }

        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 20px; }
          .page-title { font-size: 1.4rem; gap: 8px; }
          .stats-grid { grid-template-columns: 1fr; gap: 14px; margin-bottom: 20px; }
          .stat-card { padding: 16px; }
          .stat-value { font-size: 1.4rem; }
          .table-container { border-radius: var(--radius-lg); }
          .admin-table th, .admin-table td { padding: 10px 12px; font-size: 0.82rem; }
        }
      `}</style>
    </div>
  )
}
