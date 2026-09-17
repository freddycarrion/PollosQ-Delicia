'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, TrendingDown, Plus, Trash2,
  DollarSign, Calendar, FileText, X, Loader2
} from 'lucide-react'

interface Registro {
  id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
  fecha: string
  nota: string | null
  created_at: string
}

interface FormData {
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: string
  fecha: string
  nota: string
}

const EMPTY_FORM: FormData = {
  tipo: 'ingreso',
  concepto: '',
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  nota: '',
}

export default function FinanzasClient() {
  const supabase = createClient()

  const [registros, setRegistros]   = useState<Registro[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'ingreso' | 'egreso'>('todos')
  const [error, setError]           = useState('')

  const fetchRegistros = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('finanzas_personales')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) setRegistros(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchRegistros() }, [fetchRegistros])

  async function handleGuardar() {
    setError('')
    if (!form.concepto.trim()) { setError('El concepto es obligatorio.'); return }
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0) {
      setError('Ingresa un monto válido mayor a 0.'); return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado.'); setSaving(false); return }

    const { error: err } = await supabase.from('finanzas_personales').insert({
      usuario_id: user.id,
      tipo:       form.tipo,
      concepto:   form.concepto.trim(),
      monto:      Number(form.monto),
      fecha:      form.fecha,
      nota:       form.nota.trim() || null,
    })

    if (err) { setError('Error al guardar: ' + err.message); setSaving(false); return }
    setSaving(false)
    setShowModal(false)
    setForm(EMPTY_FORM)
    fetchRegistros()
  }

  async function handleEliminar(id: string) {
    setDeletingId(id)
    await supabase.from('finanzas_personales').delete().eq('id', id)
    setDeletingId(null)
    setRegistros(prev => prev.filter(r => r.id !== id))
  }

  const filtrados = filtroTipo === 'todos'
    ? registros
    : registros.filter(r => r.tipo === filtroTipo)

  const totalIngresos = registros.filter(r => r.tipo === 'ingreso').reduce((s, r) => s + r.monto, 0)
  const totalEgresos  = registros.filter(r => r.tipo === 'egreso').reduce((s, r) => s + r.monto, 0)
  const balance       = totalIngresos - totalEgresos

  function fmtMonto(n: number) {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  }
  function fmtFecha(fecha: string) {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="fp-container">
      {/* Header */}
      <div className="fp-header">
        <div>
          <h1 className="fp-title">Ingreso / Egreso Personal</h1>
          <p className="fp-subtitle">Registra y consulta tus movimientos financieros personales</p>
        </div>
        <button className="fp-btn-add" onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setError('') }}>
          <Plus size={16} />
          Nuevo registro
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="fp-cards">
        <div className="fp-card fp-card-ingreso">
          <div className="fp-card-icon"><TrendingUp size={22} /></div>
          <div>
            <span className="fp-card-label">Total Ingresos</span>
            <span className="fp-card-value">Bs. {fmtMonto(totalIngresos)}</span>
          </div>
        </div>
        <div className="fp-card fp-card-egreso">
          <div className="fp-card-icon"><TrendingDown size={22} /></div>
          <div>
            <span className="fp-card-label">Total Egresos</span>
            <span className="fp-card-value">Bs. {fmtMonto(totalEgresos)}</span>
          </div>
        </div>
        <div className={`fp-card ${balance >= 0 ? 'fp-card-balance-pos' : 'fp-card-balance-neg'}`}>
          <div className="fp-card-icon"><DollarSign size={22} /></div>
          <div>
            <span className="fp-card-label">Balance</span>
            <span className="fp-card-value">{balance >= 0 ? '+' : '-'}Bs. {fmtMonto(Math.abs(balance))}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="fp-filters">
        {(['todos', 'ingreso', 'egreso'] as const).map(f => (
          <button
            key={f}
            className={`fp-filter-btn ${filtroTipo === f ? 'active' : ''} ${f !== 'todos' ? 'fp-filter-' + f : ''}`}
            onClick={() => setFiltroTipo(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Egresos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="fp-list">
        {loading ? (
          <div className="fp-empty"><Loader2 size={28} className="spin" /> Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="fp-empty">
            <TrendingUp size={40} style={{ opacity: 0.3 }} />
            <span>Sin registros aún. ¡Agrega tu primer movimiento!</span>
          </div>
        ) : filtrados.map(r => (
          <div key={r.id} className={`fp-item ${r.tipo}`}>
            <div className={`fp-item-badge ${r.tipo}`}>
              {r.tipo === 'ingreso' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div className="fp-item-info">
              <span className="fp-item-concepto">{r.concepto}</span>
              {r.nota && <span className="fp-item-nota">{r.nota}</span>}
              <span className="fp-item-fecha">
                <Calendar size={11} /> {fmtFecha(r.fecha)}
              </span>
            </div>
            <div className="fp-item-right">
              <span className={`fp-item-monto ${r.tipo}`}>
                {r.tipo === 'ingreso' ? '+' : '-'}Bs. {fmtMonto(r.monto)}
              </span>
              <button
                className="fp-btn-del"
                onClick={() => handleEliminar(r.id)}
                disabled={deletingId === r.id}
                title="Eliminar"
              >
                {deletingId === r.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <span className="fp-modal-title">Nuevo movimiento</span>
              <button className="fp-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <div className="fp-modal-body">
              {/* Selector tipo */}
              <div className="fp-tipo-toggle">
                <button
                  className={`fp-tipo-btn ingreso ${form.tipo === 'ingreso' ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, tipo: 'ingreso' }))}
                >
                  <TrendingUp size={16} /> Ingreso
                </button>
                <button
                  className={`fp-tipo-btn egreso ${form.tipo === 'egreso' ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, tipo: 'egreso' }))}
                >
                  <TrendingDown size={16} /> Egreso
                </button>
              </div>

              <div className="fp-field">
                <label className="fp-label"><FileText size={13} /> Concepto *</label>
                <input
                  className="fp-input"
                  placeholder="Ej: Salario, Alquiler, Comida..."
                  value={form.concepto}
                  onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                />
              </div>

              <div className="fp-row-2">
                <div className="fp-field">
                  <label className="fp-label"><DollarSign size={13} /> Monto (Bs.) *</label>
                  <input
                    className="fp-input"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.monto}
                    onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                  />
                </div>
                <div className="fp-field">
                  <label className="fp-label"><Calendar size={13} /> Fecha *</label>
                  <input
                    className="fp-input"
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
              </div>

              <div className="fp-field">
                <label className="fp-label">Nota (opcional)</label>
                <textarea
                  className="fp-input fp-textarea"
                  placeholder="Descripción adicional..."
                  value={form.nota}
                  onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
                  rows={2}
                />
              </div>

              {error && <div className="fp-error">{error}</div>}
            </div>

            <div className="fp-modal-footer">
              <button className="fp-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className={`fp-btn-save ${form.tipo}`}
                onClick={handleGuardar}
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fp-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .fp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .fp-title {
          font-size: 1.8rem;
          font-weight: 900;
          color: var(--text-100);
          margin: 0 0 4px;
        }
        .fp-subtitle {
          color: var(--text-400);
          font-size: 0.9rem;
          margin: 0;
        }
        .fp-btn-add {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          color: #B71C1C;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
          white-space: nowrap;
        }
        .fp-btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }

        /* Cards */
        .fp-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        @media (max-width: 600px) { .fp-cards { grid-template-columns: 1fr; } }
        .fp-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.2s;
        }
        .fp-card:hover { transform: translateY(-2px); }
        .fp-card-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fp-card-ingreso .fp-card-icon  { background: rgba(46,213,115,0.2); color: #2ed573; }
        .fp-card-egreso  .fp-card-icon  { background: rgba(255,107,107,0.2); color: #ff6b6b; }
        .fp-card-balance-pos .fp-card-icon { background: rgba(251,192,45,0.2); color: #FBC02D; }
        .fp-card-balance-neg .fp-card-icon { background: rgba(255,107,107,0.2); color: #ff6b6b; }
        .fp-card-label {
          display: block;
          font-size: 0.72rem;
          color: var(--text-500);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }
        .fp-card-value {
          display: block;
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-100);
        }

        /* Filtros */
        .fp-filters {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .fp-filter-btn {
          padding: 7px 16px;
          border-radius: 20px;
          border: 1.5px solid var(--border);
          background: var(--bg-800);
          color: var(--text-400);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-filter-btn:hover { background: var(--bg-700); color: var(--text-100); }
        .fp-filter-btn.active {
          background: var(--bg-600);
          color: var(--text-100);
          border-color: var(--border-hover);
        }
        .fp-filter-ingreso.active { background: #2ed573; color: #fff; border-color: #2ed573; }
        .fp-filter-egreso.active  { background: #ff6b6b; color: #fff; border-color: #ff6b6b; }

        /* Lista */
        .fp-list {
          background: rgba(255,255,255,0.95);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          min-height: 160px;
        }
        .fp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          color: #999;
          font-size: 0.95rem;
        }
        .fp-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.15s;
        }
        .fp-item:last-child { border-bottom: none; }
        .fp-item:hover { background: #fafafa; }
        .fp-item-badge {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .fp-item-badge.ingreso { background: #e8faf0; color: #2ed573; }
        .fp-item-badge.egreso  { background: #fff0f0; color: #ff6b6b; }
        .fp-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .fp-item-concepto {
          font-weight: 700;
          color: #222;
          font-size: 0.92rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fp-item-nota {
          font-size: 0.78rem;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fp-item-fecha {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.74rem;
          color: #aaa;
          margin-top: 1px;
        }
        .fp-item-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .fp-item-monto {
          font-weight: 800;
          font-size: 0.95rem;
        }
        .fp-item-monto.ingreso { color: #27ae60; }
        .fp-item-monto.egreso  { color: #e74c3c; }
        .fp-btn-del {
          background: #fff0f0;
          border: none;
          border-radius: 8px;
          padding: 6px;
          color: #e74c3c;
          cursor: pointer;
          display: flex; align-items: center;
          transition: all 0.2s;
          opacity: 0.6;
        }
        .fp-item:hover .fp-btn-del { opacity: 1; }
        .fp-btn-del:hover { background: #ffd6d6; }
        .fp-btn-del:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Modal */
        .fp-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .fp-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          overflow: hidden;
        }
        .fp-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 0;
        }
        .fp-modal-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1a1a1a;
        }
        .fp-modal-close {
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          padding: 6px;
          cursor: pointer;
          color: #666;
          display: flex;
          transition: all 0.2s;
        }
        .fp-modal-close:hover { background: #eee; color: #333; }
        .fp-modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
        .fp-modal-footer {
          padding: 0 24px 20px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        /* Tipo toggle */
        .fp-tipo-toggle {
          display: flex;
          gap: 8px;
          background: #f5f5f5;
          border-radius: 12px;
          padding: 4px;
        }
        .fp-tipo-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border: none;
          border-radius: 9px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #999;
        }
        .fp-tipo-btn.ingreso.active { background: #2ed573; color: #fff; box-shadow: 0 4px 12px rgba(46,213,115,0.3); }
        .fp-tipo-btn.egreso.active  { background: #ff6b6b; color: #fff; box-shadow: 0 4px 12px rgba(255,107,107,0.3); }
        .fp-tipo-btn:not(.active):hover { background: rgba(0,0,0,0.05); color: #555; }

        /* Campos */
        .fp-field { display: flex; flex-direction: column; gap: 5px; }
        .fp-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .fp-input {
          border: 1.5px solid #e0e0e0;
          border-radius: 10px;
          padding: 10px 13px;
          font-size: 0.93rem;
          color: #1a1a1a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #fafafa;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }
        .fp-input:focus {
          border-color: #B71C1C;
          box-shadow: 0 0 0 3px rgba(183,28,28,0.1);
          background: #fff;
        }
        .fp-textarea { resize: vertical; min-height: 60px; }
        .fp-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .fp-error {
          background: #fff5f5;
          border: 1px solid #ffcdd2;
          color: #c62828;
          border-radius: 8px;
          padding: 9px 14px;
          font-size: 0.84rem;
          font-weight: 600;
        }

        /* Botones footer modal */
        .fp-btn-cancel {
          background: #f0f0f0;
          color: #666;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .fp-btn-cancel:hover { background: #e0e0e0; }
        .fp-btn-save {
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          color: #fff;
        }
        .fp-btn-save.ingreso { background: #2ed573; }
        .fp-btn-save.egreso  { background: #ff6b6b; }
        .fp-btn-save:hover { opacity: 0.9; transform: translateY(-1px); }
        .fp-btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        @keyframes spin-anim { to { transform: rotate(360deg); } }
        .spin { animation: spin-anim 0.8s linear infinite; }
      `}</style>
    </div>
  )
}
