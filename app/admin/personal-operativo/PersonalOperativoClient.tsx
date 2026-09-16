'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, UserX, UserCheck, ChefHat, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import PersonalOperativoModal from './PersonalOperativoModal'

const CARGOS: Record<string, { label: string; color: string; icon: string }> = {
  cocinero:         { label: 'Cocinero/a',         color: '#FF9800', icon: '🍳' },
  mesero:           { label: 'Mesero/a',            color: '#2196F3', icon: '🍽️' },
  ayudante_cocina:  { label: 'Ayudante de Cocina',  color: '#4CAF50', icon: '🥄' },
  cajero_operativo: { label: 'Cajero/a Operativo',  color: '#9C27B0', icon: '💰' },
  limpieza:         { label: 'Limpieza',            color: '#00BCD4', icon: '🧹' },
  otro:             { label: 'Otro',                color: '#607D8B', icon: '👤' },
}

interface PersonalOperativo {
  id: string
  sucursal_id: string
  nombre: string
  apellido: string
  cargo: string
  telefono: string | null
  ci: string | null
  salario_base: number | null
  activo: boolean
  observaciones: string | null
  created_at: string
  sucursales?: { nombre: string }
}

interface Sucursal { id: string; nombre: string }

interface Props {
  initialData: PersonalOperativo[]
  sucursales: Sucursal[]
  miSucursalId: string | null
}

export default function PersonalOperativoClient({ initialData, sucursales, miSucursalId }: Props) {
  const supabase = createClient()
  const [personal, setPersonal] = useState<PersonalOperativo[]>(initialData)
  const [search, setSearch] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activo' | 'inactivo'>('activo')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<PersonalOperativo | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleSuccess = (p: PersonalOperativo) => {
    setPersonal(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...p, sucursales: sucursales.find(s => s.id === p.sucursal_id) ? { nombre: sucursales.find(s => s.id === p.sucursal_id)!.nombre } : undefined }
        return next
      }
      return [{ ...p, sucursales: sucursales.find(s => s.id === p.sucursal_id) ? { nombre: sucursales.find(s => s.id === p.sucursal_id)!.nombre } : undefined }, ...prev]
    })
    setModalOpen(false)
    setEditando(null)
  }

  const handleToggleActivo = async (p: PersonalOperativo) => {
    setToggling(p.id)
    const { error } = await supabase
      .from('personal_operativo')
      .update({ activo: !p.activo, updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (error) {
      toast.error('Error al cambiar estado: ' + error.message)
    } else {
      setPersonal(prev => prev.map(x => x.id === p.id ? { ...x, activo: !x.activo } : x))
      toast.success(!p.activo ? 'Personal reactivado' : 'Personal desactivado')
    }
    setToggling(null)
  }

  const filtered = useMemo(() => personal.filter(p => {
    const matchSearch = !search || `${p.nombre} ${p.apellido}`.toLowerCase().includes(search.toLowerCase())
    const matchCargo  = filtroCargo === 'todos' || p.cargo === filtroCargo
    const matchActivo = filtroActivo === 'todos' ? true : filtroActivo === 'activo' ? p.activo : !p.activo
    return matchSearch && matchCargo && matchActivo
  }), [personal, search, filtroCargo, filtroActivo])

  const totales = useMemo(() => ({
    total:    personal.filter(p => p.activo).length,
    cocinero: personal.filter(p => p.activo && p.cargo === 'cocinero').length,
    mesero:   personal.filter(p => p.activo && p.cargo === 'mesero').length,
    ayudante: personal.filter(p => p.activo && p.cargo === 'ayudante_cocina').length,
  }), [personal])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'Personal Activo',      value: totales.total,    color: 'var(--yellow)', icon: <Users size={22}/> },
          { label: 'Cocineros',            value: totales.cocinero, color: '#FF9800',        icon: <>🍳</> },
          { label: 'Meseros',              value: totales.mesero,   color: '#2196F3',        icon: <>🍽️</> },
          { label: 'Ayudantes de Cocina',  value: totales.ayudante, color: '#4CAF50',        icon: <>🥄</> },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, fontSize: '1.2rem' }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-500)', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-100)', lineHeight: 1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'var(--bg-800)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input type="text" placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '9px 12px 9px 36px', borderRadius: 8, color: 'var(--text-100)', outline: 'none', fontSize: '0.9rem' }} />
        </div>

        <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}
          style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '9px 12px', borderRadius: 8, color: 'var(--text-100)', outline: 'none' }}>
          <option value="todos">Todos los cargos</option>
          {Object.entries(CARGOS).map(([v, c]) => <option key={v} value={v}>{c.icon} {c.label}</option>)}
        </select>

        <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value as any)}
          style={{ background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '9px 12px', borderRadius: 8, color: 'var(--text-100)', outline: 'none' }}>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
          <option value="todos">Todos</option>
        </select>

        <button className="btn btn-primary" onClick={() => { setEditando(null); setModalOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', padding: '9px 20px' }}>
          <Plus size={18} /> Agregar Personal
        </button>
      </div>

      {/* Tabla / cards */}
      <div style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ChefHat size={20} style={{ color: 'var(--yellow)' }} />
            Personal Registrado
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-500)' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-400)' }}>
            <Users size={48} style={{ opacity: 0.15, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            <p>No hay personal registrado con estos filtros.</p>
            <button className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => { setEditando(null); setModalOpen(true) }}>
              <Plus size={16} /> Registrar primer empleado
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  {['Nombre', 'Cargo', 'Sucursal', 'Teléfono', 'C.I.', 'Salario Base', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cargoInfo = CARGOS[p.cargo] || CARGOS.otro
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', opacity: p.activo ? 1 : 0.55 }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        {p.nombre} {p.apellido}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: `${cargoInfo.color}18`, color: cargoInfo.color, padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {cargoInfo.icon} {cargoInfo.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>
                        {p.sucursales?.nombre || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>
                        {p.telefono || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-400)', fontSize: '0.85rem' }}>
                        {p.ci || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#4CAF50', fontWeight: 700 }}>
                        {p.salario_base ? `Bs. ${Number(p.salario_base).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: p.activo ? 'rgba(76,175,80,0.12)' : 'rgba(255,255,255,0.06)', color: p.activo ? '#4CAF50' : 'var(--text-500)', padding: '3px 10px', borderRadius: 99, fontWeight: 700, fontSize: '0.78rem' }}>
                          {p.activo ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button title="Editar" onClick={() => { setEditando(p); setModalOpen(true) }}
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text-300)', cursor: 'pointer' }}>
                            <Pencil size={15} />
                          </button>
                          <button title={p.activo ? 'Desactivar' : 'Activar'}
                            disabled={toggling === p.id}
                            onClick={() => handleToggleActivo(p)}
                            style={{ background: p.activo ? 'rgba(244,67,54,0.1)' : 'rgba(76,175,80,0.1)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: p.activo ? '#ef5350' : '#4CAF50', cursor: 'pointer' }}>
                            {p.activo ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PersonalOperativoModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditando(null) }}
        personal={editando}
        sucursales={sucursales}
        miSucursalId={miSucursalId}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
