export interface TicketData {
  sucursalNombre: string
  cajeroNombre: string
  numeroTicket: string
  tipoPedido: string
  metodoPago: string
  total: number
  recibido: number
  vuelto: number
  items: {
    nombre: string
    cantidad: number
    precio: number
    subtotal: number
  }[]
  fecha: string
}

// ─── DATOS DEL NEGOCIO (edita aquí) ───────────────────────────
const NEGOCIO = {
  nombre:     "POLLOS Q' DELICIA",
  slogan:     '',                               // ← slogan opcional
  direccion:  'Av. Principal s/n, Tu Ciudad',   // ← cambia esto
  telefono:   '+591 7XX-XXXXX',                  // ← cambia esto
  whatsapp:   '+591 7XX-XXXXX',                  // ← cambia esto
  despedida:  '¡Buen provecho y gracias por su visita!',
}
// ──────────────────────────────────────────────────────────────

export default function TicketVenta({ data }: { data: TicketData | null }) {
  if (!data) return null

  const fmt = (n: number) => 'Bs. ' + n.toFixed(2)
  const esParaLlevar = data.tipoPedido === 'para_llevar'

  return (
    <>
      {/* ════════════════════════════════════════
          TICKET 1: COCINA  (solo la orden)
          ════════════════════════════════════════ */}
      <div className="ticket-cocina">
        <div className="tk-header-cocina">
          <div className="tk-tipo-cocina">{esParaLlevar ? '🛍 PARA LLEVAR' : '🍽 COMER AQUÍ'}</div>
          <div className="tk-num-cocina">#{data.numeroTicket}</div>
          <div className="tk-hora-cocina">{data.fecha}</div>
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
              <tr key={idx}>
                <td className="tk-cant-cocina">{item.cantidad}x</td>
                <td className="tk-prod-cocina">{item.nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="tk-divider-cocina" />
        <div className="tk-footer-cocina">
          Cajero: {data.cajeroNombre} · {data.sucursalNombre}
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
          <div className="tk-sub-info">{NEGOCIO.direccion}</div>
          <div className="tk-sub-info">Tel: {NEGOCIO.telefono}</div>
          <div className="tk-sub-info">WhatsApp: {NEGOCIO.whatsapp}</div>
        </div>

        <div className="tk-sep-dashed" />

        {/* Info del ticket */}
        <div className="tk-meta">
          <div className="tk-meta-row"><span>Ticket</span><span>#{data.numeroTicket}</span></div>
          <div className="tk-meta-row"><span>Fecha</span><span>{data.fecha}</span></div>
          <div className="tk-meta-row"><span>Cajero</span><span>{data.cajeroNombre}</span></div>
          <div className="tk-meta-row"><span>Sucursal</span><span>{data.sucursalNombre}</span></div>
        </div>

        <div className="tk-sep-dashed" />

        {/* Tipo de pedido */}
        <div className="tk-tipo-cli">{esParaLlevar ? '🛍 PARA LLEVAR' : '🍽 COMER AQUÍ'}</div>

        <div className="tk-sep-solid" />

        {/* Productos */}
        <table className="tk-table-cli">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', width: '30px' }}>Cant</th>
              <th style={{ textAlign: 'left' }}>Producto</th>
              <th style={{ textAlign: 'right', width: '50px' }}>P/U</th>
              <th style={{ textAlign: 'right', width: '58px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ verticalAlign: 'top' }}>{item.cantidad}</td>
                <td style={{ verticalAlign: 'top' }}>{item.nombre}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{item.precio.toFixed(2)}</td>
                <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 900 }}>{item.subtotal.toFixed(2)}</td>
              </tr>
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
          <div className="tk-sep-dashed" style={{ margin: '6px 0' }} />
          <div className="tk-total-row tk-total-grande">
            <span>TOTAL</span>
            <span>{fmt(data.total)}</span>
          </div>
          <div className="tk-sep-dashed" style={{ margin: '6px 0' }} />
          <div className="tk-total-row">
            <span>Método de pago</span>
            <span style={{ textTransform: 'uppercase' }}>{data.metodoPago}</span>
          </div>
          {data.metodoPago === 'efectivo' && (
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
        </div>

        <div className="tk-sep-dashed" />

        {/* Pie */}
        <div className="tk-footer-cli">
          <p>{NEGOCIO.despedida}</p>
          <p style={{ marginTop: '4px', fontSize: '11px' }}>{NEGOCIO.nombre}</p>
        </div>
      </div>

      <style>{`
        /* ── RESET DE IMPRESIÓN ─────────────────── */
        @media print {
          .ticket-cocina {
            page-break-after: always;
            break-after: page;
          }
        }

        /* ── BASE COMPARTIDA ─────────────────────── */
        .ticket-cocina,
        .ticket-cliente {
          width: 80mm;
          margin: 0 auto;
          padding: 6mm 5mm;
          background: #fff;
          color: #000;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.5;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── TICKET COCINA ───────────────────────── */
        .ticket-cocina {
          border: 2px dashed #000;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .tk-header-cocina {
          text-align: center;
        }
        .tk-tipo-cocina {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .tk-num-cocina {
          font-size: 36px;
          font-weight: 900;
          line-height: 1;
        }
        .tk-hora-cocina {
          font-size: 11px;
          margin-top: 2px;
        }
        .tk-divider-cocina {
          border-bottom: 2px dashed #000;
          margin: 6px 0;
        }
        .tk-table-cocina {
          width: 100%;
          border-collapse: collapse;
        }
        .tk-table-cocina th {
          font-size: 11px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
        }
        .tk-table-cocina td {
          padding: 3px 0;
        }
        .tk-cant-cocina {
          width: 32px;
          font-size: 18px;
          font-weight: 900;
          vertical-align: top;
        }
        .tk-prod-cocina {
          font-size: 15px;
          font-weight: 900;
          vertical-align: top;
        }
        .tk-footer-cocina {
          text-align: center;
          font-size: 11px;
          margin-top: 4px;
        }

        /* ── TICKET CLIENTE ──────────────────────── */
        .tk-header-cli {
          text-align: center;
        }
        .tk-logo-txt {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }
        .tk-slogan {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .tk-sub-info {
          font-size: 11px;
          margin: 0;
        }

        .tk-sep-dashed {
          border-bottom: 1px dashed #000;
          margin: 7px 0;
        }
        .tk-sep-solid {
          border-bottom: 1px solid #000;
          margin: 7px 0;
        }

        .tk-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tk-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .tk-meta-row span:first-child {
          color: #444;
        }
        .tk-meta-row span:last-child {
          font-weight: 900;
        }

        .tk-tipo-cli {
          text-align: center;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.5px;
          margin: 4px 0;
        }

        .tk-table-cli {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .tk-table-cli th {
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
          font-size: 11px;
          text-transform: uppercase;
        }
        .tk-table-cli td {
          padding: 3px 0;
          font-size: 12px;
        }

        .tk-totales {
          display: flex;
          flex-direction: column;
        }
        .tk-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 2px;
        }
        .tk-total-grande {
          font-size: 18px;
          font-weight: 900;
        }
        .tk-cambio {
          font-weight: 900;
        }

        .tk-footer-cli {
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          margin-top: 4px;
        }
      `}</style>
    </>
  )
}
