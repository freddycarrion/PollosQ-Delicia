'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { cerrarTurnoComoAdmin } from './actions'

function formatoBs(monto: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto)
}

export default function CerrarTurnoAdminButton({ turnoId, empleado, montoEsperado }: {
  turnoId: string
  empleado: string
  montoEsperado: number
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleClose() {
    const confirmado = window.confirm(
      `¿Cerrar la caja de ${empleado}?\n\nSe registrará el efectivo esperado según apertura y ventas: Bs. ${formatoBs(montoEsperado)}.`
    )
    if (!confirmado) return

    setError('')
    startTransition(async () => {
      const resultado = await cerrarTurnoComoAdmin(turnoId, montoEsperado)
      if (resultado.error) {
        setError(resultado.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="admin-close-wrap">
      <button className="admin-close-turn" onClick={handleClose} disabled={pendiente}>
        <LockKeyhole size={14} /> {pendiente ? 'Cerrando…' : 'Cerrar caja'}
      </button>
      {error && <span className="admin-close-error" role="alert">{error}</span>}
      <style>{`
        .admin-close-wrap{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:112px}.admin-close-turn{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:0;border-radius:8px;background:#b71c1c;color:#fff;font-size:.78rem;font-weight:700;white-space:nowrap;cursor:pointer}.admin-close-turn:hover{background:#9d1717}.admin-close-turn:disabled{opacity:.65;cursor:wait}.admin-close-error{max-width:230px;color:#ffb4ab;font-size:.72rem}
      `}</style>
    </div>
  )
}
