'use client'

import { useState } from 'react'
import { X, CheckCircle2, ChevronRight } from 'lucide-react'

// ─── CONFIGURACIÓN DE PRESAS Y ACOMPAÑAMIENTOS ────────────────────────────────
// Edita estas listas para cambiar las opciones disponibles en el POS
export const PRESAS_DISPONIBLES = [
  { id: 'pechuga',  label: 'Pechuga',  emoji: '🍗' },
  { id: 'pierna',   label: 'Pierna',   emoji: '🦵' },
  { id: 'ala',      label: 'Ala',      emoji: '🍗' },
  { id: 'muslo',    label: 'Muslo',    emoji: '🦴' },
]

export const ACOMPAÑAMIENTOS_DISPONIBLES = [
  { id: 'arroz',    label: 'Arroz',       emoji: '🍚' },
  { id: 'papas',    label: 'Papas Fritas', emoji: '🍟' },
  { id: 'ensalada', label: 'Ensalada',    emoji: '🥗' },
  { id: 'yuca',     label: 'Yuca',        emoji: '🌿' },
]
// ──────────────────────────────────────────────────────────────────────────────

export interface SeleccionPremiun {
  presas: string[]
  acompañamientos: string[]
}

interface Props {
  nombreProducto: string
  onConfirmar: (seleccion: SeleccionPremiun) => void
  onCancelar: () => void
}

export function formatearNotas(seleccion: SeleccionPremiun): string {
  const partes: string[] = []
  if (seleccion.presas.length > 0) {
    partes.push('Presas: ' + seleccion.presas.join(', '))
  }
  if (seleccion.acompañamientos.length > 0) {
    partes.push('Con: ' + seleccion.acompañamientos.join(', '))
  }
  return partes.join(' | ')
}

export default function PresasModal({ nombreProducto, onConfirmar, onCancelar }: Props) {
  const [presasSeleccionadas, setPresasSeleccionadas] = useState<string[]>([])
  const [acompañamientosSeleccionados, setAcompañamientosSeleccionados] = useState<string[]>([])

  const togglePresa = (id: string) => {
    setPresasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const toggleAcompa = (id: string) => {
    setAcompañamientosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handleConfirmar = () => {
    onConfirmar({
      presas: presasSeleccionadas.map(id => PRESAS_DISPONIBLES.find(p => p.id === id)!.label),
      acompañamientos: acompañamientosSeleccionados.map(id => ACOMPAÑAMIENTOS_DISPONIBLES.find(a => a.id === id)!.label),
    })
  }

  const totalSeleccionado = presasSeleccionadas.length + acompañamientosSeleccionados.length

  return (
    <div className="presas-overlay">
      <div className="presas-modal animate-fade-in-scale">
        
        {/* Header */}
        <div className="presas-header">
          <div>
            <h2 className="presas-title">Personalizar Pedido</h2>
            <p className="presas-subtitle">{nombreProducto}</p>
          </div>
          <button onClick={onCancelar} className="presas-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="presas-body">
          
          {/* Sección Presas */}
          <div className="presas-section">
            <div className="presas-section-header">
              <span className="presas-section-icon">🍗</span>
              <div>
                <h3 className="presas-section-title">Elige las Presas</h3>
                <p className="presas-section-hint">Selecciona una o más presas</p>
              </div>
            </div>
            <div className="presas-options-grid">
              {PRESAS_DISPONIBLES.map(presa => {
                const selected = presasSeleccionadas.includes(presa.id)
                return (
                  <button
                    key={presa.id}
                    className={`presas-option-btn ${selected ? 'selected' : ''}`}
                    onClick={() => togglePresa(presa.id)}
                  >
                    <span className="presa-emoji">{presa.emoji}</span>
                    <span className="presa-label">{presa.label}</span>
                    {selected && <CheckCircle2 size={16} className="presa-check" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="presas-divider" />

          {/* Sección Acompañamientos */}
          <div className="presas-section">
            <div className="presas-section-header">
              <span className="presas-section-icon">🍚</span>
              <div>
                <h3 className="presas-section-title">Acompañamientos</h3>
                <p className="presas-section-hint">¿Con qué viene servido?</p>
              </div>
            </div>
            <div className="presas-options-grid">
              {ACOMPAÑAMIENTOS_DISPONIBLES.map(acompa => {
                const selected = acompañamientosSeleccionados.includes(acompa.id)
                return (
                  <button
                    key={acompa.id}
                    className={`presas-option-btn acompa ${selected ? 'selected' : ''}`}
                    onClick={() => toggleAcompa(acompa.id)}
                  >
                    <span className="presa-emoji">{acompa.emoji}</span>
                    <span className="presa-label">{acompa.label}</span>
                    {selected && <CheckCircle2 size={16} className="presa-check" />}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="presas-footer">
          <button onClick={onCancelar} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            className="btn btn-primary presas-confirm-btn"
            onClick={handleConfirmar}
          >
            <CheckCircle2 size={18} />
            Agregar al Pedido
            {totalSeleccionado > 0 && (
              <span className="presas-count-badge">{totalSeleccionado}</span>
            )}
          </button>
        </div>

      </div>

      <style>{`
        .presas-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 16px;
        }

        .presas-modal {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.7);
        }

        .presas-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: var(--bg-900);
          flex-shrink: 0;
        }
        .presas-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-100);
        }
        .presas-subtitle {
          font-size: 0.85rem;
          color: var(--yellow);
          font-weight: 600;
          margin-top: 2px;
        }
        .presas-close-btn {
          background: var(--bg-700);
          color: var(--text-400);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }
        .presas-close-btn:hover {
          background: rgba(211,47,47,0.15);
          color: var(--red);
        }

        .presas-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .presas-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 4px 0;
        }

        .presas-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .presas-section-icon {
          font-size: 1.8rem;
          width: 44px;
          height: 44px;
          background: var(--bg-700);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .presas-section-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-100);
        }
        .presas-section-hint {
          font-size: 0.8rem;
          color: var(--text-500);
          margin-top: 2px;
        }

        .presas-options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .presas-option-btn {
          background: var(--bg-700);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-300);
          font-weight: 600;
          font-size: 0.9rem;
          transition: var(--transition);
          position: relative;
          text-align: left;
        }
        .presas-option-btn:hover {
          border-color: var(--border-hover);
          background: var(--bg-600);
        }
        .presas-option-btn.selected {
          border-color: var(--red);
          background: rgba(211,47,47,0.1);
          color: var(--text-100);
        }
        .presas-option-btn.acompa.selected {
          border-color: var(--yellow);
          background: rgba(253,216,53,0.08);
          color: var(--text-100);
        }

        .presa-emoji { font-size: 1.3rem; flex-shrink: 0; }
        .presa-label { flex: 1; }
        .presa-check {
          color: var(--red);
          flex-shrink: 0;
        }
        .presas-option-btn.acompa .presa-check {
          color: var(--yellow);
        }

        .presas-divider {
          height: 1px;
          background: var(--border);
          margin: 16px 0;
        }

        .presas-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          background: var(--bg-900);
          flex-shrink: 0;
        }

        .presas-confirm-btn {
          position: relative;
          padding-right: 20px;
        }
        .presas-count-badge {
          background: rgba(255,255,255,0.25);
          color: #fff;
          border-radius: 99px;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 7px;
          min-width: 20px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .presas-options-grid {
            grid-template-columns: 1fr 1fr;
          }
          .presas-modal {
            max-height: 95vh;
          }
        }
      `}</style>
    </div>
  )
}
