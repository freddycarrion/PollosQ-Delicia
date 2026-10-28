// Formato ESC/POS GS v 0: bloques pequeños para no saturar el búfer térmico.
export function codificarRaster(rgba: Uint8ClampedArray, ancho: number, alto: number): Uint8Array {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho <= 0 || alto <= 0 || ancho > 2048 || alto > 30000 || rgba.length !== ancho * alto * 4) {
    throw new Error('La imagen del ticket no tiene dimensiones válidas.')
  }
  const bytesPorFila = Math.ceil(ancho / 8)
  const bloques = Math.ceil(alto / 128)
  const salida = new Uint8Array(2 + bloques * 8 + bytesPorFila * alto + 5)
  salida.set([0x1b, 0x40])
  let posicion = 2
  for (let y = 0; y < alto; y += 128) {
    const filas = Math.min(128, alto - y)
    salida.set([0x1d, 0x76, 0x30, 0, bytesPorFila & 255, bytesPorFila >> 8, filas & 255, filas >> 8], posicion)
    posicion += 8
    for (let fila = 0; fila < filas; fila++) {
      for (let x = 0; x < ancho; x++) {
        const i = ((y + fila) * ancho + x) * 4
        const alpha = rgba[i + 3] / 255
        const gris = (rgba[i] * .299 + rgba[i + 1] * .587 + rgba[i + 2] * .114) * alpha + 255 * (1 - alpha)
        if (gris < 160) salida[posicion + (x >> 3)] |= 0x80 >> (x % 8)
      }
      posicion += bytesPorFila
    }
  }
  // Avance de papel; sin corte automático porque muchas portátiles no tienen cuchilla.
  salida.set([0x1b, 0x64, 4, 0x1b, 0x40], posicion)
  return salida
}
