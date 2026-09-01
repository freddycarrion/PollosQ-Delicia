'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Calendar, Users, DollarSign, TrendingUp,
  ChevronDown, ChevronUp, Filter, Printer, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import type { PagoPersonal, PeriodoPago } from '@/lib/types/database'

interface Perfil { id: string; nombre: string; apellido: string; rol: string }
interface Sucursal { id: string; nombre: string }

interface Props {
  initialPagos:  PagoPersonal[]
  perfiles:      Perfil[]
  sucursales:    Sucursal[]
  miSucursalId:  string | null
  initialDesde:  string
  initialHasta:  string
}

const fmt = (n: number) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const PERIODOS: { value: PeriodoPago; label: string; color: string }[] = [
  { value: 'diario',   label: 'Pago Diario',   color: '#4CAF50' },
  { value: 'semanal',  label: 'Pago Semanal',  color: '#2196F3' },
  { value: 'mensual',  label: 'Pago Mensual',  color: '#FF9800' },
]

export default function PagosPersonalClient({ initialPagos, perfiles, sucursales, miSucursalId, initialDesde, initialHasta }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [pagos, setPagos] = useState<PagoPersonal[]>(initialPagos)
  const [desde, setDesde] = useState(initialDesde)
  const [hasta, setHasta] = useState(initialHasta)
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoPago | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nombre_empleado: '',
    empleado_id:     '',
    sucursal_id:     miSucursalId || '',
    concepto:        '',
    periodo:         'diario' as PeriodoPago,
    monto:           '',
    fecha_pago:      new Date().toISOString().split('T')[0],
    observaciones:   '',
  })

  const handleFiltrar = () => {
    router.push(`/admin/pagos-personal?desde=${desde}&hasta=${hasta}`)
  }

  const handleEmpleadoChange = (id: string) => {
    const p = perfiles.find(p => p.id === id)
    setForm(f => ({
      ...f,
      empleado_id:     id,
      nombre_empleado: p ? `${p.nombre} ${p.apellido}` : f.nombre_empleado,
    }))
  }

  const handleGuardar = async () => {
    if (!form.nombre_empleado.trim()) return toast.error('Ingresa el nombre del empleado')
    if (!form.concepto.trim())        return toast.error('Ingresa el concepto del pago')
    if (!form.monto || Number(form.monto) <= 0) return toast.error('Ingresa un monto válido')
    if (!form.sucursal_id)            return toast.error('Selecciona una sucursal')

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const payload = {
        sucursal_id:     form.sucursal_id,
        empleado_id:     form.empleado_id || null,
        registrado_por:  user.id,
        nombre_empleado: form.nombre_empleado.trim(),
        concepto:        form.concepto.trim(),
        periodo:         form.periodo,
        monto:           Number(form.monto),
        fecha_pago:      form.fecha_pago,
        observaciones:   form.observaciones.trim() || null,
      }

      const { data, error } = await supabase
        .from('pagos_personal')
        .insert(payload)
        .select('*, sucursales(nombre)')
        .single()

      if (error) throw error

      setPagos(prev => [data as PagoPersonal, ...prev])
      toast.success('Pago registrado correctamente')
      setShowForm(false)
      setForm(f => ({ ...f, nombre_empleado: '', empleado_id: '', concepto: '', monto: '', observaciones: '' }))
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el pago')
    } finally {
      setSaving(false)
    }
  }

  // Filtrados y totales
  const pagosFiltrados = useMemo(() => pagos.filter(p =>
    filtroPeriodo === 'todos' ? true : p.periodo === filtroPeriodo
  ), [pagos, filtroPeriodo])

  const totalGeneral = pagosFiltrados.reduce((acc, p) => acc + Number(p.monto), 0)
  const totalDiario  = pagos.filter(p => p.periodo === 'diario').reduce((acc, p) => acc + Number(p.monto), 0)
  const totalSemanal = pagos.filter(p => p.periodo === 'semanal').reduce((acc, p) => acc + Number(p.monto), 0)
  const totalMensual = pagos.filter(p => p.periodo === 'mensual').reduce((acc, p) => acc + Number(p.monto), 0)

  const periodoColor = (p: PeriodoPago) => PERIODOS.find(x => x.value === p)?.color || '#fff'
  const periodoLabel = (p: PeriodoPago) => PERIODOS.find(x => x.value === p)?.label || p

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── KPIs ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total del Período', value: `Bs. ${fmt(totalGeneral)}`, icon: <DollarSign size={22}/>, color: 'var(--yellow)' },
          { label: 'Pagos Diarios',     value: `Bs. ${fmt(totalDiario)}`,  icon: <Calendar size={22}/>,   color: '#4CAF50' },
          { label: 'Pagos Semanales',   value: `Bs. ${fmt(totalSemanal)}`, icon: <TrendingUp size={22}/>, color: '#2196F3' },
          { label: 'Pagos Mensuales',   value: `Bs. ${fmt(totalMensual)}`, icon: <Users size={22}/>,      color: '#FF9800' },
        ].map(k => (
          <div key={k.label} className="kpi-card" style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 50, height: 50, borderRadius: '12px', background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-100)' }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', background: 'var(--bg-800)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-400)', marginRight: '8px' }}>
          <Filter size={18} /> <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Filtros:</span>
        </div>
        {(['desde', 'hasta'] as const).map(key => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-500)', fontWeight: 700, textTransform: 'uppercase' }}>{key === 'desde' ? 'Desde' : 'Hasta'}</label>
            <input type="date" value={key === 'desde' ? desde : hasta} onChange={e => key === 'desde' ? setDesde(e.target.value) : setHasta(e.target.value)}
              style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }} />
          </div>
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-500)', fontWeight: 700, textTransform: 'uppercase' }}>Tipo de Pago</label>
          <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value as any)}
            style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }}>
            <option value="todos">Todos</option>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <button onClick={handleFiltrar} className="btn btn-primary" style={{ padding: '8px 20px', alignSelf: 'flex-end' }}>Aplicar</button>
        <button onClick={() => window.print()} className="btn btn-ghost" style={{ padding: '8px 14px', alignSelf: 'flex-end', display: 'flex', gap: '6px', alignItems: 'center', border: '1px solid var(--border)' }}>
          <Printer size={16}/> Exportar
        </button>
        <button onClick={() => setShowForm(s => !s)} className="btn btn-primary" style={{ marginLeft: 'auto', padding: '8px 20px', alignSelf: 'flex-end', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showForm ? <><X size={16}/> Cerrar</> : <><Plus size={16}/> Registrar Pago</>}
        </button>
      </div>

      {/* ── Formulario de nuevo pago ───────────────────────────────── */}
      {showForm && (
        <div style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={20} style={{ color: 'var(--yellow)' }}/> Registrar Nuevo Pago
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

            {/* Empleado (select + nombre manual) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Empleado (opcional)</label>
              <select value={form.empleado_id} onChange={e => handleEmpleadoChange(e.target.value)}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }}>
                <option value="">— Seleccionar del sistema —</option>
                {perfiles.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Nombre del Empleado *</label>
              <input type="text" placeholder="Ej: Juan Pérez" value={form.nombre_empleado} onChange={e => setForm(f => ({ ...f, nombre_empleado: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Sucursal *</label>
              <select value={form.sucursal_id} onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }}>
                <option value="">— Seleccionar —</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Tipo de Pago *</label>
              <select value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value as PeriodoPago }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }}>
                {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Monto (Bs.) *</label>
              <input type="number" min="0" step="0.50" placeholder="0.00" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Fecha del Pago *</label>
              <input type="date" value={form.fecha_pago} onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Concepto / Descripción *</label>
              <input type="text" placeholder="Ej: Sueldo semanal, Horas extra, Bono por productividad..." value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none', width: '100%' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Observaciones (opcional)</label>
              <textarea rows={2} placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: '8px', color: 'var(--text-100)', outline: 'none', resize: 'vertical', width: '100%', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ padding: '10px 20px' }}>Cancelar</button>
            <button onClick={handleGuardar} disabled={saving} className="btn btn-primary" style={{ padding: '10px 28px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Registrar Pago'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabla de pagos ─────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
            Pagos del Período — {pagosFiltrados.length} registro{pagosFiltrados.length !== 1 ? 's' : ''}
          </h3>
          <span style={{ color: 'var(--yellow)', fontWeight: 900, fontSize: '1.1rem', fontFamily: 'monospace' }}>
            Total: Bs. {fmt(totalGeneral)}
          </span>
        </div>

        {pagosFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-400)' }}>
            <DollarSign size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>No hay pagos registrados para este período.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  {['Fecha', 'Empleado', 'Concepto', 'Tipo', 'Sucursal', 'Monto'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((pago, i) => (
                  <tr key={pago.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-400)', whiteSpace: 'nowrap' }}>
                      {new Date(pago.fecha_pago + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{pago.nombre_empleado}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-300)' }}>{pago.concepto}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: `${periodoColor(pago.periodo)}18`, color: periodoColor(pago.periodo), padding: '3px 10px', borderRadius: '99px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {periodoLabel(pago.periodo)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>
                      {(pago.sucursales as any)?.nombre || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 900, fontFamily: 'monospace', color: '#4CAF50', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      Bs. {fmt(pago.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-900)', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={5} style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-300)' }}>TOTAL</td>
                  <td style={{ padding: '14px 16px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--yellow)', textAlign: 'right', fontSize: '1.05rem' }}>
                    Bs. {fmt(totalGeneral)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .admin-sidebar, .admin-header, .btn, button { display: none !important; }
          .admin-main { margin-left: 0 !important; }
          .admin-content { padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
