export interface VentaParaTurno {
  turno_id: string
  estado: string
  total: number | string
  metodo_pago: string
  metodo_pago_2: string | null
  monto_pago_2: number | string | null
}

export function calcularTotalesTurnos(ventas: VentaParaTurno[]) {
  const turnos: Record<string, { total_efectivo: number; total_qr: number; total_tarjeta: number; total_transferencia: number; num_ventas: number }> = {}
  const campos = { efectivo: 'total_efectivo', qr: 'total_qr', tarjeta: 'total_tarjeta', transferencia: 'total_transferencia' } as const
  for (const venta of ventas) {
    if (venta.estado !== 'completada') continue
    const turno = turnos[venta.turno_id] ??= { total_efectivo: 0, total_qr: 0, total_tarjeta: 0, total_transferencia: 0, num_ventas: 0 }
    const secundario = venta.metodo_pago_2 ? Math.round(Number(venta.monto_pago_2 || 0) * 100) : 0
    const principal = Math.round(Number(venta.total) * 100) - secundario
    const campo1 = campos[venta.metodo_pago as keyof typeof campos]
    const campo2 = venta.metodo_pago_2 ? campos[venta.metodo_pago_2 as keyof typeof campos] : undefined
    if (campo1) turno[campo1] += principal
    if (campo2) turno[campo2] += secundario
    turno.num_ventas++
  }
  for (const turno of Object.values(turnos)) {
    turno.total_efectivo /= 100; turno.total_qr /= 100
    turno.total_tarjeta /= 100; turno.total_transferencia /= 100
  }
  return turnos
}

export const turnoSinVentas = { total_efectivo: 0, total_qr: 0, total_tarjeta: 0, total_transferencia: 0, num_ventas: 0 }
