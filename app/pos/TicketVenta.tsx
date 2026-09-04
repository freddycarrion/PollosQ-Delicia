export interface TicketData {
  sucursalNombre: string
  cajeroNombre: string
  numeroTicket: string
  tipoPedido: string
  metodoPago: string
  metodoPago2?: string          // Segundo método en pago mixto
  montoPago2?: number           // Monto del segundo método
  total: number
  recibido: number
  vuelto: number
  nombreCliente?: string        // Nombre del cliente (opcional)
  items: {
    nombre: string
    cantidad: number
    precio: number
    subtotal: number
    notas?: string              // Presas y acompañamientos seleccionados
  }[]
  fecha: string
  esReimpresion?: boolean       // Marca la reimpresión en el ticket de cocina
}

// ─── DATOS DEL NEGOCIO (edita aquí) ───────────────────────────
const NEGOCIO = {
  nombre:     "POLLOS Q' DELICIA",
  slogan:     '',
  direccion:  'Av. Principal s/n, Tu Ciudad',
  telefono:   '+591 7XX-XXXXX',
  whatsapp:   '+591 7XX-XXXXX',
  despedida:  'Gracias por su visita!',
}
// ──────────────────────────────────────────────────────────────

// Ancho fijo 72mm para impresora termica de 8cm
// (8cm - margenes fisicos de ~4mm = ~72mm imprimibles)
const TICKET_WIDTH = '72mm'

