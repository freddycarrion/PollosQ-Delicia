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

  // ── Día de negocio actual (Bolivia UTC-4, el día empieza a las 05:00) ──────
  // Si no hay filtros en la URL, usamos el día de negocio de hoy por defecto.
  const ahoraBolivia   = new Date(Date.now() - (4 * 60 * 60 * 1000))
  const fechaNegocio   = new Date(ahoraBolivia.getTime() - (5 * 60 * 60 * 1000))
  const hoyNegocioStr  = fechaNegocio.toISOString().split('T')[0]
  const mananaNegocio  = new Date(fechaNegocio.getTime() + 24 * 60 * 60 * 1000)
  // mananaNegocio se usa solo internamente por buildHasta

  // Fechas efectivas: si vienen por URL las usamos, si no usamos el día de negocio actual
  const desdeEfectivo = desde ?? hoyNegocioStr
  const hastaEfectivo = hasta ?? hoyNegocioStr

  // Helper para construir rango de fechas
  const buildDesde = (d: string) => `${d}T05:00:00-04:00`
  const buildHasta = (h: string) => {
    // La fecha "hasta" debe cubrir hasta las 04:59:59 del día SIGUIENTE
    // para incluir las ventas de madrugada (p.ej. hasta las 2am)
    const dt = new Date(`${h}T05:00:00-04:00`)
    dt.setDate(dt.getDate() + 1)
    const yyyy = dt.getFullYear()
    const mm   = String(dt.getMonth() + 1).padStart(2, '0')
    const dd   = String(dt.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T04:59:59-04:00`
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
    .gte('created_at', buildDesde(desdeEfectivo))
    .lte('created_at', buildHasta(hastaEfectivo))

  const { data: ventas, error } = await query

  if (error) {
    console.error("Error al cargar ventas:", error)
  }

  // --- QUERY SECUNDARIA PARA TOTALES GLOBALES (sin límite) ---
  const totalesQuery = supabase
    .from('ventas')
    .select('total, metodo_pago, estado, nombre_cliente')
    .gte('created_at', buildDesde(desdeEfectivo))
    .lte('created_at', buildHasta(hastaEfectivo))
  const { data: ventasParaTotales } = await totalesQuery

  const completadasTotales = (ventasParaTotales || []).filter((v: any) => v.estado === 'completada' && v.nombre_cliente !== 'Consumo Interno')
  const globalStats = {
    totalGeneral:    completadasTotales.reduce((acc: number, v: any) => acc + Number(v.total), 0),
    totalEfectivo:   completadasTotales.reduce((acc: number, v: any) => acc + (v.metodo_pago === 'efectivo' ? Number(v.total) : 0), 0),
    totalQR:         completadasTotales.reduce((acc: number, v: any) => acc + (v.metodo_pago === 'qr' ? Number(v.total) : 0), 0),
    ticketsEmitidos: completadasTotales.length
  }

  // --- QUERY CONSUMO INTERNO: obtener detalles de productos consumidos ---
  const consumoQuery = supabase
    .from('ventas')
    .select(`
      id, estado, nombre_cliente,
      detalle_ventas ( 
        nombre_producto, 
        cantidad,
        productos (
          categorias ( nombre )
        )
      )
    `)
    .eq('nombre_cliente', 'Consumo Interno')
    .eq('estado', 'completada')
    .gte('created_at', buildDesde(desdeEfectivo))
    .lte('created_at', buildHasta(hastaEfectivo))

  const { data: ventasConsumo } = await consumoQuery

  // Agrupar por producto y calcular totales
  let totalComida = 0
  let totalBebida = 0

  type ConsumoItem = { nombre: string; cantidad: number }
  const consumoAgrupado: Record<string, ConsumoItem> = {}
  ;(ventasConsumo || []).forEach((v: any) => {
    ;(v.detalle_ventas || []).forEach((d: any) => {
      // Agrupar
      if (!consumoAgrupado[d.nombre_producto]) {
        consumoAgrupado[d.nombre_producto] = { nombre: d.nombre_producto, cantidad: 0 }
      }
      consumoAgrupado[d.nombre_producto].cantidad += d.cantidad

      // Clasificar entre comida y bebida
      const catNombre = d.productos?.categorias?.nombre?.toLowerCase() || ''
      const esBebida = catNombre.includes('bebida') || catNombre.includes('gaseosa') || catNombre.includes('refresco') 
                       || /coca|fanta|sprite|pepsi|7up|mendocina|jugo|agua|soda|litro/i.test(d.nombre_producto)
      
      if (esBebida) {
        totalBebida += d.cantidad
      } else {
        totalComida += d.cantidad
      }
    })
  })
  const consumoStats: ConsumoItem[] = Object.values(consumoAgrupado).sort((a, b) => b.cantidad - a.cantidad)
  const consumoResumen = { totalComida, totalBebida }

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

      <VentasClient 
        initialVentas={ventas || []} 
        globalStats={globalStats} 
        consumoStats={consumoStats}
        consumoResumen={consumoResumen}
        desdeDefault={desdeEfectivo}
        hastaDefault={hastaEfectivo}
      />
    </div>
  )
}
