'use client'

import { useState, useEffect } from 'react'
import { X, Save, Image as ImageIcon, Package, UploadCloud, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

interface Categoria {
  id: string
  nombre: string
}

interface Producto {
  id?: string
  categoria_id: string
  nombre: string
  descripcion: string
  precio: number
  precio_oferta: number | null
  en_oferta: boolean
  imagen_url: string | null
  disponible: boolean
  orden: number
  requiere_presas: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  productoToEdit: Producto | null
  categorias: Categoria[]
  onSuccess: () => void
}

export default function ProductoModal({ isOpen, onClose, productoToEdit, categorias, onSuccess }: Props) {
  const defaultDesc = ''
  
  const [formData, setFormData] = useState<Producto>({
    categoria_id: categorias[0]?.id || '',
    nombre: '',
    descripcion: defaultDesc,
    precio: 0,
    precio_oferta: null,
    en_oferta: false,
    imagen_url: '',
    disponible: true,
    orden: 1,
    requiere_presas: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingExt, setIsUploadingExt] = useState(false)

  useEffect(() => {
    if (productoToEdit) {
      setFormData(productoToEdit)
    } else {
      setFormData({
        categoria_id: categorias[0]?.id || '',
        nombre: '',
        descripcion: defaultDesc,
        precio: 0,
        precio_oferta: null,
        en_oferta: false,
        imagen_url: '',
        disponible: true,
        orden: 1,
        requiere_presas: false,
      })
    }
  }, [productoToEdit, isOpen, categorias])

  if (!isOpen) return null

  const supabase = createClient()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Grave error: Solo puedes subir archivos de tipo imagen.')
      return
    }

    setIsUploadingExt(true)
    try {
      // Generar nombre seguro
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `${fileName}`

      // Subir al bucket 'productos'
      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Obtener URL Pública
      const { data } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath)

      setFormData({ ...formData, imagen_url: data.publicUrl })
      toast.success('¡Imagen lista!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Fallo de conexión al subir imagen Causa RLS Storage.')
    } finally {
      setIsUploadingExt(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    if (!formData.categoria_id) {
      toast.error('Debes seleccionar una categoría')
      setIsSubmitting(false)
      return
    }

    try {
      const dataToSave = {
        categoria_id: formData.categoria_id,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: formData.precio,
        precio_oferta: formData.en_oferta ? formData.precio_oferta : null,
        en_oferta: formData.en_oferta,
        imagen_url: formData.imagen_url || null,
        disponible: formData.disponible,
        orden: formData.orden,
        requiere_presas: formData.requiere_presas
      }

      if (productoToEdit?.id) {
        // Editar
        const { error } = await supabase.from('productos')
          .update(dataToSave)
          .eq('id', productoToEdit.id)

        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        // Crear
        const { error } = await supabase.from('productos')
          .insert(dataToSave)

        if (error) throw error
        toast.success('Producto creado correctamente')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Error al guardar el producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal animate-fade-in-scale" style={{ maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} className="text-yellow" style={{ color: 'var(--yellow)' }} />
            {productoToEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Nombre del Producto *</label>
              <input 
                type="text" 
                required 
                className="input-field w-full"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Combo Familiar"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoría *</label>
              <select className="input-field w-full" required value={formData.categoria_id} onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Descripción</label>
            <textarea 
              className="input-field w-full" 
              rows={3}
              value={formData.descripcion || ''}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Ej: Delicioso pollo a la leña con guarnición..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: '20px', marginBottom: '20px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Precio Regular (Bs.) *</label>
              <input 
                type="number" 
                required step="0.10" min="0"
                className="input-field w-full"
                value={formData.precio || ''}
                onChange={e => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Precio Oferta (Bs.)</label>
              <input 
                type="number" 
                step="0.10" min="0"
                className="input-field w-full"
                disabled={!formData.en_oferta}
                value={formData.precio_oferta || ''}
                onChange={e => setFormData({ ...formData, precio_oferta: parseFloat(e.target.value) || 0 })}
                placeholder={formData.en_oferta ? "Precio" : "N/A"}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', paddingBottom: '10px' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>¿En Oferta?</label>
              <input 
                type="checkbox" 
                checked={formData.en_oferta} 
                onChange={e => setFormData({ ...formData, en_oferta: e.target.checked })}
                style={{ transform: 'scale(1.2)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
               <label className="form-label flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                 <ImageIcon size={14} /> Fotografía del Pollo
               </label>
               
               {formData.imagen_url ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                     <img src={formData.imagen_url} alt="Vista Previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     <button 
                       type="button"
                       onClick={() => setFormData({...formData, imagen_url: ''})}
                       style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                     >
                       <X size={14} />
                     </button>
                  </div>
               ) : (
                 <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '140px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-800)', cursor: isUploadingExt ? 'not-allowed' : 'pointer', transition: 'var(--transition)' }}>
                   {isUploadingExt ? (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--yellow)' }}>
                       <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                       <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Subiendo foto...</span>
                     </div>
                   ) : (
                     <>
                       <UploadCloud size={28} style={{ color: 'var(--text-500)', marginBottom: '8px' }} />
                       <span style={{ fontSize: '0.85rem', color: 'var(--text-300)', fontWeight: 600 }}>Haz clic para elegir</span>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-600)' }}>o arrastra una foto aquí</span>
                       <input 
                         type="file" 
                         accept="image/*" 
                         style={{ display: 'none' }} 
                         onChange={handleImageUpload}
                         disabled={isUploadingExt}
                       />
                     </>
                   )}
                 </label>
               )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Orden</label>
              <input 
                type="number" 
                min="0"
                className="input-field w-full"
                value={formData.orden}
                onChange={e => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', background: 'var(--bg-800)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                checked={formData.disponible} 
                onChange={e => setFormData({ ...formData, disponible: e.target.checked })}
                style={{ transform: 'scale(1.5)', margin: '0 8px' }}
                id="chk-disp"
              />
              <label htmlFor="chk-disp" style={{ cursor: 'pointer', fontWeight: 600 }}>Producto Activo y Disponible</label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
              <input 
                type="checkbox" 
                checked={formData.requiere_presas} 
                onChange={e => setFormData({ ...formData, requiere_presas: e.target.checked })}
                style={{ transform: 'scale(1.5)', margin: '0 8px' }}
                id="chk-presas"
              />
              <label htmlFor="chk-presas" style={{ cursor: 'pointer', fontWeight: 600 }}>Requiere elegir presas/acompañamientos</label>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
