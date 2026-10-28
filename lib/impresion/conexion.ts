// Solo impresoras ESC/POS. No se envían comandos a dispositivos genéricos.
interface CaracteristicaBLE {
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValueWithResponse(data: Uint8Array<ArrayBuffer>): Promise<void>
  writeValueWithoutResponse(data: Uint8Array<ArrayBuffer>): Promise<void>
}
interface DispositivoBLE {
  name?: string
  gatt?: { connected: boolean; connect(): Promise<{ getPrimaryService(uuid: string): Promise<{ getCharacteristic(uuid: string): Promise<CaracteristicaBLE> }> }>; disconnect(): void }
  addEventListener(name: string, listener: () => void): void
  removeEventListener(name: string, listener: () => void): void
}
interface PuertoSerie {
  writable: WritableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
}
interface NavigatorImpresora extends Navigator {
  bluetooth?: { requestDevice(options: { filters: { services: string[] }[] }): Promise<DispositivoBLE> }
  serial?: { requestPort(): Promise<PuertoSerie> }
}

const SERVICIO = '000018f0-0000-1000-8000-00805f9b34fb'
const CARACTERISTICA = '00002af1-0000-1000-8000-00805f9b34fb'
let conexion: { tipo: 'ble'; dispositivo: DispositivoBLE; caracteristica: CaracteristicaBLE; limpiar: () => void } | { tipo: 'serial'; puerto: PuertoSerie } | null = null
let enviando = false
const observadores = new Set<() => void>()
const notificar = () => observadores.forEach(fn => fn())
export function observarImpresora(fn: () => void) { observadores.add(fn); return () => { observadores.delete(fn) } }
export function nombreImpresora() { return conexion?.tipo === 'ble' ? conexion.dispositivo.name || 'Impresora BLE' : conexion?.tipo === 'serial' ? 'Impresora por puerto' : '' }
export function modoConectado() { return conexion?.tipo || null }
export function compatibilidadImpresora() {
  if (typeof navigator === 'undefined') return { ble: false, serial: false }
  const n = navigator as NavigatorImpresora
  return { ble: !!n.bluetooth, serial: !!n.serial }
}

export async function conectarBLE() {
  if (enviando) throw new Error('Espera a que termine el envío actual.')
  if (conexion) throw new Error('Desconecta primero la impresora actual.')
  const api = (navigator as NavigatorImpresora).bluetooth
  if (!api) throw new Error('Este navegador no permite Bluetooth BLE. Usa Chrome actualizado o la impresión del sistema.')
  const dispositivo = await api.requestDevice({ filters: [{ services: [SERVICIO] }] })
  try {
    const servidor = await dispositivo.gatt?.connect()
    if (!servidor) throw new Error('No se pudo conectar la impresora BLE.')
    const servicio = await servidor.getPrimaryService(SERVICIO)
    const caracteristica = await servicio.getCharacteristic(CARACTERISTICA)
    if (!caracteristica.properties.write && !caracteristica.properties.writeWithoutResponse) throw new Error('La impresora no ofrece un canal de impresión compatible.')
    const alDesconectar = () => { if (conexion?.tipo === 'ble' && conexion.dispositivo === dispositivo) { conexion.limpiar(); conexion = null; notificar() } }
    dispositivo.addEventListener('gattserverdisconnected', alDesconectar)
    conexion = { tipo: 'ble', dispositivo, caracteristica, limpiar: () => dispositivo.removeEventListener('gattserverdisconnected', alDesconectar) }
    notificar()
  } catch (error) { dispositivo.gatt?.disconnect(); throw error }
}

export async function conectarSerie(velocidad: number) {
  if (enviando) throw new Error('Espera a que termine el envío actual.')
  if (conexion) throw new Error('Desconecta primero la impresora actual.')
  const api = (navigator as NavigatorImpresora).serial
  if (!api) throw new Error('Este navegador no ofrece acceso al puerto Bluetooth. Usa BLE, el sistema o la aplicación del fabricante.')
  const puerto = await api.requestPort()
  await puerto.open({ baudRate: velocidad })
  if (!puerto.writable) { await puerto.close(); throw new Error('El puerto de la impresora no permite escribir.') }
  conexion = { tipo: 'serial', puerto }; notificar()
}

export async function desconectarImpresora() {
  if (enviando) throw new Error('Espera a que termine el envío actual.')
  const actual = conexion
  try {
    if (actual?.tipo === 'ble') { actual.limpiar(); actual.dispositivo.gatt?.disconnect() }
    if (actual?.tipo === 'serial') await actual.puerto.close()
  } finally { conexion = null; notificar() }
}

export async function enviarTicket(datos: Uint8Array, tipo: 'ble' | 'serial', progreso?: (porcentaje: number) => void) {
  if (enviando) throw new Error('Ya se está enviando un ticket.')
  const actual = conexion
  if (!actual || actual.tipo !== tipo) throw new Error('Conecta la impresora seleccionada antes de imprimir.')
  enviando = true
  let escritor: WritableStreamDefaultWriter<Uint8Array> | undefined
  try {
    if (actual.tipo === 'serial') {
      if (!actual.puerto.writable) throw new Error('El puerto está desconectado.')
      escritor = actual.puerto.writable.getWriter()
    }
    const bloque = actual.tipo === 'ble' ? 20 : 512
    for (let i = 0; i < datos.length; i += bloque) {
      const parte = new Uint8Array(datos.slice(i, i + bloque))
      if (actual.tipo === 'ble') {
        if (!actual.dispositivo.gatt?.connected) throw new Error('Se perdió la conexión Bluetooth.')
        if (actual.caracteristica.properties.write) await actual.caracteristica.writeValueWithResponse(parte)
        else {
          await actual.caracteristica.writeValueWithoutResponse(parte)
          await new Promise(resolve => setTimeout(resolve, 15))
        }
      } else await escritor!.write(parte)
      progreso?.(Math.min(100, Math.round((i + parte.length) / datos.length * 100)))
    }
  } catch {
    throw new Error('El envío se interrumpió. El ticket pudo imprimirse parcialmente: comprueba el papel antes de volver a imprimir. La venta sigue guardada.')
  } finally { escritor?.releaseLock(); enviando = false }
}
