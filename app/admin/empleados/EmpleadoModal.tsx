'use client'

import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { X, Save, User as UserIcon, Lock, Mail } from 'lucide-react'
import { crearUsuarioAuth, guardarPerfil } from './actions'

interface Props {
  empleado: any | null
  sucursales: any[]
  onClose: () => void
  onSaved: (empleado: any) => void
}

export default function EmpleadoModal({ empleado, sucursales, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  
  // Campos
  const [nombre, setNombre] = useState(empleado?.nombre || '')
  const [apellido, setApellido] = useState(empleado?.apellido || '')
  const [telefono, setTelefono] = useState(empleado?.telefono || '')
  const [rol, setRol] = useState(empleado?.rol || 'cajero')
  const [sucursalId, setSucursalId] = useState(empleado?.sucursal_id || '')
  const [activo, setActivo] = useState(empleado ? empleado.activo : true)

  // Auth creation only fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const isEditing = !!empleado

  useEffect(() => {
    setNombre(empleado?.nombre || '')
    setApellido(empleado?.apellido || '')
    setTelefono(empleado?.telefono || '')
    setRol(empleado?.rol || 'cajero')
    setActivo(empleado ? empleado.activo : true)
    // Pre-selecciona la sucursal asignada, o la primera disponible si no tiene
    setSucursalId(empleado?.sucursal_id || (sucursales[0]?.id ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGuardar = async () => {
    if (!nombre || !apellido || !rol) return toast.error('Rellena los campos obligatorios.')

    setLoading(true)
    let finalId = empleado?.id

    // Crear Nuevo (Auth User primero, usando Server Action seguro)
    if (!isEditing) {
      if (!email || !password || password.length < 6) {
        setLoading(false)
        return toast.error('Email y Contraseña válidos (>6 chars) son necesarios para el acceso del empleado.')
      }

      const result = await crearUsuarioAuth(email, password)

      if (result.error) {
        setLoading(false)
        return toast.error('Error al crear la cuenta: ' + result.error)
      }

      finalId = result.userId
    }

    // Upsert a la tabla Perfiles (via Server Action con service_role)
    const result = await guardarPerfil({
        id: finalId!,
        nombre,
        apellido,
        telefono,
        rol,
        sucursal_id: sucursalId || null,
        activo
    })

    setLoading(false)

    if (result.error) {
        toast.error('Error al vincular el perfil: ' + result.error)
    } else {
        toast.success(isEditing ? 'Empleado actualizado correctamente' : '¡Cajero/Supervisor Creado!')
        onSaved(result.data)
        onClose()
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <div className="modal-content" style={{ background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', width: '100%', maxWidth: '500px', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', transform: 'translateY(10px)', animation: 'slideUp 0.3s forwards ease-out' }}>
        
        {/* Header Modal */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-900)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon size={20} className="text-yellow" />
            {isEditing ? 'Editar Perfil del Empleado' : 'Registrar Nuevo Empleado'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-400)', cursor: 'pointer' }} className="hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Formulario */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>NOMBRE <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Juan" style={inputStyle} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>APELLIDO <span style={{ color: 'red' }}>*</span></label>
              <input type="text" value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="Ej. Pérez" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
             <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>TELÉFONO CONTACTO</label>
             <input type="text" value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="+591 7XXXXXXX" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {isEditing && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>SUCURSAL ASIGNADA</label>
                <select value={sucursalId} onChange={e=>setSucursalId(e.target.value)} style={inputStyle}>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
               <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>ROL EN SISTEMA <span style={{ color: 'red' }}>*</span></label>
               <select value={rol} onChange={e=>setRol(e.target.value)} style={inputStyle}>
                  <option value="cajero">Cajero (Punto de Venta)</option>
                  <option value="supervisor">Supervisor (Inventario)</option>
                  <option value="admin">Administrador (Total)</option>
                  <optgroup label="Personal Operativo">
                    <option value="mesero">Mesero</option>
                    <option value="cocinero">Cocinero</option>
                    <option value="repartidor">Repartidor (Delivery)</option>
                    <option value="limpieza">Personal de Limpieza</option>
                  </optgroup>
               </select>
            </div>
          </div>

          {/* CREDENCIALES SOLO EN CREACIÓN */}
          {!isEditing && (
             <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(33, 150, 243, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(33, 150, 243, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ color: '#2196F3', fontSize: '0.85rem', fontWeight: 600 }}>🔒 Credenciales de Acceso para el nuevo empleado</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                   <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Mail size={14}/> CORREO ELECTRÓNICO (Usuario)
                   </label>
                   <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="juan.cajero@tiasarita.com" autoComplete="off" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                   <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Lock size={14}/> CONTRASEÑA MÍNIMA
                   </label>
                   <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 caracteres" autoComplete="off" style={inputStyle} />
                </div>
             </div>
          )}

          {/* ESTADO SI ES EDICIÓN */}
          {isEditing && (
            <div style={{ marginTop: '8px', padding: '16px', background: 'var(--bg-900)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={activo} 
                  onChange={(e) => setActivo(e.target.checked)} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--yellow)' }} 
                />
                <span style={{ fontWeight: 700, color: 'var(--text-100)', fontSize: '0.9rem' }}>
                  Permitir Acceso al Sistema
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: activo ? '#4CAF50' : '#F44336', fontWeight: 800 }}>
                  {activo ? 'ESTADO: ACTIVO' : 'ESTADO: SUSPENDIDO'}
                </span>
              </label>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-900)' }}>
          <button onClick={onClose} disabled={loading} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-400)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading} style={{ padding: '10px 24px', background: 'var(--yellow)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Procesando...' : <><Save size={18}/> {isEditing ? 'Actualizar Ficha' : 'Dar de Alta'}</>}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '12px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-100)', outline: 'none' };
