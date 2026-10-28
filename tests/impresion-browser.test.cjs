// Prueba opcional: PLAYWRIGHT_MODULE_PATH y PRINT_BROWSER_PATH deben apuntar
// a playwright-core y a Chrome/Edge instalados. No usa impresoras ni datos reales.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core')
function codigo(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText
}
function cargar(file, imports = {}) {
  const exports = {}
  vm.runInNewContext(codigo(file), { exports, require: name => imports[name] || require(name) })
  return exports
}
const configModule = cargar('lib/impresion/config.ts')
const Ticket = cargar('app/pos/TicketVenta.tsx', { '@/lib/impresion/config': configModule }).default

test('Chrome real: tickets 58/80, ventana de impresión y raster móvil', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PRINT_BROWSER_PATH, headless: true })
  try {
    for (const papel of [58, 80]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      const config = { papel, modo: 'sistema', copias: 'ambos', velocidad: 9600 }
      const data = { numeroTicket: 'PRUEBA', fecha: '28/10/2026 12:00', sucursalNombre: 'Sucursal de prueba', cajeroNombre: 'Cajero de prueba', metodoPago: 'efectivo', tipoPedido: 'mesa', total: 16, recibido: 20, vuelto: 4,
        items: [{ nombre: 'Económico de pollo con acompañamientos y nombre muy largo', cantidad: 1, precio: 16, subtotal: 16, notas: 'Ñ á é í ó ú · Arroz, papa y fideo [Para Llevar]' }] }
      await page.setContent(`<button id="abrir">Abrir impresión</button><div id="ticket">${renderToStaticMarkup(React.createElement(Ticket, { data, papel }))}</div>`)
      await page.addScriptTag({ content: `window.config = ${JSON.stringify(config)};window.__sistema={};(function(exports){${codigo('lib/impresion/sistema.ts')}})(window.__sistema);document.querySelector('#abrir').onclick=()=>window.__sistema.abrirImpresionSistema(document.querySelector('#ticket'),window.config);` })
      const popupPromise = page.waitForEvent('popup')
      await page.locator('#abrir').click()
      const popup = await popupPromise
      await popup.getByRole('button', { name: 'Imprimir / Guardar PDF' }).waitFor()
      await popup.emulateMedia({ media: 'print' })
      assert.equal(await popup.locator('.controles').evaluate(e => getComputedStyle(e).display), 'none')
      const resultado = await popup.locator('.ticket-cliente').evaluate(e => ({ ancho: e.getBoundingClientRect().width, desborde: e.scrollWidth > e.clientWidth + 1 }))
      assert.ok(Math.abs(resultado.ancho - (papel === 58 ? 48 : 72) * 96 / 25.4) < 1)
      assert.equal(resultado.desborde, false)
      await page.addScriptTag({ content: `window.__config={};(function(exports){${codigo('lib/impresion/config.ts')}})(window.__config);window.__imagen={};(function(exports,require){${codigo('lib/impresion/ticket-imagen.ts')}})(window.__imagen,()=>window.__config);` })
      const imagen = await page.evaluate(({ data, config }) => {
        const c = window.__imagen.crearImagenTicket(data, config)
        return { ancho: c.width, alto: c.height, png: c.toDataURL('image/png').startsWith('data:image/png;base64,') }
      }, { data, config })
      assert.equal(imagen.ancho, papel === 58 ? 384 : 576)
      assert.ok(imagen.alto > 100)
      assert.equal(imagen.png, true)
      if (process.env.PRINT_QA_DIR) {
        fs.mkdirSync(process.env.PRINT_QA_DIR, { recursive: true })
        await popup.locator('.recibo').screenshot({ path: path.join(process.env.PRINT_QA_DIR, `ticket-${papel}mm.png`) })
      }
      await page.close(); await popup.close()
    }
  } finally { await browser.close() }
})
