import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PrestamosClient from './PrestamosClient'

export const metadata = {
  title: 'Préstamos | Pollos Q\' Delicia',
  description: 'Registro de préstamos realizados a personas y empresas.',
}

export default async function PrestamosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/admin/dashboard')
  return <PrestamosClient usuarioId={user.id} />
}
