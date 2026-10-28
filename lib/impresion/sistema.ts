import type { ConfigImpresora } from './config'

// Ventana dedicada: evita imprimir menús, modales y contenedores de altura fija.
// Se abre desde el clic del usuario; el botón de la nueva vista mantiene la
// activación necesaria para los navegadores móviles.
export function abrirImpresionSistema(contenido: HTMLElement, config: ConfigImpresora) {
  const ventana = window.open('', '_blank')
  if (!ventana) throw new Error('El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir el ticket.')
  const doc = ventana.document
  doc.title = 'Imprimir ticket — Pollos Q’ Delicia'
  doc.documentElement.lang = 'es'
  doc.head.innerHTML = ''
  doc.body.innerHTML = ''
  const meta = doc.createElement('meta')
  meta.name = 'viewport'; meta.content = 'width=device-width, initial-scale=1'
  doc.head.append(meta)
  const css = doc.createElement('style')
  css.textContent = `*{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif} .controles{padding:16px;text-align:center;position:sticky;top:0;background:white;border-bottom:1px solid #ddd}button{padding:12px 20px;font-size:16px;cursor:pointer}.recibo{width:${config.papel}mm;max-width:100%;margin:16px auto;background:white;padding:2mm} @media print{@page{size:auto;margin:0}html,body{height:auto!important;overflow:visible!important;background:white}.controles{display:none!important}.recibo{margin:0;padding:2mm;max-width:${config.papel}mm}.ticket-cocina,.ticket-cliente{break-after:auto!important;page-break-after:auto!important}tr{break-inside:avoid} }`
  doc.head.append(css)
  const controles = doc.createElement('div')
  controles.className = 'controles'
  const mensaje = doc.createElement('p')
  mensaje.textContent = `Selecciona la impresora y papel de ${config.papel} mm en el diálogo. Escala 100 %, sin encabezados ni pies del navegador.`
  const boton = doc.createElement('button')
  boton.textContent = 'Imprimir / Guardar PDF'
  boton.disabled = true
  boton.addEventListener('click', () => ventana.print())
  controles.append(mensaje, boton)
  const recibo = doc.createElement('div')
  recibo.className = 'recibo'
  recibo.innerHTML = contenido.innerHTML
  doc.body.append(controles, recibo)
  // Página física adaptada a la longitud real; evita el alto A4 fijo de antes.
  void doc.fonts.ready.then(() => {
    if (ventana.closed) return
    const altura = Math.max(40, Math.ceil(recibo.getBoundingClientRect().height * 25.4 / 96) + 2)
    const pagina = doc.createElement('style')
    pagina.textContent = `@media print{@page{size:${config.papel}mm ${Math.min(altura, 2000)}mm;margin:0}}`
    doc.head.append(pagina)
    boton.disabled = false
  }).catch(() => { if (!ventana.closed) boton.disabled = false })
}
