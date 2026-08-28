'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

export default function AsistenciaPage() {
  const supabase = createClient()

  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [total, setTotal]         = useState(0)
  const [pagina, setPagina]       = useState(0)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')

  // Fecha de hoy para resaltar
  const todayStr = new Date().toISOString().split('T')[0]

  const fetchRegistros = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('bitacora_asistencia')
      .select('*, empleado_id(nombre, apellido, rol, sucursales(nombre))', { count: 'exact' })
      .order('fecha', { ascending: false })
      .order('hora_entrada', { ascending: false })
      .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1)

    // Filtro por fecha exacta
    if (filtroFecha) {
      query = query.eq('fecha', filtroFecha)
    }

    const { data, count, error } = await query

    if (!error) {
      // Filtro local por nombre (Supabase no filtra fácil en campos JOIN)
      const filtrado = busqueda
        ? (data || []).filter((r: any) => {
            const emp = r.empleado_id
            const nombre = `${emp?.nombre || ''} ${emp?.apellido || ''}`.toLowerCase()
            return nombre.includes(busqueda.toLowerCase())
          })
        : (data || [])

      setRegistros(filtrado)
      setTotal(count || 0)
    }
    setLoading(false)
  }, [supabase, pagina, filtroFecha, busqueda])

  useEffect(() => {
    fetchRegistros()
  }, [fetchRegistros])

  // Resetear página al cambiar filtros
  const handleFiltroFecha = (val: string) => { setFiltroFecha(val); setPagina(0) }
  const handleBusqueda   = (val: string) => { setBusqueda(val);   setPagina(0) }

  const formatHora = (iso: string) => {
    if (!iso) return '--:--'
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const formatFecha = (str: string) =>
    new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

  const totalPaginas = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="admin-page animate-fade-in text-white">

      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={32} style={{ color: 'var(--yellow)' }} />
          Historial de Asistencia
        </h1>
        <p style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
          Control diario del personal. Filtra por fecha o busca por nombre.
        </p>
      </div>

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', background: 'var(--bg-800)', padding: '16px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
        {/* Búsqueda por nombre */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-500)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => handleBusqueda(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtro por fecha */}
        <input
          type="date"
          value={filtroFecha}
          onChange={e => handleFiltroFecha(e.target.value)}
          style={{ padding: '10px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none' }}
        />

        {/* Limpiar */}
        {(busqueda || filtroFecha) && (
          <button
            onClick={() => { setBusqueda(''); setFiltroFecha(''); setPagina(0) }}
            style={{ padding: '10px 16px', background: 'var(--bg-700)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-300)', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Limpiar filtros
          </button>
        )}

        <div style={{ marginLeft: 'auto', color: 'var(--text-500)', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
          {loading ? 'Cargando...' : `${total} registro${total !== 1 ? 's' : ''} totales`}
        </div>
      </div>

      {/* TABLA */}
      <div style={{ background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-900)', color: '#ffffff', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Fecha</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Personal</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Rol / Sucursal</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Entrada</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Salida</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Horas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-500)' }}>Cargando registros...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-500)' }}>No se encontraron registros con esos filtros.</td></tr>
            ) : registros.map(reg => {
              const emp: any = reg.empleado_id
              const isHoy    = reg.fecha === todayStr

              let horas = '--'
              if (reg.hora_entrada && reg.hora_salida) {
                const diff = new Date(reg.hora_salida).getTime() - new Date(reg.hora_entrada).getTime()
                horas = `${(diff / 3600000).toFixed(1)} hs`
              }

              const ROL_COLOR: Record<string, string> = {
                cajero: '#64b5f6', mesero: '#81c784', cocinero: '#ffb74d',
                repartidor: '#ba68c8', limpieza: '#4dd0e1', supervisor: '#fbc02d', admin: '#ef5350'
              }

              return (
                <tr key={reg.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 20px', fontSize: '0.9rem', color: isHoy ? 'var(--yellow)' : 'var(--text-300)', fontWeight: isHoy ? 700 : 400 }}>
                    {isHoy ? 'Hoy · ' : ''}{formatFecha(reg.fecha)}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-100)' }}>
                    {emp?.nombre} {emp?.apellido}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: ROL_COLOR[emp?.rol] || '#9e9e9e' }}>{emp?.rol}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>{emp?.sucursales?.nombre || 'General'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: '#4CAF5020', color: '#81c784', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontWeight: 800 }}>
                      {formatHora(reg.hora_entrada)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: reg.hora_salida ? 'rgba(253,216,53,0.12)' : 'var(--bg-900)', color: reg.hora_salida ? 'var(--yellow)' : 'var(--text-500)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontWeight: 800 }}>
                      {reg.hora_salida ? formatHora(reg.hora_salida) : 'En turno'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-300)', fontWeight: 600 }}>
                    {horas}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
            style={{ padding: '8px 16px', background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: pagina === 0 ? 'var(--text-600)' : 'var(--text-200)', cursor: pagina === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>
            Página {pagina + 1} de {totalPaginas}
          </span>

          <button
            onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1}
            style={{ padding: '8px 16px', background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: pagina >= totalPaginas - 1 ? 'var(--text-600)' : 'var(--text-200)', cursor: pagina >= totalPaginas - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      )}

    </div>
  )
}
