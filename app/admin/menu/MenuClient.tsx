'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Search, Image as ImageIcon, LayoutGrid, Package, EyeOff, Eye, ChefHat } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import CategoriaModal from './CategoriaModal'
import ProductoModal from './ProductoModal'
import RecetaModal from './RecetaModal'

interface Categoria {
  id: string
  nombre: string
  icono: string
  orden: number
  activa: boolean
}

interface Producto {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string
  precio: number
  precio_oferta: number | null
  en_oferta: boolean
  imagen_url: string | null
  disponible: boolean
  orden: number
  categorias: { nombre: string }
}

interface Props {
  categoriasIniciales: Categoria[]
  productosIniciales: Producto[]
}

export default function MenuClient({ categoriasIniciales, productosIniciales }: Props) {
  const [activeTab, setActiveTab] = useState<'productos' | 'categorias'>('productos')
  const [busqueda, setBusqueda] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // Modal States
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [isRecetaModalOpen, setIsRecetaModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [editingProd, setEditingProd] = useState<Producto | null>(null)
  const [recetaConfig, setRecetaConfig] = useState<{id: string, nombre: string} | null>(null)

  const handleSuccess = () => {
    router.refresh()
  }

  const handleToggleDisponible = async (id: string, estadoActual: boolean) => {
    const accion = estadoActual ? 'desactivar' : 'reactivar'
    if (!confirm(`¿Deseas ${accion} este producto?`)) return

    try {
      const { error } = await supabase
        .from('productos')
        .update({ disponible: !estadoActual })
        .eq('id', id)
      if (error) throw error
      toast.success(estadoActual ? 'Producto desactivado. Ya no aparece en el POS.' : 'Producto reactivado correctamente.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    }
  }

  const handleEliminarProducto = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${nombre}"? Esta acción no se puede deshacer.`)) return

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Producto eliminado correctamente.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el producto')
    }
  }

  const productosFiltrados = productosIniciales.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categorias?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const categoriasFiltradas = categoriasIniciales.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="menu-admin animate-fade-in">
      
      {/* HEADER ACTIONS */}
      <div className="menu-header-actions">
        
        {/* Tabs */}
        <div className="menu-tabs">
          <button 
            className={`menu-tab ${activeTab === 'productos' ? 'active' : ''}`}
            onClick={() => setActiveTab('productos')}
          >
            <Package size={18} /> Platos y Productos
          </button>
          <button 
            className={`menu-tab ${activeTab === 'categorias' ? 'active' : ''}`}
            onClick={() => setActiveTab('categorias')}
          >
            <LayoutGrid size={18} /> Categorías
          </button>
        </div>

        {/* Búsqueda y Añadir */}
        <div className="menu-tools">
          <div className="input-icon-wrap w-full">
            <Search className="icon text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar ${activeTab}...`} 
              className="input-field has-icon"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary btn-icon" 
            onClick={() => {
              if (activeTab === 'categorias') {
                setEditingCat(null)
                setIsCatModalOpen(true)
              } else {
                setEditingProd(null)
                setIsProdModalOpen(true)
              }
            }}
          >
            <Plus size={18} /> Nuevo {activeTab === 'productos' ? 'Producto' : 'Categoría'}
          </button>
        </div>

      </div>

      {/* CONTENIDO PRODUCTOS */}
      {activeTab === 'productos' && (
        <div className="menu-grid">
          {productosFiltrados.length === 0 && (
            <div className="menu-empty">
              No hay productos que coincidan con la búsqueda.
            </div>
          )}

          {productosFiltrados.map(prod => (
            <div key={prod.id} className={`menu-card product-card ${!prod.disponible ? 'disabled' : ''}`}>
              
              <div className="product-img-wrap">
                {prod.imagen_url ? (
                  <Image src={prod.imagen_url} alt={prod.nombre} fill className="product-img" />
                ) : (
                  <div className="product-noimg">
                    <ImageIcon size={32} />
                    <span>Sin imagen</span>
                  </div>
                )}
                {prod.en_oferta && (
                  <div className="badge badge-yellow product-badge">OFERTA</div>
                )}
                {!prod.disponible && (
                  <div className="product-overlay">
                    <span className="badge badge-red">Agotado / Inactivo</span>
                  </div>
                )}
              </div>

              <div className="product-info">
                <div className="product-header">
                  <span className="product-cat">{prod.categorias?.nombre}</span>
                  <span className="product-price">
                    Bs. {prod.en_oferta && prod.precio_oferta ? prod.precio_oferta : prod.precio}
                  </span>
                </div>
                
                <h3 className="product-name">{prod.nombre}</h3>
                <p className="product-desc">{prod.descripcion || 'Sin descripción'}</p>
                
                <div className="product-actions">
                  <button 
                    className="btn btn-ghost flex-1"
                    onClick={() => {
                      setEditingProd(prod)
                      setIsProdModalOpen(true)
                    }}
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button 
                    className="btn btn-ghost flex-1"
                    style={{ color: 'var(--yellow)' }}
                    onClick={() => {
                      setRecetaConfig({ id: prod.id, nombre: prod.nombre })
                      setIsRecetaModalOpen(true)
                    }}
                  >
                    <ChefHat size={16} /> Receta
                  </button>
                  <button 
                    className="btn btn-icon-only hover-danger"
                    style={{ color: prod.disponible ? 'var(--text-400)' : '#4CAF50' }}
                    title={prod.disponible ? 'Desactivar producto' : 'Reactivar producto'}
                    onClick={() => handleToggleDisponible(prod.id, prod.disponible)}
                  >
                    {prod.disponible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button 
                    className="btn btn-icon-only hover-danger text-gray-400"
                    title="Eliminar producto"
                    onClick={() => handleEliminarProducto(prod.id, prod.nombre)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONTENIDO CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="menu-grid cats-grid">
           {categoriasFiltradas.length === 0 && (
            <div className="menu-empty">
              No hay categorías que coincidan.
            </div>
          )}

          {categoriasFiltradas.map(cat => (
            <div key={cat.id} className="menu-card cat-card">
              <div className="cat-icon-wrap">{cat.icono}</div>
              <div className="cat-info">
                <h3 className="cat-name">{cat.nombre}</h3>
                <p className="cat-order">Orden de vista: {cat.orden}</p>
              </div>
              <div className="cat-actions">
                 <button 
                    className="btn btn-icon-only text-gray-300"
                    onClick={() => {
                      setEditingCat(cat)
                      setIsCatModalOpen(true)
                    }}
                  >
                    <Edit2 size={16} />
                 </button>
                 <button 
                    className="btn btn-icon-only text-gray-400 hover-danger"
                    title="Eliminar categoría"
                    onClick={async () => {
                      if (!confirm('¿Eliminar esta categoría?')) return
                      const { error } = await supabase.from('categorias').delete().eq('id', cat.id)
                      if (error) toast.error('No se puede eliminar: tiene productos asignados.')
                      else { toast.success('Categoría eliminada'); router.refresh() }
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      <CategoriaModal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        categoriaToEdit={editingCat} 
        onSuccess={handleSuccess} 
      />
      <ProductoModal 
        isOpen={isProdModalOpen} 
        onClose={() => setIsProdModalOpen(false)} 
        productoToEdit={editingProd} 
        categorias={categoriasIniciales}
        onSuccess={handleSuccess} 
      />
      <RecetaModal
        isOpen={isRecetaModalOpen}
        onClose={() => { setIsRecetaModalOpen(false); setRecetaConfig(null); }}
        productoId={recetaConfig?.id || null}
        productoNombre={recetaConfig?.nombre || null}
      />

      <style>{`
        .menu-header-actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .menu-header-actions {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .menu-tabs {
          display: flex;
          background: var(--bg-800);
          padding: 4px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          width: max-content;
        }

        .menu-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-radius: var(--radius-md);
          font-weight: 600;
          color: var(--text-400);
          transition: var(--transition);
        }
        .menu-tab:hover {
          color: var(--text-100);
        }
        .menu-tab.active {
          background: var(--bg-700);
          color: var(--text-100);
          box-shadow: var(--shadow-sm);
        }

        .menu-tools {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }
        
        .cats-grid {
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        }

        .menu-empty {
          grid-column: 1 / -1;
          padding: 48px 0;
          text-align: center;
          color: var(--text-500);
        }

        .menu-card {
          background: var(--bg-800);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          transition: var(--transition);
        }
        .menu-card:hover {
          border-color: var(--border-hover);
        }

        /* PRODUCT CARDS */
        .product-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .product-card.disabled {
          border-color: rgba(211,47,47,0.3);
          opacity: 0.8;
        }

        .product-img-wrap {
          height: 160px;
          width: 100%;
          background: var(--bg-900);
          position: relative;
        }
        .product-img {
          object-fit: cover;
        }
        .product-noimg {
          width: 100%; height: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: var(--text-500);
          font-size: 0.8rem;
          gap: 8px;
        }

        .product-badge {
          position: absolute; top: 12px; left: 12px; z-index: 10;
        }
        .product-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10;
        }

        .product-info {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .product-header {
          display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;
        }
        .product-cat {
          font-size: 0.75rem; color: var(--text-400); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;
        }
        .product-price {
          font-size: 1.15rem; font-weight: 800; color: var(--yellow);
        }

        .product-name {
          font-size: 1.1rem; font-weight: 800; color: var(--text-100); line-height: 1.25; margin-bottom: 8px;
        }
        .product-desc {
          font-size: 0.85rem; color: var(--text-400); flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 16px;
        }

        .product-actions {
          display: flex; align-items: center; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border);
        }
        .hover-danger:hover {
          color: var(--red-light); background: rgba(211,47,47,0.1);
        }

        /* CAT CARDS */
        .cat-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cat-icon-wrap {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--bg-900); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .cat-info { flex: 1; }
        .cat-name { font-size: 1.1rem; font-weight: 800; color: var(--text-100); }
        .cat-order { font-size: 0.75rem; color: var(--text-400); margin-top: 4px; }
      `}</style>
    </div>
  )
}
