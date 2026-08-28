'use server'

import { createClient } from '@supabase/supabase-js'

/**
 * Server Action: Crea un nuevo usuario en Supabase Auth usando la SERVICE_ROLE KEY.
 * Esto se ejecuta SOLO en el servidor — la clave nunca llega al navegador.
 *
 * Devuelve { userId } si tuvo éxito, o { error } si falló.
 */
export async function crearUsuarioAuth(email: string, password: string): Promise<
  { userId: string; error?: never } |
  { userId?: never; error: string }
> {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return { error: 'Faltan variables de entorno del servidor (SUPABASE_SERVICE_ROLE_KEY).' }
  }

  // Cliente admin con service_role — solo existe en el servidor
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // Confirmar email automáticamente (no requiere que el empleado confirme)
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'No se pudo crear el usuario.' }
  }

  return { userId: data.user.id }
}

/**
 * Server Action: Guarda (crea o actualiza) el perfil de un empleado.
 * Usa service_role para bypassear RLS completamente.
 */
export async function guardarPerfil(perfilData: {
  id: string
  nombre: string
  apellido: string
  telefono?: string
  rol: string
  sucursal_id?: string | null
  activo: boolean
}): Promise<{ data: any; error?: never } | { data?: never; error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return { error: 'Faltan variables de entorno del servidor.' }
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error } = await adminClient
    .from('perfiles')
    .upsert(perfilData)
    .select('*, sucursales(nombre)')
    .single()

  if (error) return { error: error.message }
  return { data }
}
