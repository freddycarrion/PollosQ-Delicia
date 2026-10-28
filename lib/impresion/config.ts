export type PapelTicket = 58 | 80
export type CopiasTicket = 'ambos' | 'cocina' | 'cliente'
export type ModoImpresion = 'sistema' | 'ble' | 'serial'
export interface ConfigImpresora {
  papel: PapelTicket
  copias: CopiasTicket
  modo: ModoImpresion
  velocidad: number
}
export const CONFIG_IMPRESORA: ConfigImpresora = { papel: 80, copias: 'ambos', modo: 'sistema', velocidad: 9600 }
export const CLAVE_IMPRESORA = 'pollos-impresora-v1'

export function normalizarConfigImpresora(valor: unknown): ConfigImpresora {
  const c = valor && typeof valor === 'object' ? valor as Partial<ConfigImpresora> : {}
  return {
    papel: c.papel === 58 ? 58 : 80,
    copias: c.copias === 'cocina' || c.copias === 'cliente' ? c.copias : 'ambos',
    modo: c.modo === 'ble' || c.modo === 'serial' ? c.modo : 'sistema',
    velocidad: [9600, 19200, 38400, 57600, 115200].includes(Number(c.velocidad)) ? Number(c.velocidad) : 9600,
  }
}

export function anchoImprimible(papel: PapelTicket) { return papel === 58 ? 48 : 72 }
export function puntosImprimibles(papel: PapelTicket) { return papel === 58 ? 384 : 576 }
