'use client'

import { useState } from 'react'
import { PlusIcon, Search, MoreVertical, Edit2, ShieldAlert, CheckCircle, XCircle } from 'lucide-react'
import EmpleadoModal from './EmpleadoModal'


interface Props {
  empleados: any[]
  sucursales: any[]
}

export default function EmpleadosClient({ empleados: initialData, sucursales }: Props) {
  const [data, setData] = useState(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSucursal, setFilterSucursal] = useState('all')
  const [filterRol, setFilterRol] = useState('all')
  
  const [isModalOpen, setModalOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<any>(null)

  // Handlers
  const handleOpenNew = () => {
    setSelectedEmpleado(null)
    setModalOpen(true)
  }
  
  const handleEdit = (empleado: any) => {
    setSelectedEmpleado(empleado)
    setModalOpen(true)
  }

  const handleSaved = (saved: any) => {
    // Si viene con ID actualiza la lista localmente
    const index = data.findIndex(e => e.id === saved.id)
    if (index >= 0) {
      const copy = [...data]
      copy[index] = saved
      setData(copy)
    } else {
      setData([saved, ...data])
    }
  }



  // Filtrado
  const filtered = data.filter(emp => {
    const matchesSearch = 
      emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.apellido?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSucursal = filterSucursal === 'all' || emp.sucursal_id === filterSucursal
    const matchesRol = filterRol === 'all' || emp.rol === filterRol
    return matchesSearch && matchesSucursal && matchesRol
  })

  return (
    <div className="admin-empleados animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* TOOLBAR */}
      <div className="toolbar" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-800)', padding: '16px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div className="search-box" style={{ position: 'relative', width: '250px', maxWidth: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-400)' }}/>
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none' }}
            />
          </div>
          
          <select 
            value={filterRol} 
            onChange={e => setFilterRol(e.target.value)}
            style={{ padding: '10px 16px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Todos los Roles</option>
            <option value="admin">Administrador</option>
            <option value="supervisor">Supervisor</option>
            <option value="cajero">Cajero</option>
            <optgroup label="Personal Operativo">
              <option value="mesero">Mesero</option>
              <option value="cocinero">Cocinero</option>
              <option value="repartidor">Repartidor</option>
              <option value="limpieza">Limpieza</option>
            </optgroup>
          </select>

          <select 
            value={filterSucursal} 
            onChange={e => setFilterSucursal(e.target.value)}
            style={{ padding: '10px 16px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Todas las Sucursales</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>

        <button onClick={handleOpenNew} className="btn-agregar" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--yellow)', color: '#000', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.2s' }}>
          <PlusIcon size={18} />
          Nuevo Personal
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="table-container" style={{ WebkitOverflowScrolling: 'touch', overflowX: 'auto', background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-900)', color: 'var(--text-400)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Personal</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Rol</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Sucursal</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Teléfono</th>
              <th style={{ padding: '16px 20px', fontWeight: 700 }}>Estado</th>
              <th style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-500)' }}>No se encontraron empleados.</td></tr>
            )}
            {filtered.map(emp => {
              const inicial = emp.nombre.charAt(0).toUpperCase()
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover:bg-opacity-5 hover:bg-white">
                  
                  {/* Avatar y Nombre */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', fontWeight: 700, color: 'var(--yellow)' }}>
                        {inicial}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '0.95rem' }}>{emp.nombre} {emp.apellido}</div>
                        <div style={{ color: 'var(--text-500)', fontSize: '0.8rem' }}>ID: {emp.id.split('-')[0]}***</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Etiqueta ROL */}
                  <td style={{ padding: '16px 20px' }}>
                     <span style={{ 
                       padding: '4px 10px', borderRadius: 'var(--radius-xl)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
                       background: 
                         emp.rol === 'admin' ? '#D32F2F20' : 
                         emp.rol === 'supervisor' ? '#F57F1720' : 
                         emp.rol === 'cajero' ? '#2196F320' :
                         emp.rol === 'mesero' ? '#4CAF5020' :
                         emp.rol === 'cocinero' ? '#FF980020' :
                         emp.rol === 'repartidor' ? '#9C27B020' :
                         emp.rol === 'limpieza' ? '#00BCD420' : '#80808020',
                       color: 
                         emp.rol === 'admin' ? '#ef5350' : 
                         emp.rol === 'supervisor' ? '#fbc02d' : 
                         emp.rol === 'cajero' ? '#64b5f6' :
                         emp.rol === 'mesero' ? '#81c784' :
                         emp.rol === 'cocinero' ? '#ffb74d' :
                         emp.rol === 'repartidor' ? '#ba68c8' :
                         emp.rol === 'limpieza' ? '#4dd0e1' : '#9e9e9e'
                     }}>
                       {emp.rol || 'Sin Rol'}
                     </span>
                  </td>

                  <td style={{ padding: '16px 20px', color: 'var(--text-300)', fontSize: '0.9rem' }}>
                    {Array.isArray(emp.sucursales) ? emp.sucursales[0]?.nombre : (emp.sucursales?.nombre || 'General / No Asignada')}
                  </td>

                  <td style={{ padding: '16px 20px', color: 'var(--text-400)', fontSize: '0.9rem' }}>
                    {emp.telefono || '—'}
                  </td>

                  {/* Etiqueta ESTADO */}
                  <td style={{ padding: '16px 20px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: emp.activo ? '#4CAF50' : '#F44336', fontSize: '0.85rem', fontWeight: 700 }}>
                       {emp.activo ? <CheckCircle size={16} /> : <XCircle size={16} />}
                       {emp.activo ? 'Activo' : 'Suspendido'}
                     </div>
                  </td>

                  <td style={{ padding: '16px 20px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => handleEdit(emp)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-400)', padding: '6px', borderRadius: '8px', transition: '0.2s' }}
                      className="hover:bg-gray-800 hover:text-white"
                      title="Editar Perfil"
                    >
                       <Edit2 size={18} />
                    </button>
                  </td>

                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <EmpleadoModal 
          onClose={() => setModalOpen(false)} 
          empleado={selectedEmpleado} 
          sucursales={sucursales}
          onSaved={handleSaved}
        />
      )}
      
      <style>{`
        .btn-agregar:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .hover\\:bg-opacity-5:hover { background-color: rgba(255, 255, 255, 0.05); }
        .hover\\:text-white:hover { color: #fff !important; }
        .hover\\:bg-gray-800:hover { background-color: var(--bg-900); }
      `}</style>
    </div>
  )
}
