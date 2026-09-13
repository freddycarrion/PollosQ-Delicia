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

  // Helper para construir rango de fechas
  const buildDesde = (d: string) => `${d}T05:00:00-04:00`
  const buildHasta = (h: string) => {
    const dt = new Date(`${h}T12:00:00Z`)
    dt.setUTCDate(dt.getUTCDate() + 1)
    return `${dt.toISOString().split('T')[0]}T04:59:59-04:00`
  }

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

  if (desde) query = query.gte('created_at', buildDesde(desde))
  if (hasta)  query = query.lte('created_at', buildHasta(hasta))

  // Si no hay filtro de fechas, limitamos a 150 para no sobrecargar
  if (!desde && !hasta) {
    query = query.limit(150)
  }

  const { data: ventas, error } = await query

  if (error) {
    console.error("Error al cargar ventas:", error)
  }

  // --- QUERY SECUNDARIA PARA TOTALES GLOBALES (sin límite) ---
  let totalesQuery = supabase.from('ventas').select('total, metodo_pago, estado, nombre_cliente')
  if (desde) totalesQuery = totalesQuery.gte('created_at', buildDesde(desde))
  if (hasta)  totalesQuery = totalesQuery.lte('created_at', buildHasta(hasta))
  const { data: ventasParaTotales } = await totalesQuery

  const completadasTotales = (ventasParaTotales || []).filter((v: any) => v.estado === 'completada' && v.nombre_cliente !== 'Consumo Interno')
  const globalStats = {
    totalGeneral:    completadasTotales.reduce((acc: number, v: any) => acc + Number(v.total), 0),
    totalEfectivo:   completadasTotales.reduce((acc: number, v: any) => acc + (v.metodo_pago === 'efectivo' ? Number(v.total) : 0), 0),
    totalQR:         completadasTotales.reduce((acc: number, v: any) => acc + (v.metodo_pago === 'qr' ? Number(v.total) : 0), 0),
    ticketsEmitidos: completadasTotales.length
  }

  // --- QUERY CONSUMO INTERNO: obtener detalles de productos consumidos ---
  let consumoQuery = supabase
    .from('ventas')
    .select(`
      id, estado, nombre_cliente,
      detalle_ventas ( nombre_producto, cantidad )
    `)
    .eq('nombre_cliente', 'Consumo Interno')
    .eq('estado', 'completada')
  if (desde) consumoQuery = consumoQuery.gte('created_at', buildDesde(desde))
  if (hasta)  consumoQuery = consumoQuery.lte('created_at', buildHasta(hasta))

  const { data: ventasConsumo } = await consumoQuery

  // Agrupar por producto
  type ConsumoItem = { nombre: string; cantidad: number }
  const consumoAgrupado: Record<string, ConsumoItem> = {}
  ;(ventasConsumo || []).forEach((v: any) => {
    ;(v.detalle_ventas || []).forEach((d: any) => {
      if (!consumoAgrupado[d.nombre_producto]) {
        consumoAgrupado[d.nombre_producto] = { nombre: d.nombre_producto, cantidad: 0 }
      }
      consumoAgrupado[d.nombre_producto].cantidad += d.cantidad
    })
  })
  const consumoStats: ConsumoItem[] = Object.values(consumoAgrupado).sort((a, b) => b.cantidad - a.cantidad)

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

      <VentasClient initialVentas={ventas || []} globalStats={globalStats} consumoStats={consumoStats} />
    </div>
  )
}
