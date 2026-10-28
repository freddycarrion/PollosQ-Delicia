import type { TicketData } from '@/app/pos/TicketVenta'
import { puntosImprimibles, type ConfigImpresora } from './config'

export function crearImagenTicket(ticket: TicketData, config: ConfigImpresora): HTMLCanvasElement {
  const ancho = puntosImprimibles(config.papel)
  const medida = document.createElement('canvas').getContext('2d')
  if (!medida) throw new Error('El navegador no pudo preparar el ticket.')
  const lineas: { texto: string; tamano: number; centro: boolean; negrita: boolean }[] = []
  const margen = 16
  function agregar(texto: string, tamano = 22, centro = false, negrita = false) {
    medida!.font = `${negrita ? 'bold ' : ''}${tamano}px Arial`
    // Se mide cada carácter: también permite nombres largos sin espacios.
    for (const parrafo of texto.split('\n')) {
      let linea = ''
      for (const letra of parrafo) {
        if (medida!.measureText(linea + letra).width > ancho - margen * 2 && linea) {
          lineas.push({ texto: linea, tamano, centro, negrita }); linea = ''
        }
        linea += letra
      }
      lineas.push({ texto: linea, tamano, centro, negrita })
    }
  }
  const separador = () => agregar('-'.repeat(config.papel === 58 ? 27 : 40), 20, true)
  function cabecera(tipo: string) {
    agregar("POLLOS Q' DELICIA", 26, true, true)
    agregar(tipo, 22, true, true)
    agregar(`#${ticket.numeroTicket}`, 40, true, true)
    if (ticket.esReimpresion) agregar('REIMPRESION', 20, true, true)
    agregar(ticket.fecha, 18, true)
    if (ticket.nombreCliente) agregar(`Cliente: ${ticket.nombreCliente}`, 20)
    if (ticket.carnetCliente) agregar(`CI/NIT: ${ticket.carnetCliente}`, 20)
    separador()
  }
  if (config.copias !== 'cliente') {
    cabecera('COCINA')
    for (const item of ticket.items) {
      agregar(`${item.cantidad} x ${item.nombre}`, 26, false, true)
      if (item.notas) agregar(item.notas.replace(/👉/g, ''), 22, false, true)
    }
    separador()
    agregar(ticket.cajeroNombre, 18)
    agregar(ticket.sucursalNombre, 18)
  }
  if (config.copias === 'ambos') { agregar(''); separador(); agregar('') }
  if (config.copias !== 'cocina') {
    cabecera('CLIENTE')
    agregar('av libertadores calle los claveles', 18, true)
    agregar('WhatsApp: 72632801', 18, true)
    agregar(`Cajero: ${ticket.cajeroNombre}`, 18)
    agregar(`Sucursal: ${ticket.sucursalNombre}`, 18)
    separador()
    for (const item of ticket.items) {
      agregar(`${item.cantidad} x ${item.nombre}`, 22, false, true)
      agregar(`P/U ${item.precio.toFixed(2)}   Bs. ${item.subtotal.toFixed(2)}`, 20)
      if (item.notas) agregar(item.notas.replace(/👉/g, ''), 18)
    }
    separador()
    agregar(`TOTAL Bs. ${ticket.total.toFixed(2)}`, 30, false, true)
    agregar(ticket.metodoPago === 'consumo_interno' ? 'CONSUMO INTERNO' : `Pago: ${ticket.metodoPago}${ticket.metodoPago2 ? ` + ${ticket.metodoPago2}` : ''}`, 20)
    agregar('Gracias por su visita!', 22, true)
  }
  const altura = lineas.reduce((s, l) => s + Math.ceil(l.tamano * 1.4), margen * 2)
  if (altura > 30000) throw new Error('Este ticket es demasiado largo para exportarlo como imagen. Usa la impresión del sistema.')
  const canvas = document.createElement('canvas')
  canvas.width = ancho; canvas.height = altura
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ancho, altura)
  ctx.fillStyle = '#000'; ctx.textBaseline = 'top'
  let y = margen
  for (const l of lineas) {
    ctx.font = `${l.negrita ? 'bold ' : ''}${l.tamano}px Arial`
    ctx.textAlign = l.centro ? 'center' : 'left'
    ctx.fillText(l.texto, l.centro ? ancho / 2 : margen, y)
    y += Math.ceil(l.tamano * 1.4)
  }
  return canvas
}

export function archivoTicket(canvas: HTMLCanvasElement, numero: string): Promise<File> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) reject(new Error('No se pudo crear la imagen del ticket.'))
    else resolve(new File([blob], `ticket-${numero.replace(/[^a-z0-9-]/gi, '')}.png`, { type: 'image/png' }))
  }, 'image/png'))
}
