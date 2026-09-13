import { createClient } from '@/lib/supabase/server'
import VentasClient from './VentasClient'
import { ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const supabase = await createClient()

  const params = await searchParams
  const desde = params.desde
  const hasta = params.hasta

  // Construir la consulta
  let query = supabase
    .from('ventas')
    .select(`
      id,
      numero_ticket,
      turno_id,
      cajero_id,
      sucursal_id,
      subtotal,
      descuento,
      total,
      metodo_pago,
      monto_recibido,
      vuelto,
      tipo_pedido,
      estado,
      motivo_anulacion,
      created_at,
      perfiles!ventas_cajero_id_fkey (nombre, apellido),
      sucursales (nombre),
      detalle_ventas (
        id,
        producto_id,
        nombre_producto,
        precio_unitario,
        cantidad,
        subtotal
      )
    `)
    .order('created_at', { ascending: false })

  if (desde) {
    // Asegurar que comience a las 05:00:00 hora de Bolivia
    query = query.gte('created_at', `${desde}T05:00:00-04:00`)
  }
  if (hasta) {
    // Asegurar que termine a las 04:59:59 del día siguiente
    const dateHasta = new Date(`${hasta}T12:00:00Z`)
    dateHasta.setUTCDate(dateHasta.getUTCDate() + 1)
    const hastaStrSig = dateHasta.toISOString().split('T')[0]
    query = query.lte('created_at', `${hastaStrSig}T04:59:59-04:00`)
  }

  // Si no hay filtro de fechas, limitamos a 150 para no sobrecargar
  if (!desde && !hasta) {
    query = query.limit(150)
  }

  const { data: ventas, error } = await query

  if (error) {
    console.error("Error al cargar ventas:", error)
  }

  // --- QUERY SECUNDARIA PARA TOTALES GLOBALES (sin límite) ---
  let totalesQuery = supabase.from('ventas').select('total, metodo_pago, estado')
  if (desde) {
    totalesQuery = totalesQuery.gte('created_at', `${desde}T05:00:00-04:00`)
  }
  if (hasta) {
    const dateHasta = new Date(`${hasta}T12:00:00Z`)
    dateHasta.setUTCDate(dateHasta.getUTCDate() + 1)
    const hastaStrSig = dateHasta.toISOString().split('T')[0]
    totalesQuery = totalesQuery.lte('created_at', `${hastaStrSig}T04:59:59-04:00`)
  }
  const { data: ventasParaTotales } = await totalesQuery
  
  const completadasTotales = (ventasParaTotales || []).filter(v => v.estado === 'completada')
  const globalStats = {
    totalGeneral: completadasTotales.reduce((acc, v) => acc + Number(v.total), 0),
    totalEfectivo: completadasTotales.reduce((acc, v) => acc + (v.metodo_pago === 'efectivo' ? Number(v.total) : 0), 0),
    totalQR: completadasTotales.reduce((acc, v) => acc + (v.metodo_pago === 'qr' ? Number(v.total) : 0), 0),
    ticketsEmitidos: (ventasParaTotales || []).length
  }

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingCart className="text-red" size={32} style={{ color: 'var(--red)' }} /> 
            Historial de Ventas
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Registro detallado de todos los tickets y pedidos procesados.
          </p>
        </div>
      </div>

      <VentasClient initialVentas={ventas || []} globalStats={globalStats} />
    </div>
  )
}
