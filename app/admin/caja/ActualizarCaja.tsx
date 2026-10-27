'use client'
import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function ActualizarCaja() {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh())
    }, 30000)
    return () => clearInterval(timer)
  }, [router])
  return <button className="btn btn-ghost" disabled={pendiente} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={16} /> {pendiente ? 'Actualizando…' : 'Actualizar caja'}</button>
}
