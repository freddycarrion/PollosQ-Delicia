'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast, { Toaster } from 'react-hot-toast'
import { Bell, Send, Trash2 } from 'lucide-react'

export default function ComunicadosClient({ comunicados: initialData, userId }: { comunicados: any[], userId: string }) {
  const supabase = createClient()
  const [data, setData] = useState(initialData)
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [rolDestino, setRolDestino] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !mensaje) return toast.error('Completa el título y mensaje.')
    
    setLoading(true)
    const roles = rolDestino === 'todos' ? [] : [rolDestino]

    try {
      const { data: newCom, error } = await supabase
        .from('comunicados')
        .insert({
          titulo,
          mensaje,
          roles_destino: roles,
          creador_id: userId
        })
        .select('*, creador_id(nombre, apellido)')
        .single()
      
      if (error) throw error;
      
      toast.success('Comunicado publicado exitosamente')
      setData([newCom, ...data])
      setTitulo('')
      setMensaje('')
      setRolDestino('todos')
    } catch (err: any) {
      toast.error('Error al publicar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar el comunicado "${titulo}"? Esta acción no se puede deshacer.`)) return

    const { error } = await supabase.from('comunicados').delete().eq('id', id)

    if (error) {
      toast.error('No se pudo eliminar: ' + error.message)
    } else {
      toast.success('Comunicado eliminado')
      setData(prev => prev.filter(c => c.id !== id))
    }
  }

  const formatFecha = (str: string) => {
    return new Date(str).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filteredData = data.filter(item => {
    const matchesSearch = item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.mensaje.toLowerCase().includes(searchTerm.toLowerCase())
    
    const rawDate = item.created_at || item.fecha
    const itemDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : ''
    const matchesDate = !filtroFecha || itemDate === filtroFecha

    const targetRoles = item.roles_destino || []
    const matchesRol = filtroRol === 'todos' || 
                       targetRoles.length === 0 ||
                       targetRoles.includes(filtroRol)

    return matchesSearch && matchesDate && matchesRol
  })

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
       <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
       
       {/* FORMULARIO */}
       <div style={{ flex: '1 1 350px', background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border)', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-100)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Send size={18} className="text-yellow" /> Redactar Aviso
          </h2>
          <form onSubmit={handlePublicar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Asunto / Título</label>
              <input 
                type="text" 
                value={titulo} 
                onChange={e => setTitulo(e.target.value)} 
                placeholder="Ej: Cambio de Menú, Reunión Mañana..." 
                style={{ width: '100%', padding: '12px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none' }} 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>Mensaje</label>
              <textarea 
                value={mensaje} 
                onChange={e => setMensaje(e.target.value)} 
                placeholder="Escribe el comunicado aquí..." 
                rows={5}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none', resize: 'vertical' }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-400)' }}>¿Para qué roles es este aviso?</label>
              <select 
                value={rolDestino} 
                onChange={e => setRolDestino(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg-900)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none', fontWeight: 700 }}
              >
                <option value="todos">Para todo el personal</option>
                <option value="cajero">Cajeros</option>
                <option value="mesero">Meseros</option>
                <option value="cocinero">Cocineros</option>
                <option value="repartidor">Repartidores</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '14px', background: 'var(--yellow)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 800, cursor: 'pointer', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? 'Publicando...' : <><Bell size={18} /> Públicar al Portal</>}
            </button>
          </form>
       </div>

       {/* HISTORIAL / FEED */}
       <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Buscar por palabra..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', background: 'var(--bg-800)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#fff', outline: 'none' }}
            />
            <input 
              type="date" 
              value={filtroFecha} 
              onChange={e => setFiltroFecha(e.target.value)} 
              style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-200)', outline: 'none' }}
            />
            <select 
              value={filtroRol} 
              onChange={e => setFiltroRol(e.target.value)}
              style={{ background: 'var(--bg-800)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-200)', outline: 'none', cursor: 'pointer' }}
            >
               <option value="todos">Todos los Roles</option>
               <option value="cajero">Cajero</option>
               <option value="mesero">Mesero</option>
               <option value="cocinero">Cocinero</option>
               <option value="repartidor">Repartidor</option>
            </select>
            <button 
              onClick={() => { setSearchTerm(''); setFiltroFecha(''); setFiltroRol('todos'); }}
              style={{ background: 'var(--bg-700)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: 'var(--radius-md)', color: 'var(--text-300)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Limpiar
            </button>
         </div>
         
         {filteredData.length === 0 ? (
           <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', color: 'var(--text-500)', border: '1px dashed var(--border)' }}>
             No se encontraron comunicados con esos filtros.
           </div>
         ) : (
           filteredData.map(item => (
             <div key={item.id} style={{ background: 'var(--bg-800)', borderRadius: 'var(--radius-xl)', padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>{item.titulo}</h3>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-400)' }}>
                     Dirigido a: <strong style={{color: 'var(--yellow)', textTransform: 'uppercase'}}>{(!item.roles_destino || item.roles_destino.length === 0) ? 'Todos' : item.roles_destino.join(', ')}</strong>
                   </span>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-500)' }}>{formatFecha(item.fecha || item.created_at)}</span>
                   <button
                     onClick={() => handleEliminar(item.id, item.titulo)}
                     title="Eliminar comunicado"
                     style={{ background: 'transparent', border: 'none', color: 'var(--text-600)', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)', transition: '0.2s', display: 'flex', alignItems: 'center' }}
                     onMouseEnter={e => (e.currentTarget.style.color = '#ef5350')}
                     onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-600)')}
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
               <p style={{ color: 'var(--text-300)', background: 'var(--bg-900)', padding: '12px', borderRadius: 'var(--radius-md)', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                 {item.mensaje}
               </p>
               {item.creador_id && (
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-500)', alignSelf: 'flex-end', marginTop: '4px' }}>
                   Autor: {item.creador_id.nombre}
                 </div>
               )}
             </div>
           ))
         )}
       </div>

    </div>
  )
}
