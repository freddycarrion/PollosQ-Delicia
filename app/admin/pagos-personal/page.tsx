import { createClient } from '@/lib/supabase/server'
import PagosPersonalClient from './PagosPersonalClient'
import { Wallet } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function PagosPersonalPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams

  // Rango por defecto: mes actual
  const today = new Date()
  const primerDiaMes = new Date(today.getFullYear(), today.getMonth(), 1)

  const desdeStr = params.desde || primerDiaMes.toISOString().split('T')[0]
  const hastaStr = params.hasta || today.toISOString().split('T')[0]

  // Obtener pagos con relaciones
  const { data: pagos } = await supabase
    .from('pagos_personal')
    .select(`
      id, sucursal_id, empleado_id, registrado_por, nombre_empleado,
      concepto, periodo, monto, fecha_pago, observaciones, created_at,
      sucursales(nombre)
    `)
    .gte('fecha_pago', desdeStr)
    .lte('fecha_pago', hastaStr)
    .order('fecha_pago', { ascending: false })

  // Obtener perfiles para el formulario
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, rol')
    .eq('activo', true)
    .order('nombre')

  // Obtener sucursales
  const { data: sucursales } = await supabase
    .from('sucursales')
    .select('id, nombre')
    .eq('activa', true)

  // Obtener perfil del usuario actual para preseleccionar sucursal
  const { data: { user } } = await supabase.auth.getUser()
  const { data: miPerfil } = user ? await supabase
    .from('perfiles')
    .select('sucursal_id, rol')
    .eq('id', user.id)
    .single() : { data: null }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wallet style={{ color: 'var(--yellow)' }} size={32} />
            Pagos al Personal
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: '4px' }}>
            Registra y consulta los pagos realizados al personal por día, semana o mes.
          </p>
        </div>
      </div>

      <PagosPersonalClient
        initialPagos={(pagos || []) as any[]}
        perfiles={(perfiles || []) as any[]}
        sucursales={(sucursales || []) as any[]}
        miSucursalId={miPerfil?.sucursal_id || null}
        initialDesde={desdeStr}
        initialHasta={hastaStr}
      />
    </div>
  )
}
