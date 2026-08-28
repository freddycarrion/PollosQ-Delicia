'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast, { Toaster } from 'react-hot-toast'
import { Settings, Save, Store, DollarSign, Phone, MapPin, FileText, Percent, Moon, Sun, Palette } from 'lucide-react'

interface ConfigItem {
  id: string
  clave: string
  valor: string
  descripcion: string | null
}

const CAMPO_ICONS: Record<string, React.ReactNode> = {
  nombre_restaurante: <Store size={16} />,
  moneda:            <DollarSign size={16} />,
  nit:               <FileText size={16} />,
  ciudad:            <MapPin size={16} />,
  telefono:          <Phone size={16} />,
  mensaje_ticket:    <FileText size={16} />,
  iva_porcentaje:    <Percent size={16} />,
}

const CAMPO_LABELS: Record<string, string> = {
  nombre_restaurante: 'Nombre del Restaurante',
  moneda:             'Símbolo de Moneda',
  nit:                'NIT / Registro Tributario',
  ciudad:             'Ciudad Principal',
  telefono:           'Teléfono de Contacto',
  mensaje_ticket:     'Mensaje al pie del Ticket',
  iva_porcentaje:     'Porcentaje de IVA (%)',
}

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [valores, setValores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  
  // Estado del tema para Configuración
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    // Sincronizar estado inicial
    setIsLight(document.documentElement.classList.contains('light'))
    
    // Función original de fetch
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .order('clave')

      if (error) {
        toast.error('Error al cargar la configuración')
        return
      }

      setConfig(data || [])
      const vals: Record<string, string> = {}
      data?.forEach(item => { vals[item.clave] = item.valor })
      setValores(vals)
      setLoading(false)
    }
    fetchConfig()
  }, [supabase])

  const handleGuardar = async (clave: string) => {
    setGuardando(clave)
    const { error } = await supabase
      .from('configuracion_sistema')
      .update({ valor: valores[clave], updated_at: new Date().toISOString() })
      .eq('clave', clave)

    setGuardando(null)

    if (error) {
      toast.error('No se pudo guardar: ' + error.message)
    } else {
      toast.success(`"${CAMPO_LABELS[clave] || clave}" actualizado correctamente`)
    }
  }

  const toggleTheme = () => {
    const root = document.documentElement
    if (isLight) {
      root.classList.remove('light')
      localStorage.setItem('theme', 'dark')
      setIsLight(false)
    } else {
      root.classList.add('light')
      localStorage.setItem('theme', 'light')
      setIsLight(true)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-500)' }}>
        Cargando configuración...
      </div>
    )
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

      {/* Header */}
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={32} style={{ color: 'var(--yellow)' }} />
          Configuración del Sistema
        </h1>
        <p style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
          Ajusta los parámetros generales del restaurante. Cada campo se guarda individualmente.
        </p>
      </div>

      {/* Grid de campos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        {config.map(item => (
          <div
            key={item.id}
            style={{
              background: 'var(--bg-800)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--yellow)' }}>
                {CAMPO_ICONS[item.clave] || <Settings size={16} />}
              </span>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-200)' }}>
                {CAMPO_LABELS[item.clave] || item.clave}
              </label>
            </div>

            {/* Descripción */}
            {item.descripcion && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-500)', margin: 0 }}>
                {item.descripcion}
              </p>
            )}

            {/* Input + Botón */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type={item.clave === 'iva_porcentaje' ? 'number' : 'text'}
                value={valores[item.clave] ?? ''}
                onChange={e => setValores(prev => ({ ...prev, [item.clave]: e.target.value }))}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-900)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-100)',
                  outline: 'none',
                  fontSize: '0.95rem',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--yellow)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                onClick={() => handleGuardar(item.clave)}
                disabled={guardando === item.clave}
                style={{
                  padding: '12px 18px',
                  background: guardando === item.clave ? 'var(--bg-600)' : 'var(--yellow)',
                  color: '#000',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 800,
                  cursor: guardando === item.clave ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: '0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Save size={16} />
                {guardando === item.clave ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}

        {/* Bloque especial para Apariencia (Tema) */}
        <div style={{
          background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', 
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--yellow)' }}><Palette size={16} /></span>
            <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-200)' }}>Apariencia del Sistema</label>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-500)', margin: 0 }}>
            Cambia entre el modo oscuro por defecto y el tema claro (blanco).
          </p>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
            <button 
              onClick={toggleTheme}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-900)', border: '1px solid var(--border)', padding: '12px 18px', 
                borderRadius: 'var(--radius-md)', color: 'var(--text-100)', cursor: 'pointer',
                fontWeight: 800, transition: '0.2s', fontSize: '0.95rem'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--yellow)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isLight ? <Sun size={18} color="var(--yellow)" /> : <Moon size={18} />}
                <span>{isLight ? 'Modo Claro Activado' : 'Cambiar a Modo Claro'}</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