export default function TicketVenta({ data }: { data: TicketData | null }) {
  if (!data) return null

  const fmt  = (n: number) => 'Bs.' + n.toFixed(2)
  const esParaLlevar = data.tipoPedido === 'para_llevar' || data.tipoPedido === 'para_llevar'
  const esMixto = !!data.metodoPago2
  const metodoLabel = esMixto
    ? `${data.metodoPago.toUpperCase()} + ${data.metodoPago2!.toUpperCase()}`
    : data.metodoPago.toUpperCase()

  return (
    <>
      {/* ════════════════════════════════════════
          TICKET 1: COCINA  (solo la orden)
          ════════════════════════════════════════ */}
      <div className="ticket-cocina">
        <div className="tk-header-cocina">
          <div className="tk-tipo-cocina">{esParaLlevar ? 'PARA LLEVAR' : 'COMER AQUI'}</div>
          <div className="tk-num-cocina">#{data.numeroTicket}</div>
          <div className="tk-hora-cocina">{data.fecha}</div>
          {data.esReimpresion && <div className="tk-reimp">-- REIMPRESION --</div>}
          {data.nombreCliente && <div className="tk-cliente-cocina">{data.nombreCliente}</div>}
        </div>

        <div className="tk-divider-cocina" />

        <table className="tk-table-cocina">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>CANT</th>
              <th style={{ textAlign: 'left' }}>PRODUCTO</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <>
                <tr key={idx}>
                  <td className="tk-cant-cocina">{item.cantidad}x</td>
                  <td className="tk-prod-cocina">{item.nombre}</td>
                </tr>
                {item.notas && (
                  <tr key={`${idx}-n`}>
                    <td></td>
                    <td className="tk-notas-cocina">{item.notas}</td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        <div className="tk-divider-cocina" />
        <div className="tk-footer-cocina">
          {data.cajeroNombre} - {data.sucursalNombre}
        </div>
      </div>

      {/* ════════════════════════════════════════
          TICKET 2: CLIENTE (detalle completo)
          ════════════════════════════════════════ */}
      <div className="ticket-cliente">

        {/* Cabecera */}
        <div className="tk-header-cli">
          <div className="tk-logo-txt">{NEGOCIO.nombre}</div>
          {NEGOCIO.slogan && <div className="tk-slogan">{NEGOCIO.slogan}</div>}
          <div className="tk-sep-dots" />
          <div className="tk-sub-info">{NEGOCIO.direccion}</div>
          <div className="tk-sub-info">Tel: {NEGOCIO.telefono}</div>
          <div className="tk-sub-info">WhatsApp: {NEGOCIO.whatsapp}</div>
        </div>

        <div className="tk-sep-dashed" />

        {/* Info del ticket */}
        <div className="tk-meta">
          <div className="tk-meta-row"><span>Ticket</span><span>#{data.numeroTicket}</span></div>
          <div className="tk-meta-row"><span>Fecha</span><span>{data.fecha}</span></div>
          {data.nombreCliente && (
            <div className="tk-meta-row"><span>Cliente</span><span>{data.nombreCliente}</span></div>
          )}
          <div className="tk-meta-row"><span>Cajero</span><span>{data.cajeroNombre}</span></div>
          <div className="tk-meta-row"><span>Sucursal</span><span>{data.sucursalNombre}</span></div>
        </div>

        <div className="tk-sep-dashed" />

        {/* Tipo de pedido */}
        <div className="tk-tipo-cli">{esParaLlevar ? 'PARA LLEVAR' : 'COMER AQUI'}</div>

        <div className="tk-sep-solid" />

        {/* Productos */}
        <table className="tk-table-cli">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '22px' }}>Ct</th>
              <th style={{ textAlign: 'left' }}>Producto</th>
              <th style={{ textAlign: 'right', width: '44px' }}>P/U</th>
              <th style={{ textAlign: 'right', width: '52px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <>
                <tr key={idx}>
                  <td style={{ verticalAlign: 'top' }}>{item.cantidad}</td>
                  <td style={{ verticalAlign: 'top' }}>{item.nombre}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{item.precio.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 900 }}>{item.subtotal.toFixed(2)}</td>
                </tr>
                {item.notas && (
                  <tr key={`${idx}-n`}>
                    <td></td>
                    <td colSpan={3} className="tk-item-notas">{item.notas}</td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        <div className="tk-sep-solid" />

        {/* Totales */}
        <div className="tk-totales">
          <div className="tk-total-row">
            <span>Subtotal</span>
            <span>{fmt(data.total)}</span>
          </div>
          <div className="tk-sep-dashed" style={{ margin: '5px 0' }} />
          <div className="tk-total-row tk-total-grande">
            <span>TOTAL</span>
            <span>{fmt(data.total)}</span>
          </div>
          <div className="tk-sep-dashed" style={{ margin: '5px 0' }} />

          {/* Método(s) de pago */}
          {!esMixto ? (
            <div className="tk-total-row">
              <span>Pago</span>
              <span>{metodoLabel}</span>
            </div>
          ) : (
            <>
              <div className="tk-total-row">
                <span>Pago Mixto</span>
                <span></span>
              </div>
              <div className="tk-total-row tk-mixto-row">
                <span>  {data.metodoPago.toUpperCase()}</span>
                <span>{fmt(data.total - (data.montoPago2 || 0))}</span>
              </div>
              <div className="tk-total-row tk-mixto-row">
                <span>  {data.metodoPago2!.toUpperCase()}</span>
                <span>{fmt(data.montoPago2 || 0)}</span>
              </div>
            </>
          )}

          {/* Efectivo: recibido y vuelto */}
          {data.metodoPago === 'efectivo' && !esMixto && (
            <>
              <div className="tk-total-row">
                <span>Recibido</span>
                <span>{fmt(data.recibido)}</span>
              </div>
              <div className="tk-total-row tk-cambio">
                <span>CAMBIO</span>
                <span>{fmt(data.vuelto)}</span>
              </div>
            </>
          )}
          {esMixto && data.metodoPago === 'efectivo' && (
            <>
              <div className="tk-total-row">
                <span>Recibido</span>
                <span>{fmt(data.recibido)}</span>
              </div>
              {data.vuelto > 0 && (
                <div className="tk-total-row tk-cambio">
                  <span>CAMBIO</span>
                  <span>{fmt(data.vuelto)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="tk-sep-dashed" />

        {/* Pie */}
        <div className="tk-footer-cli">
          <p>{NEGOCIO.despedida}</p>
          {data.esReimpresion && <p className="tk-reimp-label">*** REIMPRESION ***</p>}
        </div>
      </div>

      <style>{`
        /* ── RESET DE IMPRESION ─────────────── */
        @media print {
          .ticket-cocina {
            page-break-after: always;
            break-after: page;
          }
        }

        /* ── BASE COMPARTIDA ─────────────────── */
        .ticket-cocina,
        .ticket-cliente {
          width: ${TICKET_WIDTH};
          margin: 0 auto;
          padding: 4mm 3mm;
          background: #fff;
          color: #000;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.45;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          word-break: break-word;
        }

        /* ── TICKET COCINA ───────────────────── */
        .ticket-cocina {
          border: 2px dashed #000;
          border-radius: 3px;
          margin-bottom: 6px;
        }
        .tk-header-cocina {
          text-align: center;
        }
        .tk-tipo-cocina {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .tk-num-cocina {
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }
        .tk-hora-cocina {
          font-size: 10px;
          margin-top: 2px;
        }
        .tk-reimp {
          font-size: 10px;
          font-weight: 900;
          margin-top: 3px;
          letter-spacing: 1px;
        }
        .tk-divider-cocina {
          border-bottom: 2px dashed #000;
          margin: 5px 0;
        }
        .tk-table-cocina {
          width: 100%;
          border-collapse: collapse;
        }
        .tk-table-cocina th {
          font-size: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
        }
        .tk-table-cocina td {
          padding: 2px 0;
        }
        .tk-cant-cocina {
          width: 28px;
          font-size: 16px;
          font-weight: 900;
          vertical-align: top;
        }
        .tk-prod-cocina {
          font-size: 13px;
          font-weight: 900;
          vertical-align: top;
        }
        .tk-notas-cocina {
          font-size: 10px;
          font-style: italic;
          padding-bottom: 3px;
          color: #444;
        }
        .tk-footer-cocina {
          text-align: center;
          font-size: 10px;
          margin-top: 3px;
        }
        .tk-cliente-cocina {
          font-size: 13px;
          font-weight: 900;
          margin-top: 4px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* ── TICKET CLIENTE ──────────────────── */
        .tk-header-cli {
          text-align: center;
        }
        .tk-logo-txt {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 1px;
        }
        .tk-slogan {
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 3px;
        }
        .tk-sep-dots {
          border-bottom: 1px dotted #000;
          margin: 3px 0;
        }
        .tk-sub-info {
          font-size: 10px;
          margin: 0;
          line-height: 1.4;
        }

        .tk-sep-dashed {
          border-bottom: 1px dashed #000;
          margin: 5px 0;
        }
        .tk-sep-solid {
          border-bottom: 1px solid #000;
          margin: 5px 0;
        }

        .tk-meta {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .tk-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        .tk-meta-row span:first-child {
          color: #555;
        }
        .tk-meta-row span:last-child {
          font-weight: 900;
          text-align: right;
          max-width: 60%;
          word-break: break-all;
        }

        .tk-tipo-cli {
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin: 3px 0;
        }

        .tk-table-cli {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          table-layout: fixed;
        }
        .tk-table-cli th {
          border-bottom: 1px solid #000;
          padding-bottom: 2px;
          font-size: 10px;
          text-transform: uppercase;
        }
        .tk-table-cli td {
          padding: 2px 0;
          font-size: 10px;
          overflow: hidden;
        }
        .tk-item-notas {
          font-size: 9px;
          font-style: italic;
          color: #444;
          padding-bottom: 2px;
        }

        .tk-totales {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .tk-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 1px;
        }
        .tk-total-grande {
          font-size: 16px;
          font-weight: 900;
        }
        .tk-cambio {
          font-weight: 900;
        }
        .tk-mixto-row {
          font-size: 10px;
          color: #333;
        }

        .tk-footer-cli {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          margin-top: 3px;
        }
        .tk-reimp-label {
          font-size: 10px;
          font-weight: 900;
          margin-top: 3px;
          letter-spacing: 1px;
        }
      `}</style>
    </>
  )
}
