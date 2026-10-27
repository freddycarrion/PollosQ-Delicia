interface DetalleProducto {
  producto_id: string | null
  nombre_producto: string
  cantidad: number
  subtotal: number | string
  productos?: { nombre: string } | { nombre: string }[] | null
}

export function agruparProductosVendidos(detalles: DetalleProducto[]) {
  const grupos = new Map<string, {
    producto_id: string | null
    nombre_producto: string
    total_unidades: number
    total_bs: number
  }>()
  for (const detalle of detalles) {
    const producto = Array.isArray(detalle.productos) ? detalle.productos[0] : detalle.productos
    const nombreHistorico = detalle.nombre_producto.trim().replace(/\s+/g, ' ')
    const nombreNormalizado = nombreHistorico.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    // Los registros sin ID nunca se atribuyen a un producto por su nombre:
    // un mismo nombre histórico pudo pertenecer a productos distintos.
    const clave = detalle.producto_id ? `producto:${detalle.producto_id}` : `historico:${nombreNormalizado}`
    let grupo = grupos.get(clave)
    if (!grupo) {
      grupo = {
        producto_id: detalle.producto_id,
        nombre_producto: detalle.producto_id
          ? (producto?.nombre || nombreHistorico).trim().replace(/\s+/g, ' ')
          : `${nombreHistorico || 'Producto desconocido'} (sin referencia)`,
        total_unidades: 0,
        total_bs: 0,
      }
      grupos.set(clave, grupo)
    }
    grupo.total_unidades += Number(detalle.cantidad)
    // Se suman los importes originales; el precio actual nunca se recalcula.
    grupo.total_bs += Number(detalle.subtotal)
  }
  return [...grupos.values()].sort((a, b) => b.total_unidades - a.total_unidades)
}

export function resumirProductosVendidos(detalles: DetalleProducto[]) {
  const grupos = agruparProductosVendidos(detalles)
  return {
    identificados: grupos.filter(p => p.producto_id !== null),
    sinReferencia: grupos.filter(p => p.producto_id === null),
  }
}
