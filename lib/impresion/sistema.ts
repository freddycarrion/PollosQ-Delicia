import type { ConfigImpresora } from './config'

// Ventana dedicada: evita imprimir menús, modales y contenedores de altura fija.
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
  css.textContent = `*{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif}.recibo{width:${config.papel}mm;max-width:100%;margin:0 auto;background:white;padding:2mm}@media print{@page{margin:0}html,body{height:auto!important;overflow:visible!important;background:white}.recibo{margin:0;padding:2mm;max-width:${config.papel}mm}.ticket-cocina,.ticket-cliente{break-after:auto!important;page-break-after:auto!important}tr{break-inside:avoid}}`
  doc.head.append(css)
  const recibo = doc.createElement('div')
  recibo.className = 'recibo'
  recibo.innerHTML = contenido.innerHTML
  doc.body.append(recibo)
  // Un solo tamaño calculado para toda la tira evita páginas por copia y papel sobrante.
  void doc.fonts.ready.then(() => {
    if (ventana.closed) return
    const altura = Math.max(40, Math.ceil(recibo.getBoundingClientRect().height * 25.4 / 96) + 2)
    const pagina = doc.createElement('style')
    pagina.textContent = `@media print{@page{size:${config.papel}mm ${Math.min(altura, 2000)}mm;margin:0}}`
    doc.head.append(pagina)
    ventana.focus()
    ventana.print()
  }).catch(() => { if (!ventana.closed) ventana.print() })
}
