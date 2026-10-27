import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SnacksClient from './SnacksClient'

export default async function SnacksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol, sucursal_id, activo').eq('id', user.id).single()
  if (!perfil?.activo || !['admin', 'supervisor'].includes(perfil.rol)) redirect('/')
  let query = supabase.from('sucursales').select('id, nombre').eq('activa', true).order('nombre')
  if (perfil.rol !== 'admin') query = query.eq('id', perfil.sucursal_id)
  const { data: sucursales } = await query
  return <SnacksClient sucursales={sucursales || []} sucursalInicial={perfil.sucursal_id || sucursales?.[0]?.id || ''} />
}
