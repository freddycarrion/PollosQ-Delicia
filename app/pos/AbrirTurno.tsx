'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wallet, ArrowRight, AlertCircle, Beer, Plus, Minus, ChevronRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Props {
  cajeroId: string
  sucursalId: string
  cajeroNombre: string
  cajeroRol: string
}

interface Bebida {
  id: string
  nombre: string
  stock: number
}

// Pasos del flujo de apertura
type Paso = 'monto' | 'bebidas'

export default function AbrirTurno({ cajeroId, sucursalId, cajeroNombre, cajeroRol }: Props) {
  const [paso, setPaso] = useState<Paso>('monto')
  const [monto, setMonto] = useState<string>('')
  const [bebidas, setBebidas] = useState<Bebida[]>([])
  const [cargandoBebidas, setCargandoBebidas] = useState(false)
  const [cargando, setCargando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Cargar bebidas disponibles (categoria "Bebidas" o similar)
  useEffect(() => {
    if (paso === 'bebidas') {
      cargarBebidas()
    }
  }, [paso])

  const cargarBebidas = async () => {
    setCargandoBebidas(true)
    try {
      // Obtener todas las categorías para encontrar la de bebidas
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('activa', true)

      // Buscar categorías que contengan "bebida" en el nombre (case-insensitive)
      const catIds = (cats || [])
        .filter(c => c.nombre.toLowerCase().includes('bebida') || c.nombre.toLowerCase().includes('refresco') || c.nombre.toLowerCase().includes('gaseosa') || c.nombre.toLowerCase().includes('jugo'))
        .map(c => c.id)

      let query = supabase
        .from('productos')
        .select('id, nombre')
        .eq('disponible', true)
        .order('nombre')

      if (catIds.length > 0) {
        query = query.in('categoria_id', catIds)
      }

      const { data: prods } = await query

      setBebidas((prods || []).map(p => ({ id: p.id, nombre: p.nombre, stock: 0 })))
    } catch (err) {
      console.error('Error cargando bebidas:', err)
    } finally {
      setCargandoBebidas(false)
    }
  }

  const cambiarStock = (id: string, delta: number) => {
    setBebidas(prev => prev.map(b =>
      b.id === id ? { ...b, stock: Math.max(0, b.stock + delta) } : b
    ))
  }

  const setStockDirecto = (id: string, valor: string) => {
    const num = parseInt(valor) || 0
    setBebidas(prev => prev.map(b =>
      b.id === id ? { ...b, stock: Math.max(0, num) } : b
    ))
  }

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault()
    setPaso('bebidas')
  }

  const handleAbrir = async () => {
    setCargando(true)
    const montoInicial = parseFloat(monto) || 0

    try {
      // 1. Crear el turno
      const { data: turno, error: turnoError } = await supabase
        .from('turnos')
        .insert({
          cajero_id: cajeroId,
          sucursal_id: sucursalId,
          monto_apertura: montoInicial,
          estado: 'abierto'
        })
        .select('id')
        .single()

      if (turnoError) throw turnoError

      // 2. Registrar stock de bebidas (solo las que tienen stock > 0)
      const bebidasConStock = bebidas.filter(b => b.stock > 0)
      if (bebidasConStock.length > 0) {
        const stockData = bebidasConStock.map(b => ({
          turno_id: turno.id,
          producto_id: b.id,
          nombre_producto: b.nombre,
          stock_inicial: b.stock,
          stock_actual: b.stock,
        }))
        const { error: stockError } = await supabase
          .from('stock_bebidas_turno')
          .insert(stockData)
        if (stockError) console.error('Error registrando stock:', stockError)
      }

      // 3. Notificación al admin (best-effort)
      await supabase.from('notificaciones').insert({
        usuario_origen_id: cajeroId,
        rol_origen: cajeroRol,
        tipo: 'caja',
        mensaje: `El/La Cajero(a) ${cajeroNombre} acaba de ABRIR su caja con Bs. ${montoInicial.toFixed(2)}${bebidasConStock.length > 0 ? ` y registró stock de ${bebidasConStock.length} bebida(s)` : ''}`
      })

      toast.success('¡Turno abierto correctamente!')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Error al abrir el turno: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="abrir-turno-container animate-fade-in">
      <div className="abrir-turno-card">

        {/* PASO 1: Monto inicial */}
        {paso === 'monto' && (
          <>
            <div className="card-icon">
              <Wallet size={48} className="text-yellow" />
            </div>

            <h1 className="title">Apertura de Caja</h1>
            <p className="subtitle">Declara el monto inicial de tu caja (sencillo) para empezar a vender.</p>

            <form onSubmit={handleSiguiente} className="form-abrir">
              <div className="input-group">
                <label>Monto Inicial (Bs.)</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">Bs.</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    required
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="alert-box">
                <AlertCircle size={16} />
                <span>Este monto será sumado a las ventas en efectivo para el cuadre final.</span>
              </div>

              <button type="submit" className="btn-abrir">
                Siguiente: Stock de Bebidas
                <ChevronRight size={20} />
              </button>
            </form>
          </>
        )}

        {/* PASO 2: Stock de bebidas */}
        {paso === 'bebidas' && (
          <>
            <div className="card-icon bebidas-icon">
              <Beer size={40} />
            </div>

            <h1 className="title">Stock de Bebidas</h1>
            <p className="subtitle">¿Cuántas bebidas tienes disponibles para vender hoy?</p>

            <div className="bebidas-lista">
              {cargandoBebidas ? (
                <div className="bebidas-loading">Cargando bebidas...</div>
              ) : bebidas.length === 0 ? (
                <div className="bebidas-empty">
                  <p>No se encontraron bebidas en el catálogo.</p>
                  <p className="bebidas-empty-hint">Asegúrate de tener una categoría llamada "Bebidas" con productos activos.</p>
                </div>
              ) : (
                bebidas.map(bebida => (
                  <div key={bebida.id} className="bebida-row">
                    <span className="bebida-nombre">🥤 {bebida.nombre}</span>
                    <div className="bebida-controls">
                      <button
                        type="button"
                        className="stock-btn minus"
                        onClick={() => cambiarStock(bebida.id, -1)}
                        disabled={bebida.stock <= 0}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="stock-input"
                        value={bebida.stock === 0 ? '' : bebida.stock}
                        placeholder="0"
                        onChange={e => setStockDirecto(bebida.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="stock-btn plus"
                        onClick={() => cambiarStock(bebida.id, 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="abrir-actions">
              <button
                type="button"
                className="btn-volver"
                onClick={() => setPaso('monto')}
                disabled={cargando}
              >
                ← Volver
              </button>
              <button
                type="button"
                className="btn-abrir"
                onClick={handleAbrir}
                disabled={cargando}
              >
                {cargando ? 'Abriendo Turno...' : 'Abrir Turno y Comenzar'}
                {!cargando && <ArrowRight size={20} />}
              </button>
            </div>
          </>
        )}

      </div>

      <style>{`
        .abrir-turno-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-900);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .abrir-turno-container::before {
          content: '';
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 300px;
          background: linear-gradient(135deg, #B71C1C 0%, #E65100 55%, #FBC02D 100%);
          border-radius: 50%;
          opacity: 0.08;
          filter: blur(40px);
          pointer-events: none;
        }

        .abrir-turno-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 44px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 20px rgba(183,28,28,0.08);
          position: relative;
          z-index: 1;
        }

        .card-icon {
          width: 88px; height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(183,28,28,0.12) 0%, rgba(230,81,0,0.12) 100%);
          color: var(--red);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          border: 2px solid rgba(230,81,0,0.15);
        }
        .card-icon.bebidas-icon {
          background: linear-gradient(135deg, rgba(33,150,243,0.12) 0%, rgba(30,136,229,0.12) 100%);
          color: #42A5F5;
          border-color: rgba(33,150,243,0.2);
        }

        .title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-100);
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 0.95rem;
          color: var(--text-400);
          margin-bottom: 28px;
          line-height: 1.6;
        }

        .form-abrir {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }

        .input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-300);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 16px;
          color: var(--text-500);
          font-weight: 700;
          font-size: 1.1rem;
        }

        .input-wrapper input {
          width: 100%;
          background: var(--bg-600);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 16px 16px 52px;
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-100);
          transition: var(--transition);
          text-align: right;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: var(--red);
          box-shadow: 0 0 0 3px rgba(211,47,47,0.15);
          background: var(--bg-500);
        }

        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(230,81,0,0.06);
          border: 1px solid rgba(230,81,0,0.15);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          color: var(--text-400);
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .alert-box svg { flex-shrink: 0; margin-top: 2px; color: #E65100; }

        /* ── Bebidas ─────────────────────── */
        .bebidas-lista {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 340px;
          overflow-y: auto;
          margin-bottom: 24px;
          text-align: left;
          padding-right: 4px;
        }
        .bebidas-lista::-webkit-scrollbar { width: 4px; }
        .bebidas-lista::-webkit-scrollbar-track { background: transparent; }
        .bebidas-lista::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .bebidas-loading {
          text-align: center;
          color: var(--text-500);
          padding: 20px;
          font-size: 0.9rem;
        }
        .bebidas-empty {
          text-align: center;
          color: var(--text-500);
          padding: 20px;
          font-size: 0.85rem;
          line-height: 1.6;
        }
        .bebidas-empty-hint {
          font-size: 0.78rem;
          color: var(--text-600);
          margin-top: 6px;
        }

        .bebida-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--bg-700);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 12px 16px;
          transition: var(--transition);
        }
        .bebida-row:hover { border-color: var(--border-hover); }

        .bebida-nombre {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-200);
          flex: 1;
          text-align: left;
        }

        .bebida-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .stock-btn {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          background: var(--bg-600);
          color: var(--text-300);
          display: flex; align-items: center; justify-content: center;
          transition: var(--transition);
          flex-shrink: 0;
        }
        .stock-btn:hover:not(:disabled) { background: var(--bg-500); color: var(--text-100); }
        .stock-btn.plus { border-color: rgba(76,175,80,0.4); color: #4CAF50; }
        .stock-btn.plus:hover { background: rgba(76,175,80,0.1); }
        .stock-btn.minus { border-color: rgba(211,47,47,0.3); color: var(--red-light); }
        .stock-btn.minus:hover:not(:disabled) { background: rgba(211,47,47,0.1); }
        .stock-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .stock-input {
          width: 52px;
          background: var(--bg-900);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-100);
          font-size: 1rem;
          font-weight: 800;
          text-align: center;
          padding: 4px 6px;
          outline: none;
          transition: var(--transition);
        }
        .stock-input:focus {
          border-color: #42A5F5;
          box-shadow: 0 0 0 2px rgba(66,165,245,0.15);
        }
        /* Ocultar flechas del input number */
        .stock-input::-webkit-outer-spin-button,
        .stock-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .stock-input[type=number] { -moz-appearance: textfield; }

        /* ── Acciones ────────────────────── */
        .abrir-actions {
          display: flex;
          gap: 12px;
        }

        .btn-volver {
          flex: 0 0 auto;
          background: var(--bg-700);
          border: 1.5px solid var(--border);
          color: var(--text-300);
          border-radius: var(--radius-lg);
          padding: 14px 18px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .btn-volver:hover:not(:disabled) {
          background: var(--bg-600);
          color: var(--text-100);
        }

        .btn-abrir {
          flex: 1;
          background: linear-gradient(135deg, #B71C1C 0%, #E65100 60%, #FBC02D 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: var(--radius-lg);
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: var(--transition);
          box-shadow: 0 4px 20px rgba(183,28,28,0.3);
        }

        .btn-abrir:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(183,28,28,0.4);
        }

        .btn-abrir:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          filter: grayscale(0.3);
        }
      `}</style>
    </div>
  )
}
