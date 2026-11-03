'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CircleDollarSign, HandCoins, Loader2, Plus, UserRound, Building2, X, Pencil, Trash2 } from 'lucide-react'

type Prestamo = {
  id: string
  destinatario_tipo: 'persona' | 'empresa'
  destinatario_nombre: string
  monto: number
  tiene_interes: boolean
  interes_porcentaje: number
  fecha: string
  nota: string | null
  created_at: string
}

type Formulario = {
  destinatario_tipo: 'persona' | 'empresa'
  destinatario_nombre: string
  monto: string
  tiene_interes: boolean
  interes_porcentaje: string
  fecha: string
  nota: string
}

function hoyLocal() {
  const ahora = new Date()
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function formularioVacio(): Formulario {
  return { destinatario_tipo: 'persona', destinatario_nombre: '', monto: '', tiene_interes: false, interes_porcentaje: '', fecha: hoyLocal(), nota: '' }
}

function moneda(valor: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)
}

function fechaBonita(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PrestamosClient({ usuarioId }: { usuarioId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Formulario>(formularioVacio)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error: errorCarga } = await supabase
      .from('prestamos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (errorCarga) setError(`No se pudieron cargar los préstamos: ${errorCarga.message}`)
    else setPrestamos((data ?? []) as Prestamo[])
    setCargando(false)
  }, [supabase])

  useEffect(() => { cargar() }, [cargar])

  const resumen = useMemo(() => prestamos.reduce((totales, prestamo) => {
    const principal = Number(prestamo.monto)
    const interes = prestamo.tiene_interes ? principal * Number(prestamo.interes_porcentaje) / 100 : 0
    totales.principal += principal
    totales.interes += interes
    totales.devolver += principal + interes
    return totales
  }, { principal: 0, interes: 0, devolver: 0 }), [prestamos])

  async function guardar() {
    setError('')
    const monto = Number(form.monto)
    const porcentaje = form.tiene_interes ? Number(form.interes_porcentaje) : 0
    if (!form.destinatario_nombre.trim()) { setError('Indica a quién se realizó el préstamo.'); return }
    if (!Number.isFinite(monto) || monto <= 0) { setError('Ingresa un monto válido mayor a 0.'); return }
    if (form.tiene_interes && (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 1000)) {
      setError('Ingresa un interés porcentual mayor a 0 y hasta 1000%.'); return
    }

    setGuardando(true)
    const datos = {
      destinatario_tipo: form.destinatario_tipo,
      destinatario_nombre: form.destinatario_nombre.trim(),
      monto,
      tiene_interes: form.tiene_interes,
      interes_porcentaje: porcentaje,
      fecha: form.fecha,
      nota: form.nota.trim() || null,
    }
    const { error: errorGuardar } = editandoId
      ? await supabase.from('prestamos').update(datos).eq('id', editandoId)
      : await supabase.from('prestamos').insert({ ...datos, registrado_por: usuarioId })
    if (errorGuardar) {
      setError(`No se pudo guardar: ${errorGuardar.message}`)
      setGuardando(false)
      return
    }
    setGuardando(false)
    setModal(false)
    setEditandoId(null)
    setForm(formularioVacio())
    await cargar()
  }

  function editar(prestamo: Prestamo) {
    setError('')
    setEditandoId(prestamo.id)
    setForm({
      destinatario_tipo: prestamo.destinatario_tipo,
      destinatario_nombre: prestamo.destinatario_nombre,
      monto: String(prestamo.monto),
      tiene_interes: prestamo.tiene_interes,
      interes_porcentaje: prestamo.tiene_interes ? String(prestamo.interes_porcentaje) : '',
      fecha: prestamo.fecha,
      nota: prestamo.nota ?? '',
    })
    setModal(true)
  }

  async function eliminar(prestamo: Prestamo) {
    const confirmado = window.confirm(`¿Eliminar el préstamo de ${prestamo.destinatario_nombre} por Bs. ${moneda(Number(prestamo.monto))}?`)
    if (!confirmado) return
    setError('')
    setEliminandoId(prestamo.id)
    const { error: errorEliminar } = await supabase.from('prestamos').delete().eq('id', prestamo.id)
    if (errorEliminar) setError(`No se pudo eliminar: ${errorEliminar.message}`)
    else setPrestamos(prev => prev.filter(item => item.id !== prestamo.id))
    setEliminandoId(null)
  }

  return (
    <div className="loan-page">
      <header className="loan-header">
        <div>
          <h1>Préstamos</h1>
          <p>Registra a quién prestaste, el monto y el interés acordado.</p>
        </div>
        <button className="loan-add" onClick={() => { setEditandoId(null); setForm(formularioVacio()); setError(''); setModal(true) }}>
          <Plus size={17} /> Registrar préstamo
        </button>
      </header>

      <section className="loan-summary">
        <div className="loan-summary-card"><span>Capital prestado</span><strong>Bs. {moneda(resumen.principal)}</strong></div>
        <div className="loan-summary-card"><span>Interés calculado</span><strong>Bs. {moneda(resumen.interes)}</strong></div>
        <div className="loan-summary-card loan-summary-total"><span>Total esperado de devolución</span><strong>Bs. {moneda(resumen.devolver)}</strong></div>
      </section>

      {error && !modal && <div className="loan-error">{error}</div>}

      <section className="loan-list">
        <div className="loan-list-heading"><h2>Historial de préstamos</h2><span>{prestamos.length} registro{prestamos.length === 1 ? '' : 's'}</span></div>
        {cargando ? <div className="loan-empty"><Loader2 className="loan-spin" /> Cargando préstamos...</div>
          : prestamos.length === 0 ? <div className="loan-empty"><HandCoins size={34} /><span>Aún no hay préstamos registrados.</span></div>
          : <div className="loan-table-wrap"><table className="loan-table"><thead><tr><th>Destinatario</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Total esperado</th><th>Acciones</th></tr></thead>
            <tbody>{prestamos.map((prestamo) => {
              const monto = Number(prestamo.monto)
              const interes = prestamo.tiene_interes ? monto * Number(prestamo.interes_porcentaje) / 100 : 0
              return <tr key={prestamo.id}>
                <td><div className="loan-recipient">{prestamo.destinatario_tipo === 'persona' ? <UserRound size={16} /> : <Building2 size={16} />}<span><strong>{prestamo.destinatario_nombre}</strong><small>{prestamo.destinatario_tipo === 'persona' ? 'Persona' : 'Empresa'}{prestamo.nota ? ` · ${prestamo.nota}` : ''}</small></span></div></td>
                <td>{fechaBonita(prestamo.fecha)}</td>
                <td>Bs. {moneda(monto)}</td>
                <td>{prestamo.tiene_interes ? `${Number(prestamo.interes_porcentaje)}% · Bs. ${moneda(interes)}` : 'Sin interés'}</td>
                <td className="loan-amount-due">Bs. {moneda(monto + interes)}</td>
                <td><div className="loan-actions"><button className="loan-action-edit" onClick={() => editar(prestamo)} title="Editar préstamo" aria-label={`Editar préstamo de ${prestamo.destinatario_nombre}`}><Pencil size={15} /></button><button className="loan-action-delete" onClick={() => eliminar(prestamo)} disabled={eliminandoId === prestamo.id} title="Eliminar préstamo" aria-label={`Eliminar préstamo de ${prestamo.destinatario_nombre}`}>{eliminandoId === prestamo.id ? <Loader2 size={15} className="loan-spin" /> : <Trash2 size={15} />}</button></div></td>
              </tr>
            })}</tbody></table></div>}
      </section>

      {modal && <div className="loan-overlay" onClick={() => !guardando && setModal(false)}>
        <section className="loan-modal" onClick={event => event.stopPropagation()}>
          <header><div><h2>{editandoId ? 'Editar préstamo' : 'Nuevo préstamo'}</h2><p>El porcentaje se aplica una sola vez al capital.</p></div><button aria-label="Cerrar" onClick={() => setModal(false)}><X size={19} /></button></header>
          <div className="loan-form">
            <label>Se presta a</label>
            <div className="loan-type-toggle">
              <button className={form.destinatario_tipo === 'persona' ? 'selected' : ''} onClick={() => setForm(prev => ({ ...prev, destinatario_tipo: 'persona' }))}><UserRound size={16} /> Persona</button>
              <button className={form.destinatario_tipo === 'empresa' ? 'selected' : ''} onClick={() => setForm(prev => ({ ...prev, destinatario_tipo: 'empresa' }))}><Building2 size={16} /> Empresa</button>
            </div>
            <label htmlFor="loan-name">Nombre de {form.destinatario_tipo === 'persona' ? 'la persona' : 'la empresa'} *</label>
            <input id="loan-name" autoFocus placeholder={form.destinatario_tipo === 'persona' ? 'Nombre completo' : 'Nombre de la empresa'} value={form.destinatario_nombre} onChange={event => setForm(prev => ({ ...prev, destinatario_nombre: event.target.value }))} />
            <div className="loan-fields-two">
              <div><label htmlFor="loan-amount">Monto prestado (Bs.) *</label><input id="loan-amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.monto} onChange={event => setForm(prev => ({ ...prev, monto: event.target.value }))} /></div>
              <div><label htmlFor="loan-date">Fecha *</label><input id="loan-date" type="date" value={form.fecha} onChange={event => setForm(prev => ({ ...prev, fecha: event.target.value }))} /></div>
            </div>
            <label className="loan-check"><input type="checkbox" checked={form.tiene_interes} onChange={event => setForm(prev => ({ ...prev, tiene_interes: event.target.checked }))} /> Este préstamo tiene interés</label>
            {form.tiene_interes && <div><label htmlFor="loan-interest">Interés porcentual (%) *</label><input id="loan-interest" type="number" min="0.01" max="1000" step="0.01" placeholder="Ej. 10" value={form.interes_porcentaje} onChange={event => setForm(prev => ({ ...prev, interes_porcentaje: event.target.value }))} />
              {Number(form.monto) > 0 && Number(form.interes_porcentaje) > 0 && <div className="loan-calculation">Interés: Bs. {moneda(Number(form.monto) * Number(form.interes_porcentaje) / 100)} · Total: Bs. {moneda(Number(form.monto) * (1 + Number(form.interes_porcentaje) / 100))}</div>}
            </div>}
            <label htmlFor="loan-note">Detalle (opcional)</label>
            <textarea id="loan-note" rows={2} placeholder="Referencia u observación" value={form.nota} onChange={event => setForm(prev => ({ ...prev, nota: event.target.value }))} />
            {error && <div className="loan-error">{error}</div>}
          </div>
          <footer><button className="loan-cancel" onClick={() => setModal(false)} disabled={guardando}>Cancelar</button><button className="loan-save" onClick={guardar} disabled={guardando}>{guardando ? <Loader2 className="loan-spin" size={16} /> : <CircleDollarSign size={16} />}{guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Guardar préstamo'}</button></footer>
        </section>
      </div>}

      <style>{`
        .loan-page{max-width:1100px;margin:0 auto;color:var(--text-100)}.loan-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px;flex-wrap:wrap}.loan-header h1{font-size:1.8rem;margin:0 0 5px;font-weight:900}.loan-header p{margin:0;color:var(--text-400);font-size:.9rem}.loan-add,.loan-save{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:10px;background:#B71C1C;color:#fff;padding:11px 17px;font-weight:750;cursor:pointer}.loan-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:22px}.loan-summary-card{display:flex;flex-direction:column;gap:9px;padding:17px 19px;background:var(--bg-800);border:1px solid var(--border);border-radius:14px}.loan-summary-card span{color:var(--text-500);font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.loan-summary-card strong{font-size:1.2rem}.loan-summary-total strong{color:#f0ae20}.loan-list{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px #00000012;color:#222}.loan-list-heading{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid #eee}.loan-list-heading h2{margin:0;font-size:1rem}.loan-list-heading span{color:#888;font-size:.82rem}.loan-empty{min-height:170px;display:flex;align-items:center;justify-content:center;gap:10px;flex-direction:column;color:#999}.loan-table-wrap{overflow-x:auto}.loan-table{width:100%;border-collapse:collapse;min-width:850px}.loan-table th,.loan-table td{text-align:left;padding:13px 16px;border-bottom:1px solid #eee;font-size:.86rem}.loan-table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:#777;background:#fafafa}.loan-table tr:last-child td{border-bottom:0}.loan-recipient{display:flex;align-items:center;gap:9px;color:#a92727}.loan-recipient span{display:flex;flex-direction:column;gap:3px;color:#222}.loan-recipient small{color:#888;font-size:.74rem}.loan-amount-due{font-weight:800;color:#a92727}.loan-actions{display:flex;gap:7px}.loan-actions button{width:31px;height:31px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;cursor:pointer}.loan-action-edit{background:#fff4d6;color:#9a6c00}.loan-action-delete{background:#fff0f0;color:#bd2424}.loan-actions button:disabled{opacity:.5;cursor:wait}.loan-overlay{position:fixed;inset:0;z-index:2000;background:#0009;backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px}.loan-modal{width:min(100%,520px);max-height:92vh;overflow:auto;background:white;color:#222;border-radius:18px;box-shadow:0 20px 60px #0004}.loan-modal>header{display:flex;justify-content:space-between;align-items:flex-start;padding:21px 24px 0}.loan-modal h2{margin:0 0 4px;font-size:1.15rem}.loan-modal header p{margin:0;color:#888;font-size:.8rem}.loan-modal header button{border:0;border-radius:8px;padding:7px;background:#f3f3f3;display:flex;cursor:pointer}.loan-form{padding:19px 24px;display:flex;flex-direction:column;gap:7px}.loan-form>label,.loan-fields-two label{font-weight:700;font-size:.78rem;color:#555}.loan-form input:not([type=checkbox]),.loan-form textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ddd;border-radius:9px;font:inherit;outline:none;background:#fafafa}.loan-form input:focus,.loan-form textarea:focus{border-color:#B71C1C;background:#fff}.loan-form textarea{resize:vertical}.loan-type-toggle{display:flex;gap:8px;margin-bottom:4px}.loan-type-toggle button{flex:1;display:flex;justify-content:center;align-items:center;gap:7px;padding:9px;border:1px solid #ddd;border-radius:9px;background:#fafafa;color:#666;font-weight:700;cursor:pointer}.loan-type-toggle button.selected{border-color:#B71C1C;background:#fff3f3;color:#B71C1C}.loan-fields-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.loan-fields-two>div{display:flex;flex-direction:column;gap:7px}.loan-check{display:flex;align-items:center;gap:8px;margin:5px 0;cursor:pointer}.loan-check input{accent-color:#B71C1C;width:16px;height:16px}.loan-calculation{margin-top:7px;padding:9px 11px;border-radius:8px;background:#fff8df;color:#795b00;font-size:.82rem;font-weight:700}.loan-error{padding:10px 12px;border-radius:8px;background:#fff0f0;border:1px solid #ffd0d0;color:#b71c1c;font-size:.84rem}.loan-modal>footer{display:flex;justify-content:flex-end;gap:9px;padding:0 24px 20px}.loan-cancel{padding:10px 15px;border:0;border-radius:9px;background:#eee;color:#555;font-weight:700;cursor:pointer}.loan-save:disabled,.loan-cancel:disabled{opacity:.6;cursor:wait}.loan-spin{animation:loan-spin .8s linear infinite}@keyframes loan-spin{to{transform:rotate(360deg)}}@media(max-width:680px){.loan-summary{grid-template-columns:1fr}.loan-header h1{font-size:1.5rem}.loan-fields-two{grid-template-columns:1fr}}
      `}</style>
    </div>
  )
}
