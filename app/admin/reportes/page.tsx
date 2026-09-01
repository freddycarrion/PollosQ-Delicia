import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'
import { LineChart } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function ReportesAdminPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const params = await searchParams
  
  // 1. Rango de Fechas (Default: Últimos 30 días)
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const desdeStr = params.desde || thirtyDaysAgo.toISOString().split('T')[0]
  const hastaStr = params.hasta || today.toISOString().split('T')[0]

  const desde = `${desdeStr}T00:00:00`
  const hasta = `${hastaStr}T23:59:59`

  // 2. Ventas del período filtrado
  const { data: ventas } = await supabase
    .from('ventas')
    .select(`
      id, created_at, total, metodo_pago, estado, sucursal_id, cajero_id,
      sucursales(nombre), cajero:perfiles!ventas_cajero_id_fkey(nombre, apellido)
    `)
    .gte('created_at', desde)
    .lte('created_at', hasta)

  // 3. Detalles de ventas del período (para top productos y por categoría)
  const { data: detallesVentas } = await supabase
    .from('detalle_ventas')
    .select('producto_id, nombre_producto, cantidad, subtotal, ventas!inner(estado, created_at, sucursal_id)')
    .gte('ventas.created_at', desde)
    .lte('ventas.created_at', hasta)
    .eq('ventas.estado', 'completada')

  // 4. Detalles con categoría — para el reporte por categoría
  const { data: detallesConCategoria } = await supabase
    .from('detalle_ventas')
    .select(`
      cantidad, subtotal,
      ventas!inner(estado, created_at),
      productos!inner(categoria_id, categorias!inner(nombre, icono))
    `)
    .gte('ventas.created_at', desde)
    .lte('ventas.created_at', hasta)
    .eq('ventas.estado', 'completada')

  // 5. Ventas históricas mensuales (últimos 12 meses, sin filtro de fecha)
  const doceAgo = new Date()
  doceAgo.setFullYear(doceAgo.getFullYear() - 1)
  const { data: ventasHistoricas } = await supabase
    .from('ventas')
    .select('created_at, total, estado')
    .gte('created_at', doceAgo.toISOString())
    .eq('estado', 'completada')
    .order('created_at', { ascending: true })

  // 6. Compras del período
  const { data: compras } = await supabase
    .from('compras')
    .select(`
      id, fecha_compra, total, numero_factura, observaciones,
      proveedores(nombre), sucursales(nombre),
      perfiles!compras_registrado_por_fkey(nombre, apellido)
    `)
    .gte('fecha_compra', desdeStr)
    .lte('fecha_compra', hastaStr)
    .order('fecha_compra', { ascending: false })

  // ─── Procesamiento local ──────────────────────────────────────────────

  // Ventas diarias
  const dictVentasDiarias: Record<string, any> = {}
  const dictCajeros: Record<string, any> = {}

  if (ventas) {
    for (const v of ventas) {
      const fecha = v.created_at.split('T')[0]
      const sucNombre = (v.sucursales as any)?.nombre || 'Desconocido'
      const keyDiaria = `${fecha}_${v.sucursal_id}`
      if (!dictVentasDiarias[keyDiaria]) {
        dictVentasDiarias[keyDiaria] = {
          fecha, sucursal: sucNombre, sucursal_id: v.sucursal_id,
          num_ventas: 0, total_bs: 0, num_anuladas: 0,
          total_efectivo: 0, total_tarjeta: 0, total_qr: 0, total_transferencia: 0
        }
      }
      if (v.estado === 'completada') {
        dictVentasDiarias[keyDiaria].num_ventas += 1
        dictVentasDiarias[keyDiaria].total_bs += Number(v.total)
        if (v.metodo_pago === 'efectivo')      dictVentasDiarias[keyDiaria].total_efectivo += Number(v.total)
        if (v.metodo_pago === 'tarjeta')       dictVentasDiarias[keyDiaria].total_tarjeta += Number(v.total)
        if (v.metodo_pago === 'qr')            dictVentasDiarias[keyDiaria].total_qr += Number(v.total)
        if (v.metodo_pago === 'transferencia') dictVentasDiarias[keyDiaria].total_transferencia += Number(v.total)
      } else if (v.estado === 'anulada') {
        dictVentasDiarias[keyDiaria].num_anuladas += 1
      }

      const cajeroKey = v.cajero_id || 'desconocido'
      const perfNombre = (v as any).cajero
      const nombre = Array.isArray(perfNombre) 
        ? `${perfNombre[0]?.nombre} ${perfNombre[0]?.apellido}`
        : `${perfNombre?.nombre || ''} ${perfNombre?.apellido || ''}`
      if (cajeroKey !== 'desconocido') {
        if (!dictCajeros[cajeroKey]) {
          dictCajeros[cajeroKey] = { cajero_id: cajeroKey, cajero: nombre.trim(), sucursal: sucNombre, sucursal_id: v.sucursal_id, total_ventas: 0, total_bs: 0, ventas_anuladas: 0 }
        }
        if (v.estado === 'completada') {
          dictCajeros[cajeroKey].total_ventas += 1
          dictCajeros[cajeroKey].total_bs += Number(v.total)
        } else if (v.estado === 'anulada') {
          dictCajeros[cajeroKey].ventas_anuladas += 1
        }
      }
    }
  }

  const arrCajeros = Object.values(dictCajeros).map((c: any) => ({
    ...c,
    ticket_promedio: c.total_ventas > 0 ? (c.total_bs / c.total_ventas).toFixed(2) : '0.00'
  }))

  // Top productos
  const dictProd: Record<string, any> = {}
  if (detallesVentas) {
    for (const d of detallesVentas) {
      if (!dictProd[d.producto_id]) {
        dictProd[d.producto_id] = { producto_id: d.producto_id, nombre_producto: d.nombre_producto, total_unidades: 0, total_bs: 0 }
      }
      dictProd[d.producto_id].total_unidades += Number(d.cantidad)
      dictProd[d.producto_id].total_bs += Number(d.subtotal)
    }
  }
  const arrTopProductos = Object.values(dictProd).sort((a, b) => b.total_unidades - a.total_unidades).slice(0, 10)

  // Por categoría
  const dictCategoria: Record<string, any> = {}
  if (detallesConCategoria) {
    for (const d of detallesConCategoria) {
      const prod = (d as any).productos
      const cat = prod?.categorias
      const catNombre = cat?.nombre || 'Sin Categoría'
      const catIcono  = cat?.icono  || '📦'
      if (!dictCategoria[catNombre]) {
        dictCategoria[catNombre] = { nombre: catNombre, icono: catIcono, total_unidades: 0, total_bs: 0 }
      }
      dictCategoria[catNombre].total_unidades += Number(d.cantidad)
      dictCategoria[catNombre].total_bs       += Number(d.subtotal)
    }
  }
  const arrCategorias = Object.values(dictCategoria).sort((a, b) => b.total_bs - a.total_bs)

  // Ventas mensuales históricas
  const dictMensual: Record<string, any> = {}
  if (ventasHistoricas) {
    for (const v of ventasHistoricas) {
      const d = new Date(v.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-BO', { month: 'short', year: 'numeric' })
      if (!dictMensual[key]) {
        dictMensual[key] = { key, label, total_bs: 0, num_ventas: 0 }
      }
      dictMensual[key].total_bs    += Number(v.total)
      dictMensual[key].num_ventas  += 1
    }
  }
  const arrVentasMensuales = Object.values(dictMensual).sort((a, b) => a.key.localeCompare(b.key))

  const arrVentasDiarias = Object.values(dictVentasDiarias).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LineChart className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} />
            Reportes y Estadísticas
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginTop: '4px' }}>
            Visualiza el rendimiento financiero y operativo histórico.
          </p>
        </div>
      </div>

      <ReportesClient
        ventasDiarias={arrVentasDiarias}
        topProductos={arrTopProductos}
        desempenoCajeros={arrCajeros}
        ventasMensuales={arrVentasMensuales}
        ventasPorCategoria={arrCategorias}
        compras={(compras as any[]) || []}
        initialDesde={desdeStr}
        initialHasta={hastaStr}
      />
    </div>
  )
}
