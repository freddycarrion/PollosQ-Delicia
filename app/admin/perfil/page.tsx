import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilClient from './PerfilClient'

export const metadata = {
  title: "Mi Perfil | Pollos Q' Delicia",
}

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, apellido, rol, telefono, sucursal_id, sucursales(nombre)')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  return (
    <PerfilClient 
      user={user}
      perfil={perfil}
    />
  )
}
