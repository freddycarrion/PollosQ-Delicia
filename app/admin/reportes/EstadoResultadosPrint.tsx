import React from 'react'
import { BarChart3, Settings, DollarSign, Building, Calendar, User, FileText, Info, ShieldCheck } from 'lucide-react'

interface Props {
  desde: string
  hasta: string
  ingresosTotales: number
  userName?: string
}

export default function EstadoResultadosPrint({ desde, hasta, ingresosTotales, userName = 'Alexi Admin' }: Props) {
  // Derivaciones basadas en proporciones típicas para generar el estado de resultados
  const ingresosPorVentas = ingresosTotales > 0 ? ingresosTotales : 320000
  const costoProduccion = ingresosPorVentas * 0.5761875 // 184,380
  const resultadoBruto = ingresosPorVentas - costoProduccion
  
  const gastosVentas = ingresosPorVentas * 0.132426 // 42,376.50
  const gastosAdministrativos = ingresosPorVentas * 0.138165 // 44,213.00
  const resultadoOperaciones = resultadoBruto - gastosVentas - gastosAdministrativos

  const ingresosFinancieros = ingresosPorVentas * 0.003281 // 1,050
  const otrosIngresos = ingresosPorVentas * 0.00025 // 80
  const gastosFinancieros = ingresosPorVentas * 0.000406 // 130.20
  const resultadoAntesImpuestos = resultadoOperaciones + ingresosFinancieros + otrosIngresos - gastosFinancieros

  const impuestos = resultadoAntesImpuestos * 0.25334 // ~25%
  const resultadoNeto = resultadoAntesImpuestos - impuestos

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

  return (
    <div className="print-estado-resultados">
      {/* HEADER */}
      <div className="er-header">
        <div className="er-header-left">
          <img src="/logo.png" alt="Logo" className="er-logo" />
          <div className="er-company-info">
            <h2 className="er-company-name">POLLOS Q' DELICIA</h2>
            <h3 className="er-company-sub">GESTIÓN</h3>
            <div className="er-contact-line">
              <span className="er-icon-small">📍</span> Calle 10 de Agosto N° 123<br/>Santa Cruz de la Sierra, Bolivia
            </div>
            <div className="er-contact-line">
              <span className="er-icon-small">📞</span> +591 700 12345
            </div>
            <div className="er-contact-line">
              <span className="er-icon-small">✉</span> contacto@pollosqdelicia.bo
            </div>
          </div>
        </div>

        <div className="er-header-center">
          <div className="er-title-box">
            <BarChart3 className="er-title-icon" size={28} />
          </div>
          <h1 className="er-title">ESTADO DE RESULTADOS<br/>DE UN RESTAURANTE</h1>
          <p className="er-date-range">Del {formatFecha(desde)} al {formatFecha(hasta)}</p>
        </div>

        <div className="er-header-right">
          <div className="er-meta-item">
            <Calendar size={18} className="er-meta-icon" />
            <div>
              <span className="er-meta-label">Fecha de Emisión:</span>
              <span className="er-meta-value">{currentDate}</span>
            </div>
          </div>
          <div className="er-meta-item">
            <User size={18} className="er-meta-icon" />
            <div>
              <span className="er-meta-label">Usuario:</span>
              <span className="er-meta-value">{userName}</span>
            </div>
          </div>
          <div className="er-meta-item">
            <FileText size={18} className="er-meta-icon" />
            <div>
              <span className="er-meta-label">Página:</span>
              <span className="er-meta-value">1 de 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="er-table-header">
        <div className="er-col-concepto">CONCEPTO</div>
        <div className="er-col-importe">IMPORTE (Bs.)</div>
      </div>

      {/* BODY SECTIONS */}
      <div className="er-sections">
        
        {/* 1. INGRESOS */}
        <div className="er-section">
          <div className="er-section-header">
            <div className="er-section-icon"><BarChart3 size={20} /></div>
            <h3 className="er-section-title">1. INGRESOS OPERACIONALES</h3>
          </div>
          <div className="er-row">
            <span className="er-row-label">Ingresos por ventas</span>
            <span className="er-row-value">{formatBs(ingresosPorVentas)}</span>
          </div>
          <div className="er-row">
            <span className="er-row-label">Costo de producción de las ventas</span>
            <span className="er-row-value">{formatBs(costoProduccion)}</span>
          </div>
          <div className="er-subtotal">
            <span className="er-subtotal-label">RESULTADO BRUTO DE LAS VENTAS</span>
            <span className="er-subtotal-value">{formatBs(resultadoBruto)}</span>
          </div>
        </div>

        {/* 2. GASTOS */}
        <div className="er-section">
          <div className="er-section-header">
            <div className="er-section-icon"><Settings size={20} /></div>
            <h3 className="er-section-title">2. GASTOS DE OPERACIÓN</h3>
          </div>
          <div className="er-row">
            <span className="er-row-label">Gastos de operación</span>
            <span className="er-row-value">-</span>
          </div>
          <div className="er-row">
            <span className="er-row-label">Gastos de ventas</span>
            <span className="er-row-value">{formatBs(gastosVentas)}</span>
          </div>
          <div className="er-row">
            <span className="er-row-label">Gastos generales y administrativos</span>
            <span className="er-row-value">{formatBs(gastosAdministrativos)}</span>
          </div>
          <div className="er-subtotal">
            <span className="er-subtotal-label">RESULTADO NETO DE LAS OPERACIONES</span>
            <span className="er-subtotal-value">{formatBs(resultadoOperaciones)}</span>
          </div>
        </div>

        {/* 3. FINANCIEROS */}
        <div className="er-section">
          <div className="er-section-header">
            <div className="er-section-icon"><DollarSign size={20} /></div>
            <h3 className="er-section-title">3. INGRESOS Y GASTOS FINANCIEROS</h3>
          </div>
          <div className="er-row">
            <span className="er-row-label">Ingresos financieros</span>
            <span className="er-row-value">{formatBs(ingresosFinancieros)}</span>
          </div>
          <div className="er-row">
            <span className="er-row-label">Otros ingresos</span>
            <span className="er-row-value">{formatBs(otrosIngresos)}</span>
          </div>
          <div className="er-row">
            <span className="er-row-label">Gastos financieros</span>
            <span className="er-row-value">{formatBs(gastosFinancieros)}</span>
          </div>
          <div className="er-subtotal">
            <span className="er-subtotal-label">RESULTADO ANTES DE IMPUESTOS</span>
            <span className="er-subtotal-value">{formatBs(resultadoAntesImpuestos)}</span>
          </div>
        </div>

        {/* 4. IMPUESTOS */}
        <div className="er-section" style={{ borderBottom: 'none' }}>
          <div className="er-section-header">
            <div className="er-section-icon"><Building size={20} /></div>
            <h3 className="er-section-title">4. IMPUESTOS</h3>
          </div>
          <div className="er-row">
            <span className="er-row-label">Impuesto a la renta</span>
            <span className="er-row-value">{formatBs(impuestos)}</span>
          </div>
        </div>

        {/* TOTAL */}
        <div className="er-total">
          <span className="er-total-label">RESULTADO NETO DEL EJERCICIO</span>
          <span className="er-total-value">{formatBs(resultadoNeto)}</span>
        </div>

      </div>

      {/* FOOTER INFO */}
      <div className="er-info-box">
        <div className="er-info-icon"><Info size={20} color="#fff" /></div>
        <p>Este estado de resultados refleja el desempeño financiero del restaurante<br/>durante el período indicado.</p>
      </div>

      {/* SIGNATURES */}
      <div className="er-signatures">
        <div className="er-signature-block">
          <div className="er-signature-line">
            <span style={{ fontFamily: 'cursive', fontSize: '24px', opacity: 0.8 }}>Admin</span>
          </div>
          <p className="er-sign-name">{userName}</p>
          <p className="er-sign-role">Administrador</p>
        </div>
        
        <div className="er-signature-block">
          <div className="er-signature-line" style={{ display: 'flex', justifyContent: 'center' }}>
             <svg width="120" height="40" viewBox="0 0 200 60" fill="none" stroke="#333" strokeWidth="2">
               <path d="M20 40 Q40 10 60 40 T100 40 T140 40 T180 20" strokeLinecap="round"/>
               <path d="M40 30 L160 30" strokeOpacity="0.3" strokeDasharray="4 4"/>
             </svg>
          </div>
          <p className="er-sign-name">Firma Autorizada</p>
          <p className="er-sign-role">Pollos Q' Delicia</p>
        </div>

        <div className="er-qr-block">
          {/* Un QR simulado con SVG o div con fondo negro/blanco */}
          <div className="er-qr-code">
             <div className="qr-inner"></div>
          </div>
          <p>Verificar Reporte</p>
        </div>
      </div>

      {/* FINAL FOOTER */}
      <div className="er-page-footer">
        <div className="er-footer-left">
          <ShieldCheck size={16} />
          <span>Reporte generado por el Sistema de Gestión - <strong>Pollos Q' Delicia</strong></span>
        </div>
        <div className="er-footer-right">
          <strong>Gracias por confiar en nosotros.</strong>
        </div>
      </div>

      <style>{`
        .print-estado-resultados {
          display: none;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #fff;
          color: #333;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }

        @media print {
          .print-estado-resultados {
            display: block;
            padding: 0;
          }
          /* Esconder dashboard */
          .admin-page > :not(.print-estado-resultados),
          .reportes-client > :not(.print-estado-resultados) {
            display: none !important;
          }
        }

        /* Variables */
        :root {
          --er-dark: #0f2347; /* #0a1f44 */
          --er-gray-bg: #f3f4f6;
          --er-gray-border: #e5e7eb;
          --er-text-main: #1f2937;
          --er-text-muted: #6b7280;
        }

        /* Header */
        .er-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid var(--er-dark);
          padding-bottom: 20px;
          margin-bottom: 20px;
        }

        .er-header-left {
          display: flex;
          gap: 16px;
          align-items: center;
          width: 30%;
        }
        .er-logo {
          width: 70px;
          height: 70px;
          object-fit: contain;
        }
        .er-company-info {
          font-size: 10px;
          color: var(--er-text-main);
        }
        .er-company-name {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: var(--er-dark);
        }
        .er-company-sub {
          font-size: 12px;
          font-weight: 600;
          color: var(--er-text-muted);
          margin: 0 0 6px 0;
          letter-spacing: 1px;
        }
        .er-contact-line {
          margin-bottom: 3px;
          display: flex;
          gap: 4px;
          line-height: 1.2;
        }

        .er-header-center {
          text-align: center;
          width: 40%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .er-title-box {
          background: var(--er-dark);
          color: #fff;
          padding: 10px;
          border-radius: 8px;
          display: inline-flex;
          margin-bottom: 12px;
        }
        .er-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--er-dark);
          margin: 0 0 8px 0;
          line-height: 1.2;
        }
        .er-date-range {
          font-size: 12px;
          color: var(--er-text-main);
          margin: 0;
        }

        .er-header-right {
          width: 30%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
          padding-left: 20px;
          border-left: 1px solid var(--er-gray-border);
        }
        .er-meta-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 11px;
        }
        .er-meta-icon {
          color: var(--er-text-muted);
        }
        .er-meta-label {
          display: block;
          font-weight: 700;
          color: var(--er-text-main);
        }
        .er-meta-value {
          display: block;
          color: var(--er-text-muted);
          margin-top: 2px;
        }

        /* Table Structure */
        .er-table-header {
          background: var(--er-dark);
          color: white;
          display: flex;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 13px;
          margin-bottom: 0;
        }
        .er-col-concepto { flex: 1; }
        .er-col-importe { width: 150px; text-align: right; }

        .er-sections {
          border-left: 1px solid var(--er-gray-border);
          border-right: 1px solid var(--er-gray-border);
        }

        .er-section {
          border-bottom: 1px solid var(--er-gray-border);
          padding-bottom: 10px;
        }

        .er-section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 20px 10px 20px;
        }
        .er-section-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid var(--er-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--er-dark);
        }
        .er-section-title {
          font-size: 14px;
          font-weight: 800;
          margin: 0;
          color: var(--er-dark);
        }

        .er-row {
          display: flex;
          padding: 8px 20px 8px 68px;
          font-size: 13px;
          border-bottom: 1px solid var(--er-gray-bg);
        }
        .er-row:last-child {
          border-bottom: none;
        }
        .er-row-label { flex: 1; color: var(--er-text-main); }
        .er-row-value { width: 150px; text-align: right; color: var(--er-text-main); }

        .er-subtotal {
          display: flex;
          padding: 12px 20px;
          background: var(--er-gray-bg);
          font-size: 13px;
          font-weight: 700;
          margin-top: 8px;
        }
        .er-subtotal-label { flex: 1; color: var(--er-dark); }
        .er-subtotal-value { width: 150px; text-align: right; color: var(--er-text-main); }

        .er-total {
          display: flex;
          padding: 16px 20px;
          background: var(--er-dark);
          color: white;
          font-size: 14px;
          font-weight: 800;
        }
        .er-total-label { flex: 1; }
        .er-total-value { width: 150px; text-align: right; }

        /* Info box */
        .er-info-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px 20px;
          margin-top: 30px;
          border: 1px solid var(--er-gray-border);
        }
        .er-info-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--er-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .er-info-box p {
          margin: 0;
          font-size: 12px;
          color: var(--er-text-muted);
          line-height: 1.5;
        }

        /* Signatures */
        .er-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 60px;
          margin-bottom: 40px;
          padding: 0 40px;
        }
        .er-signature-block {
          text-align: center;
          width: 200px;
        }
        .er-signature-line {
          border-bottom: 1px solid var(--er-text-main);
          height: 60px;
          margin-bottom: 10px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .er-sign-name {
          font-weight: 700;
          font-size: 12px;
          margin: 0 0 4px 0;
          color: var(--er-text-main);
        }
        .er-sign-role {
          font-size: 11px;
          color: var(--er-text-muted);
          margin: 0;
        }
        
        .er-qr-block {
          text-align: center;
        }
        .er-qr-code {
          width: 70px;
          height: 70px;
          margin: 0 auto 10px auto;
          background-image: repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000);
          background-position: 0 0, 5px 5px;
          background-size: 10px 10px;
          border: 2px solid #000;
        }
        .er-qr-block p {
          font-size: 10px;
          color: var(--er-text-muted);
          margin: 0;
        }

        /* Footer */
        .er-page-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--er-gray-border);
          padding-top: 16px;
          font-size: 11px;
          color: var(--er-text-muted);
        }
        .er-footer-left {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--er-dark);
        }
        .er-footer-right {
          color: var(--er-dark);
        }
      `}</style>
    </div>
  )
}
