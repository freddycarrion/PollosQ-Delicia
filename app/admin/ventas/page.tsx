import { createClient } from '@/lib/supabase/server'
import VentasClient from './VentasClient'
import { ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VentasAdminPage() {
  const supabase = await createClient()

  // Obtener las últimas 100 ventas con sus detalles y perfiles
  const { data: ventas, error } = await supabase
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
    .limit(150)

  if (error) {
    console.error("Error al cargar ventas:", error)
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

      <VentasClient initialVentas={ventas || []} />
    </div>
  )
}
