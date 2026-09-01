import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PosClient from './PosClient'
import AbrirTurno from './AbrirTurno'

export default async function PosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener la sucursal del cajero
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('sucursal_id, nombre, apellido, rol, sucursales(nombre)')
    .eq('id', user.id)
    .single()

  if (!perfil?.sucursal_id) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full text-gray-400">
        <h2 className="text-2xl font-bold mb-2 text-white">No tienes sucursal asignada</h2>
        <p>Contacta con el administrador para que asigne una sucursal a tu cuenta.</p>
      </div>
    )
  }

  // Verificar si hay un turno abierto
  // (usamos order + limit en vez de .single() porque .single() truena
  // si por algún motivo hay más de un turno "abierto" para el cajero,
  // dejando al usuario atascado en la pantalla de apertura)
  const { data: turnosAbiertos, error: turnoError } = await supabase
    .from('turnos')
    .select('id')
    .eq('cajero_id', user.id)
    .eq('estado', 'abierto')
    .order('fecha_apertura', { ascending: false })
    .limit(1)

  const turnoActivo = turnosAbiertos?.[0] ?? null

  // Si no hay turno activo, obligar a abrir caja
  if (!turnoActivo) {
    return <AbrirTurno 
             cajeroId={user.id} 
             sucursalId={perfil.sucursal_id} 
             cajeroNombre={perfil.nombre}
             cajeroRol={perfil.rol}
           />
  }

  // Obtener categorías activas (ordenadas por 'orden' ascendente)
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nombre, icono')
    .eq('activa', true)
    .order('orden', { ascending: true })

  if (catError) console.error("Error al cargar categorías:", catError)

  // Obtener productos disponibles (ordenados por 'orden')
  const { data: productos, error: prodError } = await supabase
    .from('productos')
    .select('id, categoria_id, nombre, descripcion, precio, precio_oferta, en_oferta, imagen_url, disponible, requiere_presas')
    .eq('disponible', true)
    .order('orden', { ascending: true })

  if (prodError) console.error("Error al cargar productos:", prodError)

  // Por si están vacíos
  const safeCategorias = categorias || []
  const safeProductos  = productos  || []

  const cajeroNombre = `${perfil.nombre} ${perfil.apellido}`
  const sucursalNombre = (perfil.sucursales as any)?.nombre || "Pollos Q' Delicia"

  return (
    <PosClient 
      categorias={safeCategorias} 
      productos={safeProductos}
      turnoId={turnoActivo.id}
      cajeroId={user.id}
      cajeroNombre={cajeroNombre}
      sucursalId={perfil.sucursal_id}
      sucursalNombre={sucursalNombre}
    />
  )
}
