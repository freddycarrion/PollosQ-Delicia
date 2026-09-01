import React from 'react'

interface Props {
  desde: string
  hasta: string
  ingresosTotales: number
  pedidosCompletados: number
  productoMasVendido: string
  promedioDiario: number
  ventasPorCategoria: any[]
  compras: any[]
  pagosPersonal: any[]
  paymentData: any[]
}

export default function EstadoResultadosPrint({
  desde,
  hasta,
  ingresosTotales,
  pedidosCompletados,
  productoMasVendido,
  promedioDiario,
  ventasPorCategoria,
  compras,
  pagosPersonal,
  paymentData
}: Props) {

  const formatBs = (num: number) => {
    return num.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatFecha = (dateStr: string) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return dateStr
  }

  const currentDate = new Date().toLocaleString('es-BO', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  }).toUpperCase()

  // 1. Resumen General (Ya pasado por props)
  
  // 2. Ventas por categoría
  const pollos = ventasPorCategoria.filter(c => c.nombre.toLowerCase().includes('pollo')).reduce((a, c) => a + Number(c.total_bs), 0)
  const pollosUnd = ventasPorCategoria.filter(c => c.nombre.toLowerCase().includes('pollo')).reduce((a, c) => a + Number(c.total_unidades), 0)
  
  const bebidas = ventasPorCategoria.filter(c => c.nombre.toLowerCase().includes('bebida')).reduce((a, c) => a + Number(c.total_bs), 0)
  const bebidasUnd = ventasPorCategoria.filter(c => c.nombre.toLowerCase().includes('bebida')).reduce((a, c) => a + Number(c.total_unidades), 0)
  
  const hamburguesas = ventasPorCategoria.filter(c => !c.nombre.toLowerCase().includes('pollo') && !c.nombre.toLowerCase().includes('bebida')).reduce((a, c) => a + Number(c.total_bs), 0)
  const hamburguesasUnd = ventasPorCategoria.filter(c => !c.nombre.toLowerCase().includes('pollo') && !c.nombre.toLowerCase().includes('bebida')).reduce((a, c) => a + Number(c.total_unidades), 0)

  const totalVentasCat = pollos + bebidas + hamburguesas

  // 3. Gastos y compras
  const totalGastos = compras.reduce((a, c) => a + Number(c.total), 0)

  // 4. Pago de personal
  // Consideramos 'pagos del día' a los que su 'periodo' sea 'diario', y 'del mes' a 'mensual' y 'semanal' (o simplemente sumamos todos para el acumulado)
  const pagosDia = pagosPersonal.filter(p => p.periodo === 'diario').reduce((a, p) => a + Number(p.monto), 0)
  const pagosMes = pagosPersonal.filter(p => p.periodo !== 'diario').reduce((a, p) => a + Number(p.monto), 0)
  const totalPersonal = pagosDia + pagosMes

  // 5. Métodos de pago
  const totalPagos = paymentData.reduce((a, p) => a + Number(p.value), 0)
  const getPayPct = (name: string) => {
    if (totalPagos === 0) return '0%'
    const p = paymentData.find(x => x.name.toLowerCase() === name.toLowerCase())
    return p ? ((Number(p.value) / totalPagos) * 100).toFixed(1) + '%' : '0%'
  }

  // 6. Resultado neto
  const resultadoNeto = ingresosTotales - totalGastos - totalPersonal

  return (
    <div className="print-reporte-pdf">
      {/* ENCABEZADO */}
      <div className="pdf-header">
        <h1 className="pdf-company">Pollos Q' Delicia</h1>
        <h2 className="pdf-subtitle">Reportes y estadísticas / Sistema de gestión</h2>
      </div>
      
      <div className="pdf-meta">
        <p>Período: {formatFecha(desde)} al {formatFecha(hasta)}</p>
        <p>Emitido: {currentDate}</p>
      </div>

      <div className="pdf-body">
        
        {/* 1. Resumen general */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">1. Resumen general</h3>
          <div className="pdf-row">
            <span>Ingresos del periodo</span>
            <span>Bs. {formatBs(ingresosTotales)}</span>
          </div>
          <div className="pdf-row">
            <span>Pedidos completados</span>
            <span>{pedidosCompletados}</span>
          </div>
          <div className="pdf-row">
            <span>Producto más vendido</span>
            <span>{productoMasVendido}</span>
          </div>
          <div className="pdf-row pdf-subtotal">
            <span>Promedio diario</span>
            <span>Bs. {formatBs(promedioDiario)}</span>
          </div>
        </div>

        {/* 2. Ventas por categoría */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">2. Ventas por categoría</h3>
          <div className="pdf-row">
            <span>Pollos ({pollosUnd} und.)</span>
            <span>Bs. {formatBs(pollos)}</span>
          </div>
          <div className="pdf-row">
            <span>Bebidas ({bebidasUnd} und.)</span>
            <span>Bs. {formatBs(bebidas)}</span>
          </div>
          <div className="pdf-row">
            <span>Hamburguesas y porciones ({hamburguesasUnd} und.)</span>
            <span>Bs. {formatBs(hamburguesas)}</span>
          </div>
          <div className="pdf-row pdf-subtotal">
            <span>Total ventas</span>
            <span>Bs. {formatBs(totalVentasCat)}</span>
          </div>
        </div>

        {/* 3. Gastos y compras */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">3. Gastos y compras</h3>
          {compras.length === 0 ? (
            <div className="pdf-row"><span style={{ color: '#777' }}>Sin compras registradas</span><span></span></div>
          ) : (
            compras.map((c, i) => (
              <div className="pdf-row" key={i}>
                <span>{c.proveedores?.nombre || 'Gasto/Compra'} (Fac: {c.numero_factura || 'S/N'})</span>
                <span>Bs. {formatBs(Number(c.total))}</span>
              </div>
            ))
          )}
          <div className="pdf-row pdf-subtotal">
            <span>Total gastos</span>
            <span>Bs. {formatBs(totalGastos)}</span>
          </div>
        </div>

        {/* 4. Pago de personal */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">4. Pago de personal</h3>
          <div className="pdf-row">
            <span>Pagos del día</span>
            <span>Bs. {formatBs(pagosDia)}</span>
          </div>
          <div className="pdf-row">
            <span>Pagos acumulados del mes</span>
            <span>Bs. {formatBs(pagosMes)}</span>
          </div>
          <div className="pdf-row pdf-subtotal">
            <span>Total personal</span>
            <span>Bs. {formatBs(totalPersonal)}</span>
          </div>
        </div>

        {/* 5. Métodos de pago */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">5. Métodos de pago</h3>
          <div className="pdf-row">
            <span>Efectivo</span>
            <span>{getPayPct('efectivo')}</span>
          </div>
          <div className="pdf-row">
            <span>QR</span>
            <span>{getPayPct('qr')}</span>
          </div>
          {paymentData.find(x => x.name.toLowerCase() === 'tarjeta') && (
            <div className="pdf-row">
              <span>Tarjeta</span>
              <span>{getPayPct('tarjeta')}</span>
            </div>
          )}
          {paymentData.find(x => x.name.toLowerCase() === 'transferencia') && (
            <div className="pdf-row">
              <span>Transferencia</span>
              <span>{getPayPct('transferencia')}</span>
            </div>
          )}
        </div>

        {/* 6. Resultado neto del periodo */}
        <div className="pdf-section" style={{ marginTop: '30px' }}>
          <h3 className="pdf-section-title">6. Resultado neto del periodo</h3>
          <div className="pdf-row">
            <span>Ingresos - gastos</span>
            <span>Bs. {formatBs(ingresosTotales - totalGastos)}</span>
          </div>
          <div className="pdf-row pdf-neto">
            <span>Neto del día/periodo</span>
            <span>Bs. {formatBs(resultadoNeto)}</span>
          </div>
        </div>

      </div>

      {/* PIE DE PÁGINA */}
      <div className="pdf-footer">
        Documento generado automáticamente por el sistema POS
      </div>

      <style>{`
        .print-reporte-pdf {
          display: none;
          font-family: 'Helvetica', 'Arial', sans-serif;
          background: #fff;
          color: #000;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        @media print {
          .print-reporte-pdf {
            display: block;
          }
          @page {
            size: letter;
            margin: 1.5cm;
          }
        }

        /* Encabezado */
        .pdf-header {
          background-color: #0A192F; /* Azul marino */
          color: #FFF;
          padding: 20px;
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .pdf-company {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        .pdf-subtitle {
          margin: 5px 0 0 0;
          font-size: 14px;
          font-weight: normal;
          opacity: 0.9;
        }

        /* Meta / Fecha */
        .pdf-meta {
          text-align: center;
          color: #666;
          font-size: 11px;
          margin-top: 15px;
          margin-bottom: 30px;
        }
        .pdf-meta p {
          margin: 3px 0;
        }

        /* Cuerpo */
        .pdf-body {
          padding: 0 10px;
        }

        .pdf-section {
          margin-bottom: 24px;
        }

        .pdf-section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #000;
          text-transform: uppercase;
        }

        .pdf-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 15px;
          font-size: 13px;
        }

        .pdf-row span:first-child {
          text-align: left;
        }

        .pdf-row span:last-child {
          text-align: right;
        }

        /* Subtotales */
        .pdf-subtotal {
          font-weight: bold;
          border-top: 1px solid #000;
          margin-top: 4px;
          padding-top: 6px;
        }

        /* Resultado Neto */
        .pdf-neto {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #000;
          margin-top: 8px;
          padding-top: 10px;
        }

        /* Pie de página */
        .pdf-footer {
          margin-top: 50px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px dashed #ccc;
          padding-top: 15px;
        }
      `}</style>
    </div>
  )
}
