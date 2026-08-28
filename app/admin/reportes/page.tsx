import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'
import { LineChart, Calendar } from 'lucide-react'

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

  // 2. Obtener Ventas Filtradas con sus Relaciones
  const { data: ventas, error: errVentas } = await supabase
    .from('ventas')
    .select(`
      id, created_at, total, metodo_pago, estado, sucursal_id, cajero_id, 
      sucursales(nombre), cajero:perfiles!ventas_cajero_id_fkey(nombre, apellido)
    `)
    .gte('created_at', desde)
    .lte('created_at', hasta)

  // 3. Obtener Detalles de las ventas concretadas en este rango
  const { data: detallesVentas, error: errDetalles } = await supabase
    .from('detalle_ventas')
    .select('producto_id, nombre_producto, cantidad, subtotal, ventas!inner(estado, created_at)')
    .gte('ventas.created_at', desde)
    .lte('ventas.created_at', hasta)
    .eq('ventas.estado', 'completada')

  if (errVentas || errDetalles) console.error("Error Consultas:", errVentas, errDetalles)

  // 4. Procesamiento Local (Agregación Agnostica de Base de Datos para soportar los filtros exactos)
  const dictVentasDiarias: Record<string, any> = {}
  const dictCajeros: Record<string, any> = {}

  if (ventas) {
    for (const v of ventas) {
      const fecha = v.created_at.split('T')[0]
      const sucNombre = Array.isArray(v.sucursales) ? (v.sucursales as any)[0]?.nombre : (v.sucursales as any)?.nombre || 'Desconocido'
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
        if (v.metodo_pago === 'efectivo') dictVentasDiarias[keyDiaria].total_efectivo += Number(v.total)
        if (v.metodo_pago === 'tarjeta') dictVentasDiarias[keyDiaria].total_tarjeta += Number(v.total)
        if (v.metodo_pago === 'qr') dictVentasDiarias[keyDiaria].total_qr += Number(v.total)
        if (v.metodo_pago === 'transferencia') dictVentasDiarias[keyDiaria].total_transferencia += Number(v.total)
      } else if (v.estado === 'anulada') {
        dictVentasDiarias[keyDiaria].num_anuladas += 1
      }
      
      const cajeroKey = v.cajero_id || 'desconocido'
      const perfilesAny = (v as any).cajero
      const perfNombre = Array.isArray(perfilesAny) ? `${perfilesAny[0]?.nombre} ${perfilesAny[0]?.apellido}` : `${perfilesAny?.nombre || ''} ${perfilesAny?.apellido || ''}`
      if (cajeroKey !== 'desconocido') {
        if (!dictCajeros[cajeroKey]) {
           dictCajeros[cajeroKey] = {
             cajero_id: cajeroKey,
             cajero: perfNombre.trim(),
             sucursal: sucNombre, sucursal_id: v.sucursal_id,
             total_ventas: 0, total_bs: 0, ventas_anuladas: 0
           }
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

  const dictProd: Record<string, any> = {}
  if (detallesVentas) {
    for (const d of detallesVentas) {
      if (!dictProd[d.producto_id]) {
        dictProd[d.producto_id] = {
          producto_id: d.producto_id,
          nombre_producto: d.nombre_producto,
          total_unidades: 0, total_bs: 0
        }
      }
      dictProd[d.producto_id].total_unidades += Number(d.cantidad)
      dictProd[d.producto_id].total_bs += Number(d.subtotal)
    }
  }

  const arrTopProductos = Object.values(dictProd)
    .sort((a, b) => b.total_unidades - a.total_unidades)
    .slice(0, 10)
    
  const arrVentasDiarias = Object.values(dictVentasDiarias)
    .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))

  return (
    <div className="admin-page animate-fade-in text-white">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LineChart className="text-yellow" size={32} style={{ color: 'var(--yellow)' }} /> 
            Reportes y Estadísticas Avanzadas
          </h1>
          <p className="page-subtitle" style={{ color: '#ffffff', fontSize: '0.95rem', marginTop: '4px' }}>
            Visualiza el rendimiento financiero y operativo histórico para las fechas seleccionadas.
          </p>
        </div>
      </div>

      <ReportesClient 
        ventasDiarias={arrVentasDiarias}
        topProductos={arrTopProductos}
        desempenoCajeros={arrCajeros}
        initialDesde={desdeStr}
        initialHasta={hastaStr}
      />
    </div>
  )
}
