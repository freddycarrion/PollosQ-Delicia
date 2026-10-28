'use client'
import { useEffect, useState } from 'react'
import { CLAVE_IMPRESORA, CONFIG_IMPRESORA, normalizarConfigImpresora, type ConfigImpresora } from './config'

export function useConfigImpresora() {
  const [config, setConfig] = useState<ConfigImpresora>(CONFIG_IMPRESORA)
  useEffect(() => {
    const cargar = () => { try { setConfig(normalizarConfigImpresora(JSON.parse(localStorage.getItem(CLAVE_IMPRESORA) || '{}'))) } catch { setConfig(CONFIG_IMPRESORA) } }
    cargar()
    window.addEventListener('impresora-config', cargar)
    window.addEventListener('storage', cargar)
    return () => { window.removeEventListener('impresora-config', cargar); window.removeEventListener('storage', cargar) }
  }, [])
  function guardar(cambio: Partial<ConfigImpresora>) {
    const siguiente = normalizarConfigImpresora({ ...config, ...cambio })
    localStorage.setItem(CLAVE_IMPRESORA, JSON.stringify(siguiente))
    setConfig(siguiente)
    window.dispatchEvent(new Event('impresora-config'))
  }
  return { config, guardar }
}
