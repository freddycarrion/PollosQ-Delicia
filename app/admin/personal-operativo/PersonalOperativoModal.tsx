'use client'

import { useState, useEffect } from 'react'
import { X, Check, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const CARGOS = [
  { value: 'cocinero',         label: '🍳 Cocinero/a' },
  { value: 'mesero',           label: '🍽️ Mesero/a' },
  { value: 'ayudante_cocina',  label: '🥄 Ayudante de Cocina' },
  { value: 'cajero_operativo', label: '💰 Cajero/a Operativo' },
  { value: 'limpieza',         label: '🧹 Limpieza' },
  { value: 'otro',             label: '👤 Otro' },
]

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
}

interface Sucursal { id: string; nombre: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  personal: PersonalOperativo | null
  sucursales: Sucursal[]
  miSucursalId: string | null
  onSuccess: (p: PersonalOperativo) => void
}

export default function PersonalOperativoModal({
  isOpen, onClose, personal, sucursales, miSucursalId, onSuccess
}: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    cargo: 'cocinero',
    sucursal_id: miSucursalId || '',
    telefono: '',
    ci: '',
    salario_base: '',
    observaciones: '',
    activo: true,
  })

  useEffect(() => {
    if (personal) {
      setForm({
        nombre:       personal.nombre,
        apellido:     personal.apellido,
        cargo:        personal.cargo,
        sucursal_id:  personal.sucursal_id,
        telefono:     personal.telefono || '',
        ci:           personal.ci || '',
        salario_base: personal.salario_base?.toString() || '',
        observaciones: personal.observaciones || '',
        activo:       personal.activo,
      })
    } else {
      setForm({
        nombre: '', apellido: '', cargo: 'cocinero',
        sucursal_id: miSucursalId || '',
        telefono: '', ci: '', salario_base: '', observaciones: '', activo: true,
      })
    }
  }, [personal, isOpen, miSucursalId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    if (!form.sucursal_id)   return toast.error('Selecciona una sucursal')

    setLoading(true)
    const supabase = createClient()

    const payload = {
      nombre:       form.nombre.trim(),
      apellido:     form.apellido.trim(),
      cargo:        form.cargo,
      sucursal_id:  form.sucursal_id,
      telefono:     form.telefono || null,
      ci:           form.ci || null,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      observaciones: form.observaciones || null,
      activo:       form.activo,
    }

    try {
      if (personal) {
        const { data, error } = await supabase
          .from('personal_operativo')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', personal.id)
          .select()
          .single()
        if (error) throw error
        toast.success('Personal actualizado correctamente')
        onSuccess(data as PersonalOperativo)
      } else {
        const { data, error } = await supabase
          .from('personal_operativo')
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        toast.success('Personal registrado correctamente')
        onSuccess(data as PersonalOperativo)
      }
      onClose()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="po-backdrop">
      <div className="po-panel animate-zoom-in">
        <div className="po-header">
          <h2 className="po-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={22} style={{ color: 'var(--yellow)' }} />
            {personal ? 'Editar Personal' : 'Registrar Personal Operativo'}
          </h2>
          <button className="po-close" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="po-body">
          <div className="po-grid">
            <div className="po-field">
              <label className="po-label">Nombre *</label>
              <input className="po-input" type="text" placeholder="Ej. Juan" required
                value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="po-field">
              <label className="po-label">Apellido</label>
              <input className="po-input" type="text" placeholder="Ej. Pérez"
                value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
            </div>

            <div className="po-field">
              <label className="po-label">Cargo *</label>
              <select className="po-input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}>
                {CARGOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="po-field">
              <label className="po-label">Sucursal *</label>
              <select className="po-input" value={form.sucursal_id} onChange={e => setForm(f => ({ ...f, sucursal_id: e.target.value }))}>
                <option value="">— Seleccionar —</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div className="po-field">
              <label className="po-label">Teléfono</label>
              <input className="po-input" type="text" placeholder="Ej. 77712345"
                value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>

            <div className="po-field">
              <label className="po-label">Carnet de Identidad</label>
              <input className="po-input" type="text" placeholder="Ej. 12345678"
                value={form.ci} onChange={e => setForm(f => ({ ...f, ci: e.target.value }))} />
            </div>

            <div className="po-field">
              <label className="po-label">Salario Base (Bs.) <span style={{ color: 'var(--text-500)', fontWeight: 400 }}>Referencial</span></label>
              <input className="po-input" type="number" min="0" step="0.5" placeholder="0.00"
                value={form.salario_base} onChange={e => setForm(f => ({ ...f, salario_base: e.target.value }))} />
            </div>

            {personal && (
              <div className="po-field" style={{ alignSelf: 'center' }}>
                <label className="po-label">Estado</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--yellow)' }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-200)' }}>Empleado activo</span>
                </label>
              </div>
            )}

            <div className="po-field" style={{ gridColumn: '1 / -1' }}>
              <label className="po-label">Observaciones</label>
              <textarea className="po-input" rows={2} placeholder="Notas adicionales..."
                value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
            </div>
          </div>

          <div className="po-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={18} />
              {loading ? 'Guardando...' : personal ? 'Guardar Cambios' : 'Registrar Personal'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .po-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .po-panel { background: var(--bg-800); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 48px rgba(0,0,0,0.5); }
        .po-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .po-title { font-size: 1.15rem; font-weight: 800; color: var(--text-100); margin: 0; }
        .po-close { background: transparent; border: none; color: var(--text-400); cursor: pointer; padding: 4px; border-radius: 6px; }
        .po-close:hover { color: var(--red); }
        .po-body { padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .po-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .po-field { display: flex; flex-direction: column; gap: 6px; }
        .po-label { font-size: 0.78rem; font-weight: 700; color: var(--text-400); text-transform: uppercase; letter-spacing: 0.05em; }
        .po-input { background: var(--bg-900); border: 1px solid var(--border); color: var(--text-100); padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.95rem; outline: none; resize: vertical; font-family: inherit; }
        .po-input:focus { border-color: var(--yellow); }
        .po-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border); }
        @media (max-width: 500px) { .po-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
