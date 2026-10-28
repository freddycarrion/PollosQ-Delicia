const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function cargar(ruta, extras = {}, dependencias = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(ruta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, console, Uint8Array, Uint8ClampedArray, setTimeout, require: nombre => dependencias[nombre] || require(nombre), ...extras })
  return exports
}
const config = cargar('lib/impresion/config.ts')
const { codificarRaster } = cargar('lib/impresion/raster.ts')

test('configuración valida papel, copias, modo y velocidad', () => {
  const defecto = config.normalizarConfigImpresora({ papel: 999, copias: 'hack', modo: 'otro', velocidad: -1 })
  assert.equal(defecto.papel, 80)
  assert.equal(defecto.modo, 'sistema')
  assert.equal(defecto.velocidad, 9600)
  assert.equal(config.anchoImprimible(58), 48)
  assert.equal(config.anchoImprimible(80), 72)
  assert.equal(config.normalizarConfigImpresora({ papel: 58, copias: 'cocina', modo: 'ble' }).copias, 'cocina')
})

test('raster ESC/POS codifica negro, blanco, transparencia y píxeles incompletos', () => {
  const rgba = new Uint8ClampedArray(9 * 4).fill(255)
  rgba.set([0, 0, 0, 255], 0)
  rgba.set([0, 0, 0, 0], 4) // transparente se imprime blanco
  rgba.set([0, 0, 0, 255], 32)
  const salida = codificarRaster(rgba, 9, 1)
  assert.deepEqual(Array.from(salida.slice(0, 10)), [27, 64, 29, 118, 48, 0, 2, 0, 1, 0])
  assert.deepEqual(Array.from(salida.slice(10, 12)), [128, 128])
})

test('tickets largos se dividen en bandas y respetan 384/576 puntos', () => {
  for (const ancho of [384, 576]) {
    const salida = codificarRaster(new Uint8ClampedArray(ancho * 129 * 4).fill(255), ancho, 129)
    const segundaCabecera = 2 + 8 + ancho / 8 * 128
    assert.equal(salida[6], ancho / 8)
    assert.equal(salida[8], 128)
    assert.equal(salida[segundaCabecera + 6], 1)
    assert.equal(salida.length, 2 + 16 + ancho / 8 * 129 + 5)
  }
  assert.throws(() => codificarRaster(new Uint8ClampedArray(4), 0, 1))
  assert.throws(() => codificarRaster(new Uint8ClampedArray(4), 384, 1))
})

test('conexión BLE requiere selección y envía bloques pequeños sin duplicar trabajos', async () => {
  let peticion
  const escrituras = []
  let desconexion
  const dispositivo = { name: 'Impresora de prueba',
    addEventListener: (_, fn) => { desconexion = fn }, removeEventListener() {},
    gatt: { connected: true, disconnect() { this.connected = false },
      connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ({
        properties: { write: true }, writeValueWithResponse: async datos => { escrituras.push(Array.from(datos)) },
      }) }) }),
    },
  }
  const api = cargar('lib/impresion/conexion.ts', { navigator: { bluetooth: { requestDevice: async opciones => { peticion = opciones; return dispositivo } } } })
  await assert.rejects(api.enviarTicket(new Uint8Array(1), 'ble'), /Conecta/)
  await api.conectarBLE()
  assert.equal(peticion.filters[0].services[0], '000018f0-0000-1000-8000-00805f9b34fb')
  assert.equal(escrituras.length, 0) // conectar no imprime
  await api.enviarTicket(new Uint8Array(45).fill(7), 'ble')
  assert.deepEqual(escrituras.map(e => e.length), [20, 20, 5])
  assert.equal(api.nombreImpresora(), 'Impresora de prueba')
  dispositivo.gatt.connected = false; desconexion()
  assert.equal(api.nombreImpresora(), '')
})

test('puerto envía una vez, libera el bloqueo y no reintenta un fallo parcial', async () => {
  let envios = 0, liberaciones = 0, cierres = 0
  const puerto = { open: async () => {}, close: async () => { cierres++ }, writable: {
    getWriter: () => ({ write: async () => { envios++; throw new Error('disconnected') }, releaseLock: () => { liberaciones++ } }),
  } }
  const api = cargar('lib/impresion/conexion.ts', { navigator: { serial: { requestPort: async () => puerto } } })
  await api.conectarSerie(9600)
  await assert.rejects(api.enviarTicket(new Uint8Array(1000), 'serial'), /parcialmente/)
  assert.equal(envios, 1)
  assert.equal(liberaciones, 1)
  await api.desconectarImpresora()
  assert.equal(cierres, 1)
})

test('ticket HTML se adapta a ambos papeles y escapa los nombres de clientes', () => {
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Ticket = cargar('app/pos/TicketVenta.tsx', {}, { '@/lib/impresion/config': config }).default
  const data = { numeroTicket: '01', fecha: '28/10/2026', sucursalNombre: 'Sucursal', cajeroNombre: 'Cajero', metodoPago: 'efectivo', tipoPedido: 'mesa', total: 16, recibido: 20, vuelto: 4, nombreCliente: '<script>alert(1)</script>', items: [{ nombre: 'Económico', cantidad: 1, precio: 16, subtotal: 16 }] }
  for (const [papel, ancho] of [[58, 48], [80, 72]]) {
    const html = renderToStaticMarkup(React.createElement(Ticket, { data, papel, copias: 'cliente' }))
    assert.match(html, new RegExp(`width: ${ancho}mm`))
    assert.ok(html.includes('&lt;script&gt;'))
    assert.equal(html.includes('<script>alert'), false)
    assert.ok(html.includes('display:none'))
    assert.equal(html.includes('page-break-after: always'), false)
  }
})
