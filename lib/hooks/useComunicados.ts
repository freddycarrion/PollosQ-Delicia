import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Comunicado {
  id: string
  titulo: string
  mensaje: string
  fecha: string
  created_at?: string
  roles_destino: string[] | null
}

/**
 * Hook reutilizable para suscribirse a comunicados del admin en tiempo real.
 * Filtra automáticamente por el rol del usuario.
 *
 * @param rol - Rol del usuario actual ('cajero', 'mesero', etc.)
 * @param initialData - Datos precargados desde el servidor (SSR)
 * @returns { comunicados, unseenCount, markAsSeen }
 */
export function useComunicados(rol: string, initialData: Comunicado[] = []) {
  const supabase = createClient()
  const [comunicados, setComunicados]   = useState<Comunicado[]>(initialData)
  const [unseenCount, setUnseenCount]   = useState(0)

  // Calcular no-leídos inicialmente desde localStorage
  useEffect(() => {
    const lastViewed = localStorage.getItem('lastViewedComunicados')
    if (!lastViewed) {
      setUnseenCount(comunicados.length)
    } else {
      const viewedTime = new Date(lastViewed).getTime()
      const nuevos = comunicados.filter(c => {
        const fecha = c.created_at || c.fecha
        return fecha ? new Date(fecha).getTime() > viewedTime : false
      })
      setUnseenCount(nuevos.length)
    }
  }, []) // Solo en el montado inicial

  // Suscripción Realtime a nuevos comunicados
  useEffect(() => {
    const channel = supabase
      .channel(`comunicados-${rol}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comunicados' }, payload => {
        const nuevo = payload.new as Comunicado
        const roles: string[] = nuevo.roles_destino || []
        const esParaMi = roles.length === 0 || roles.includes(rol)

        if (esParaMi) {
          setComunicados(prev => [nuevo, ...prev])
          setUnseenCount(prev => prev + 1)
          toast.success(`Nuevo aviso: ${nuevo.titulo}`, { icon: '📢', duration: 8000 })
          
          // Opcional: Sonido
          if (typeof window !== 'undefined') {
            const audio = new Audio('/notification.mp3') // Si tienen un sonido
            audio.play().catch(() => {})
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rol, supabase])

  /** Marca todos los comunicados como vistos (guarda timestamp en localStorage) */
  const markAsSeen = () => {
    setUnseenCount(0)
    localStorage.setItem('lastViewedComunicados', new Date().toISOString())
  }

  /** Filtra comunicados que son para este rol */
  const misComunicados = comunicados.filter(c => {
    const roles: string[] = c.roles_destino || []
    return roles.length === 0 || roles.includes(rol)
  })

  return { comunicados: misComunicados, unseenCount, markAsSeen }
}
