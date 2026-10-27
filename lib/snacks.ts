export function esCategoriaSnack(nombre: string) {
  return ['snack', 'snacks'].includes(nombre.trim().toLowerCase())
}

export interface StockSnack {
  producto_id: string
  nombre: string
  disponible: boolean
  cantidad: number
  version: number | null
}

export function cantidadSnackValida(cantidad: number) {
  return Number.isSafeInteger(cantidad) && cantidad >= 0 && cantidad <= 2147483647
}
