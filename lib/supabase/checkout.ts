import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Todas las peticiones del cobro usan el mismo JWT, aunque otra pestaña cambie
// la sesión entre la validación del cajero y la escritura de los detalles.
export async function createCheckoutClient(authClient: SupabaseClient, cajeroId: string) {
  const { data: { session }, error: sessionError } = await authClient.auth.getSession()
  if (sessionError || !session) {
    throw new Error('No se pudo validar tu sesión. Vuelve a iniciar sesión con el mismo cajero. El pedido se mantiene en esta pantalla.')
  }

  const token = session.access_token
  const { data: { user }, error } = await authClient.auth.getUser(token)
  if (error || !user) {
    throw new Error('Tu sesión no es válida. Vuelve a iniciar sesión con el mismo cajero. El pedido se mantiene en esta pantalla.')
  }
  if (user.id !== cajeroId) {
    throw new Error('La cuenta cambió en otra pestaña. Vuelve a iniciar sesión con el cajero de este pedido. El pedido se mantiene en esta pantalla.')
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => token },
  )
  return { client, user }
}
