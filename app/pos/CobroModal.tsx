'use client'

import { useState, useEffect } from 'react'
import { X, Banknote, CreditCard, Smartphone, CheckCircle2, SplitSquareHorizontal } from 'lucide-react'

export type MetodoPago = 'efectivo' | 'tarjeta' | 'qr'
export type TipoVenta  = 'para_llevar' | 'comer_aqui'

export interface ConfirmarVentaPayload {
  metodo: MetodoPago
  tipoVenta: TipoVenta
  montoRecibido: number
  // Pago mixto
  esMixto: boolean
  metodo2?: MetodoPago
  monto2?: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirmar: (payload: ConfirmarVentaPayload) => void
  cargando: boolean
}

const METODO_INFO = {
  efectivo:  { label: 'Efectivo',      icon: Banknote,    colorClass: 'text-green' },
  tarjeta:   { label: 'Tarjeta',       icon: CreditCard,  colorClass: 'text-blue'  },
  qr:        { label: 'QR / Billetera',icon: Smartphone,  colorClass: 'text-yellow'},
}

export default function CobroModal({ isOpen, onClose, total, onConfirmar, cargando }: Props) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [tipo, setTipo] = useState<TipoVenta>('para_llevar')
  const [montoIngresado, setMontoIngresado] = useState<string>('')

  // Pago mixto
  const [esMixto, setEsMixto] = useState(false)
  const [metodo2, setMetodo2] = useState<MetodoPago>('tarjeta')
  const [monto1Str, setMonto1Str] = useState<string>('')
  const [monto2Str, setMonto2Str] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setMetodo('efectivo')
      setTipo('para_llevar')
      setMontoIngresado('')
      setEsMixto(false)
      setMetodo2('tarjeta')
      setMonto1Str('')
      setMonto2Str('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const fmt = (n: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n)

  // ── Pago simple ──────────────────────────────────────────────
  const montoNum = parseFloat(montoIngresado || '0')
  const vuelto = montoNum - total

  const handleKey = (key: string) => {
    if (key === 'C') { setMontoIngresado(''); return }
    if (key === '⌫') { setMontoIngresado(prev => prev.slice(0, -1)); return }
    if (key === 'EXACTO') { setMontoIngresado(total.toString()); return }
    if (key === '+10') { setMontoIngresado((montoNum + 10).toString()); return }
    if (key === '+50') { setMontoIngresado((montoNum + 50).toString()); return }
    if (key === '+100') { setMontoIngresado((montoNum + 100).toString()); return }
    if (key === '.' && montoIngresado.includes('.')) return
    setMontoIngresado(prev => prev === '0' && key !== '.' ? key : prev + key)
  }

  // ── Pago mixto ───────────────────────────────────────────────
  const monto1 = parseFloat(monto1Str || '0')
  const monto2 = parseFloat(monto2Str || '0')
  const sumaMixta = monto1 + monto2
  const diferenciaMixta = total - sumaMixta
  const mixtoValido = Math.abs(diferenciaMixta) < 0.01

  const handleMixtoKey = (key: string, cual: 1 | 2) => {
    const setter = cual === 1 ? setMonto1Str : setMonto2Str
    const current = cual === 1 ? monto1Str : monto2Str
    const currentNum = cual === 1 ? monto1 : monto2

    if (key === 'C') { setter(''); return }
    if (key === '⌫') { setter(prev => prev.slice(0, -1)); return }
    if (key === 'RESTO') {
      // Autocalcular el faltante
      if (cual === 1) {
        setMonto1Str((total - monto2).toFixed(2))
      } else {
        setMonto2Str((total - monto1).toFixed(2))
      }
      return
    }
    if (key === '.' && current.includes('.')) return
    setter(prev => prev === '0' && key !== '.' ? key : prev + key)
  }

  // ── Validación y envío ───────────────────────────────────────
  const handleCobrar = () => {
    if (!esMixto) {
      if (metodo === 'efectivo' && montoNum < total) {
        alert('El monto recibido no puede ser menor al total.')
        return
      }
      onConfirmar({
        metodo,
        tipoVenta: tipo,
        montoRecibido: metodo === 'efectivo' ? montoNum : total,
        esMixto: false,
      })
    } else {
      if (!mixtoValido) {
        alert(`La suma de los montos (Bs. ${fmt(sumaMixta)}) no coincide con el total (Bs. ${fmt(total)}).`)
        return
      }
      if (metodo === metodo2) {
        alert('Los dos métodos de pago deben ser diferentes.')
        return
      }
      onConfirmar({
        metodo,
        tipoVenta: tipo,
        montoRecibido: metodo === 'efectivo' ? monto1 : total,
        esMixto: true,
        metodo2,
        monto2,
      })
    }
  }

  const canConfirm = !cargando && (
    esMixto ? mixtoValido : (metodo !== 'efectivo' || montoNum >= total)
  )

  return (
    <div className="cobro-overlay">
      <div className="cobro-modal animate-fade-in-scale">
        
        {/* Header */}
        <div className="cobro-header">
          <h2 className="cobro-title">Cobrar Pedido</h2>
          <button onClick={onClose} className="btn-close" disabled={cargando}>
            <X size={20} />
          </button>
        </div>

        <div className="cobro-body">
          
          {/* Lado Izquierdo: Configuración */}
          <div className="cobro-left">
            
            {/* Tipo de Consumo */}
            <div className="cobro-section">
              <label className="cobro-label">Tipo de Pedido</label>
              <div className="cobro-options">
                <button 
                  className={`cobro-opt-btn ${tipo === 'para_llevar' ? 'active' : ''}`}
                  onClick={() => setTipo('para_llevar')}
                >
                  <span className="text-xl">🛍️</span> Para Llevar
                </button>
                <button 
                  className={`cobro-opt-btn ${tipo === 'comer_aqui' ? 'active' : ''}`}
                  onClick={() => setTipo('comer_aqui')}
                >
                  <span className="text-xl">🍽️</span> Comer Aquí
                </button>
              </div>
            </div>

            {/* Toggle Pago Mixto */}
            <div className="cobro-section">
              <button
                className={`cobro-mixto-toggle ${esMixto ? 'active' : ''}`}
                onClick={() => setEsMixto(v => !v)}
              >
                <SplitSquareHorizontal size={18} />
                <span>{esMixto ? '✓ Pago Mixto Activo' : 'Activar Pago Mixto'}</span>
              </button>
              {esMixto && (
                <p className="cobro-mixto-hint">Combina 2 métodos de pago para el mismo pedido</p>
              )}
            </div>

            {/* Método(s) de Pago */}
            {!esMixto ? (
              <div className="cobro-section">
                <label className="cobro-label">Método de Pago</label>
                <div className="cobro-options vertical">
                  {(Object.entries(METODO_INFO) as [MetodoPago, typeof METODO_INFO.efectivo][]).map(([key, info]) => {
                    const Icon = info.icon
                    return (
                      <button
                        key={key}
                        className={`cobro-pay-btn ${metodo === key ? 'active' : ''}`}
                        onClick={() => { setMetodo(key); setMontoIngresado('') }}
                      >
                        <Icon size={22} className={info.colorClass} /> {info.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Pago Mixto: 2 selectores */
              <div className="cobro-section">
                <label className="cobro-label">Métodos de Pago</label>
                <div className="cobro-mixto-methods">
                  {/* Método 1 */}
                  <div className="cobro-mixto-method-group">
                    <span className="cobro-mixto-method-label">1er Método</span>
                    <div className="cobro-mixto-btns">
                      {(Object.entries(METODO_INFO) as [MetodoPago, typeof METODO_INFO.efectivo][]).map(([key, info]) => {
                        const Icon = info.icon
                        return (
                          <button
                            key={key}
                            className={`cobro-mixto-pay-btn ${metodo === key ? 'active' : ''}`}
                            onClick={() => setMetodo(key)}
                            disabled={metodo2 === key}
                          >
                            <Icon size={16} className={info.colorClass} />
                            <span>{info.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Método 2 */}
                  <div className="cobro-mixto-method-group">
                    <span className="cobro-mixto-method-label">2do Método</span>
                    <div className="cobro-mixto-btns">
                      {(Object.entries(METODO_INFO) as [MetodoPago, typeof METODO_INFO.efectivo][]).map(([key, info]) => {
                        const Icon = info.icon
                        return (
                          <button
                            key={key}
                            className={`cobro-mixto-pay-btn ${metodo2 === key ? 'active' : ''}`}
                            onClick={() => setMetodo2(key)}
                            disabled={metodo === key}
                          >
                            <Icon size={16} className={info.colorClass} />
                            <span>{info.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Lado Derecho: Calculadora + Montos */}
          <div className="cobro-right">
            
            {/* Display */}
            <div className="cobro-display">
              <div className="cobro-display-row">
                <span className="c-label">TOTAL A COBRAR:</span>
                <span className="c-val-total">Bs. {fmt(total)}</span>
              </div>
              
              {!esMixto ? (
                /* Display pago simple */
                metodo === 'efectivo' && (
                  <>
                    <div className="cobro-display-row mt">
                      <span className="c-label">RECIBIDO:</span>
                      <span className={`c-val-input ${montoNum < total ? 'text-danger' : ''}`}>
                        Bs. {montoIngresado ? fmt(montoNum) : '0.00'}
                      </span>
                    </div>
                    <div className="cobro-display-row highlight">
                      <span className="c-label">VUELTO:</span>
                      <span className="c-val-vuelto cursor-blink">
                        Bs. {vuelto > 0 ? fmt(vuelto) : '0.00'}
                      </span>
                    </div>
                  </>
                )
              ) : (
                /* Display pago mixto */
                <>
                  <div className="cobro-mixto-display">
                    <div className="cobro-mixto-row">
                      <span className="c-label">{METODO_INFO[metodo].label.toUpperCase()}:</span>
                      <span className={`c-val-input sm ${monto1 > total ? 'text-danger' : ''}`}>
                        Bs. {monto1Str ? fmt(monto1) : '0.00'}
                      </span>
                    </div>
                    <div className="cobro-mixto-row">
                      <span className="c-label">{METODO_INFO[metodo2].label.toUpperCase()}:</span>
                      <span className={`c-val-input sm ${monto2 > total ? 'text-danger' : ''}`}>
                        Bs. {monto2Str ? fmt(monto2) : '0.00'}
                      </span>
                    </div>
                    <div className={`cobro-mixto-diff ${mixtoValido ? 'ok' : diferenciaMixta > 0 ? 'falta' : 'excede'}`}>
                      {mixtoValido
                        ? '✓ Montos correctos'
                        : diferenciaMixta > 0
                          ? `Falta: Bs. ${fmt(diferenciaMixta)}`
                          : `Excede: Bs. ${fmt(-diferenciaMixta)}`
                      }
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Teclado/Panel */}
            {!esMixto ? (
              /* Teclado simple */
              metodo === 'efectivo' ? (
                <div className="cobro-keypad">
                  {['1','2','3','+10','4','5','6','+50','7','8','9','+100','C','0','.','⌫'].map(k => (
                    <button key={k} className={`keypad-btn ${k === 'C' || k === '⌫' || k.startsWith('+') ? 'action' : ''}`} onClick={() => handleKey(k)}>
                      {k}
                    </button>
                  ))}
                  <button className="keypad-btn action" style={{ gridColumn: 'span 4' }} onClick={() => handleKey('EXACTO')}>
                    Pago Exacto
                  </button>
                </div>
              ) : (
                <div className="cobro-no-keypad">
                  <div className="icon-wrap">
                    {metodo === 'tarjeta' ? <CreditCard size={48} className="text-blue" /> : <Smartphone size={48} className="text-yellow" />}
                  </div>
                  <p>El cobro se procesará externamente por <strong>{metodo.toUpperCase()}</strong>.</p>
                  <p className="text-sm">Asegúrate de confirmar la recepción del dinero antes de emitir el ticket.</p>
                </div>
              )
            ) : (
              /* Teclado mixto con selector de cuál campo editar */
              <MixtoKeypad
                metodo={metodo}
                metodo2={metodo2}
                monto1Str={monto1Str}
                monto2Str={monto2Str}
                total={total}
                monto1={monto1}
                monto2={monto2}
                fmt={fmt}
                onKey={handleMixtoKey}
              />
            )}

            <button 
              className="btn btn-primary btn-lg w-full mt-auto cobro-confirm-btn"
              disabled={!canConfirm}
              onClick={handleCobrar}
            >
              {cargando ? 'Procesando Venta...' : (
                <>
                  <CheckCircle2 size={24} /> Emitir Ticket
                </>
              )}
            </button>

          </div>
        </div>

      </div>

      <style>{`
        .cobro-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .cobro-modal {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 900px;
          max-height: 95vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.8);
        }

        .cobro-header {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .cobro-title { font-size: 1.2rem; font-weight: 800; color: var(--text-100); }
        .btn-close {
          background: var(--bg-700); color: var(--text-400); border-radius: 50%;
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          transition: var(--transition);
        }
        .btn-close:hover { background: rgba(211,47,47,0.1); color: var(--red); }

        .cobro-body {
          display: flex;
          flex: 1;
          overflow-y: auto;
        }

        .cobro-left {
          flex: 0 0 300px;
          padding: 16px;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 16px;
          background: var(--bg-900);
          overflow-y: auto;
        }

        .cobro-section { display: flex; flex-direction: column; gap: 8px; }
        .cobro-label { font-size: 0.75rem; font-weight: 700; color: var(--text-500); text-transform: uppercase; letter-spacing: 0.05em; }

        .cobro-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cobro-options.vertical { grid-template-columns: 1fr; }

        .cobro-opt-btn {
          background: var(--bg-800); border: 2px solid var(--border);
          padding: 10px; border-radius: var(--radius-lg);
          color: var(--text-300); font-weight: 600; font-size: 0.85rem;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          transition: var(--transition);
        }
        .cobro-opt-btn.active {
          border-color: var(--yellow); background: rgba(253,216,53,0.1); color: var(--text-100); box-shadow: var(--shadow-yellow);
        }

        .cobro-pay-btn {
          background: var(--bg-800); border: 2px solid var(--border);
          padding: 12px 14px; border-radius: var(--radius-lg);
          color: var(--text-300); font-weight: 600; font-size: 0.85rem;
          display: flex; align-items: center; gap: 10px;
          transition: var(--transition); text-align: left;
        }
        .cobro-pay-btn.active { border-color: var(--red); background: rgba(211,47,47,0.1); color: white; box-shadow: var(--shadow-red); }

        /* Mixto toggle */
        .cobro-mixto-toggle {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: var(--radius-lg);
          border: 2px solid var(--border);
          background: var(--bg-800);
          color: var(--text-400);
          font-weight: 600; font-size: 0.85rem;
          transition: var(--transition); width: 100%;
        }
        .cobro-mixto-toggle:hover { border-color: var(--border-hover); color: var(--text-200); }
        .cobro-mixto-toggle.active {
          border-color: #42A5F5;
          background: rgba(66,165,245,0.1);
          color: #42A5F5;
        }
        .cobro-mixto-hint {
          font-size: 0.75rem;
          color: var(--text-500);
          font-style: italic;
          padding-left: 4px;
        }

        /* Mixto methods */
        .cobro-mixto-methods { display: flex; flex-direction: column; gap: 12px; }
        .cobro-mixto-method-group { display: flex; flex-direction: column; gap: 6px; }
        .cobro-mixto-method-label {
          font-size: 0.72rem; font-weight: 700; color: var(--text-500);
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .cobro-mixto-btns { display: flex; flex-direction: column; gap: 5px; }
        .cobro-mixto-pay-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: var(--bg-800);
          color: var(--text-400); font-size: 0.82rem; font-weight: 600;
          transition: var(--transition); text-align: left;
        }
        .cobro-mixto-pay-btn:hover:not(:disabled) { border-color: var(--border-hover); color: var(--text-200); }
        .cobro-mixto-pay-btn.active { border-color: var(--red); background: rgba(211,47,47,0.1); color: #fff; }
        .cobro-mixto-pay-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .text-green { color: #4CAF50; }
        .text-blue { color: #42A5F5; }
        .text-yellow { color: var(--yellow); }
        .text-danger { color: var(--red-light); }

        /* Lado Derecho */
        .cobro-right {
          flex: 1; padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }

        .cobro-display {
          background: var(--bg-900);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 12px 20px;
          display: flex; flex-direction: column; gap: 4px;
          flex-shrink: 0;
        }
        .cobro-display-row { display: flex; justify-content: space-between; align-items: baseline; }
        .cobro-display-row.mt { margin-top: 8px; }
        .cobro-display-row.highlight { padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); margin-top: 4px; }
        
        .c-label { color: var(--text-500); font-weight: 700; font-size: 0.75rem; }
        .c-val-total { color: var(--text-100); font-size: 1.4rem; font-weight: 900; }
        .c-val-input { color: var(--yellow); font-size: 1.3rem; font-weight: 800; font-family: monospace; }
        .c-val-input.sm { font-size: 1.1rem; }
        .c-val-vuelto { color: #4CAF50; font-size: 1.4rem; font-weight: 900; font-family: monospace; }
        
        .cursor-blink::after {
          content: '_'; animation: blink 1s step-end infinite; opacity: 0.5; margin-left: 2px;
        }
        @keyframes blink { 50% { opacity: 0; } }

        /* Display mixto */
        .cobro-mixto-display {
          display: flex; flex-direction: column; gap: 6px;
          margin-top: 8px; padding-top: 8px;
          border-top: 1px dashed rgba(255,255,255,0.1);
        }
        .cobro-mixto-row {
          display: flex; justify-content: space-between; align-items: baseline;
        }
        .cobro-mixto-diff {
          font-size: 0.82rem; font-weight: 700;
          padding: 4px 10px; border-radius: var(--radius-md);
          text-align: center; margin-top: 4px;
        }
        .cobro-mixto-diff.ok { background: rgba(76,175,80,0.15); color: #4CAF50; }
        .cobro-mixto-diff.falta { background: rgba(211,47,47,0.15); color: var(--red-light); }
        .cobro-mixto-diff.excede { background: rgba(255,152,0,0.15); color: #FFA726; }

        .cobro-keypad {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; flex: 1;
        }
        .keypad-btn {
          background: var(--bg-700); border: 1px solid var(--border);
          border-radius: var(--radius-md); font-size: 1.1rem; font-weight: 700;
          color: var(--text-100); display: flex; align-items: center; justify-content: center;
          transition: var(--transition); box-shadow: var(--shadow-sm); height: 100%; min-height: 40px;
        }
        .keypad-btn:active { transform: scale(0.95); background: var(--bg-600); }
        .keypad-btn.action { font-size: 0.85rem; color: var(--yellow); background: rgba(253,216,53,0.05); }
        .keypad-btn.action:hover { background: rgba(253,216,53,0.15); }

        .cobro-no-keypad {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; color: var(--text-400); gap: 8px; padding: 0 40px;
          background: rgba(255,255,255,0.02); border-radius: var(--radius-xl); border: 1px dashed rgba(255,255,255,0.1);
        }
        .icon-wrap { width: 50px; height: 50px; border-radius: 50%; background: var(--bg-700); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }

        .cobro-confirm-btn {
          height: 45px; font-size: 1.1rem; border-radius: var(--radius-lg); margin-top: auto;
          flex-shrink: 0;
        }

        /* Mixto keypad panel */
        .cobro-mixto-keypad-panel {
          display: flex; flex-direction: column; gap: 10px; flex: 1;
        }
        .cobro-mixto-field-selector {
          display: flex; gap: 6px;
        }
        .cobro-mixto-field-btn {
          flex: 1; padding: 8px; border-radius: var(--radius-md);
          border: 2px solid var(--border);
          background: var(--bg-700);
          font-size: 0.8rem; font-weight: 700;
          color: var(--text-400);
          transition: var(--transition);
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .cobro-mixto-field-btn.active {
          border-color: var(--red); background: rgba(211,47,47,0.1); color: white;
        }
        .cobro-mixto-field-val {
          font-family: monospace; font-size: 1rem; font-weight: 900;
        }
        .cobro-mixto-field-name {
          font-size: 0.65rem; opacity: 0.7;
        }

        @media (max-width: 768px) {
          .cobro-body {
            flex-direction: column;
            height: auto;
            max-height: 75vh;
            overflow-y: auto;
          }
          .cobro-left {
            flex: auto;
            border-right: none;
            border-bottom: 1px solid var(--border);
            padding: 20px;
          }
          .cobro-right {
            padding: 20px;
          }
          .cobro-keypad {
            min-height: 250px;
          }
          .keypad-btn {
            min-height: 50px;
          }
          .cobro-confirm-btn {
            margin-top: 15px;
          }
        }
      `}</style>
    </div>
  )
}

// ── Sub-componente: Teclado para pago mixto ─────────────────────────────────
function MixtoKeypad({
  metodo, metodo2,
  monto1Str, monto2Str,
  total, monto1, monto2,
  fmt,
  onKey,
}: {
  metodo: MetodoPago
  metodo2: MetodoPago
  monto1Str: string
  monto2Str: string
  total: number
  monto1: number
  monto2: number
  fmt: (n: number) => string
  onKey: (key: string, cual: 1 | 2) => void
}) {
  const METODO_LABELS: Record<MetodoPago, string> = {
    efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR'
  }
  const [campoActivo, setCampoActivo] = useState<1 | 2>(1)

  return (
    <div className="cobro-mixto-keypad-panel">
      {/* Selector de campo activo */}
      <div className="cobro-mixto-field-selector">
        <button
          className={`cobro-mixto-field-btn ${campoActivo === 1 ? 'active' : ''}`}
          onClick={() => setCampoActivo(1)}
        >
          <span className="cobro-mixto-field-val">Bs. {monto1Str ? fmt(monto1) : '0.00'}</span>
          <span className="cobro-mixto-field-name">{METODO_LABELS[metodo]}</span>
        </button>
        <button
          className={`cobro-mixto-field-btn ${campoActivo === 2 ? 'active' : ''}`}
          onClick={() => setCampoActivo(2)}
        >
          <span className="cobro-mixto-field-val">Bs. {monto2Str ? fmt(monto2) : '0.00'}</span>
          <span className="cobro-mixto-field-name">{METODO_LABELS[metodo2]}</span>
        </button>
      </div>

      {/* Teclado */}
      <div className="cobro-keypad" style={{ flex: 1 }}>
        {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k => (
          <button
            key={k}
            className={`keypad-btn ${k === 'C' || k === '⌫' ? 'action' : ''}`}
            onClick={() => onKey(k, campoActivo)}
          >
            {k}
          </button>
        ))}
        <button
          className="keypad-btn action"
          style={{ gridColumn: 'span 2' }}
          onClick={() => onKey('.', campoActivo)}
        >
          .
        </button>
        <button
          className="keypad-btn action"
          style={{ gridColumn: 'span 2' }}
          onClick={() => onKey('RESTO', campoActivo)}
          title="Autocalcula el monto restante"
        >
          Completar
        </button>
        <button
          className="keypad-btn action"
          style={{ gridColumn: 'span 4' }}
          onClick={() => {
            onKey('RESTO', 1)
          }}
        >
          Auto-dividir ({fmt(total / 2)} c/u)
        </button>
      </div>
    </div>
  )
}
