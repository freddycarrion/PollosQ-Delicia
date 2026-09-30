'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  turnoId: string
  cajeroNombre: string
  cajeroRol: string
}

export default function CerrarTurnoModal({ isOpen, onClose, turnoId, cajeroNombre, cajeroRol }: Props) {
  const [cargando, setCargando] = useState(false)
  const [datosTurno, setDatosTurno] = useState<{ apertura: number; ventas: number } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      supabase.from('turnos').select('monto_apertura, total_efectivo').eq('id', turnoId).single()
        .then(({ data, error }) => {
          if (!error && data) {
            setDatosTurno({
              apertura: data.monto_apertura || 0,
              ventas: data.total_efectivo || 0
            })
          }
        })
    } else {
      setDatosTurno(null)
    }
  }, [isOpen, turnoId, supabase])

  if (!isOpen) return null

  const esperado = datosTurno ? datosTurno.apertura + datosTurno.ventas : 0
  const fmt = (n: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2 }).format(n)

  async function handleCerrar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)

    try {
      const authData = await supabase.auth.getUser()
      const userId = authData.data.user?.id

      if (!userId) throw new Error("No autenticado")

      // Calcular cierre exacto nuevamente por seguridad
      const { data: turno } = await supabase.from('turnos')
        .select('monto_apertura, total_efectivo')
        .eq('id', turnoId).single()
      
      const cierreFinal = (turno?.monto_apertura || 0) + (turno?.total_efectivo || 0)

      // Cerrar Turno automáticamente cuadrado
      const { error } = await supabase.from('turnos').update({
        estado: 'cerrado',
        monto_cierre: cierreFinal,
        fecha_cierre: new Date().toISOString()
      }).eq('id', turnoId)

      if (error) throw error

      // Enviar Notificación al Admin
      await supabase.from('notificaciones').insert({
        usuario_origen_id: userId,
        rol_origen: cajeroRol,
        tipo: 'caja',
        mensaje: `El/La Cajero(a) ${cajeroNombre} acaba de CERRAR su caja y terminar su turno con Bs. ${fmt(cierreFinal)}.`
      })

      toast.success('Turno cerrado correctamente')
      onClose()
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error('Error al cerrar caja: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in-scale" style={{ maxWidth: '400px' }}>
        
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} className="text-red" style={{ color: 'var(--red)' }} /> 
            Cierre de Caja
          </h2>
          <button onClick={onClose} disabled={cargando} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCerrar} className="modal-body" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <Lock size={48} style={{ color: 'var(--red)', margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', color: 'var(--text-100)' }}>
              ¿Finalizar turno de caja?
            </h3>
            <p style={{ color: 'var(--text-400)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0, marginBottom: '20px' }}>
              Esta acción declarará la caja como cerrada. Debes contar tu efectivo y asegurarte de tener el monto exacto antes de continuar.
            </p>

            {datosTurno ? (
              <div style={{ background: 'var(--bg-900)', borderRadius: '8px', padding: '16px', textAlign: 'left', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-400)', fontSize: '0.9rem' }}>
                  <span>Monto de Apertura:</span>
                  <span>Bs. {fmt(datosTurno.apertura)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-400)', fontSize: '0.9rem' }}>
                  <span>Ventas en Efectivo:</span>
                  <span>+ Bs. {fmt(datosTurno.ventas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px', color: 'var(--text-100)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  <span>Total Exacto a Entregar:</span>
                  <span style={{ color: 'var(--green)' }}>Bs. {fmt(esperado)}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-500)', fontSize: '0.9rem' }}>Calculando montos...</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button type="button" onClick={onClose} disabled={cargando} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={cargando || !datosTurno} className="btn btn-primary" style={{ flex: 1, background: 'var(--red)', borderColor: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {cargando ? 'Cerrando...' : <><CheckCircle2 size={18} /> Confirmar Cierre</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
