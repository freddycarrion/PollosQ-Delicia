const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function modulo(ruta, imports = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(ruta, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: nombre => imports[nombre], console })
  return exports
}
const calculos = modulo('lib/turnos-totales.ts')
const { leerTotalesTurnos } = modulo('lib/supabase/turnos-totales.ts', { '../turnos-totales': calculos })
const venta = (extra = {}) => ({ turno_id: 't1', estado: 'completada', total: 16,
  metodo_pago: 'efectivo', metodo_pago_2: null, monto_pago_2: null, ...extra })

test('efectivo, QR y pago mixto suman por turno sin incluir anulaciones', () => {
  const totales = calculos.calcularTotalesTurnos([
    venta(), venta({ total: 19, metodo_pago: 'qr' }),
    venta({ total: 30, metodo_pago_2: 'qr', monto_pago_2: 10 }),
    venta({ total: 999, estado: 'anulada' }), venta({ total: 999, estado: 'pendiente' }),
    venta({ turno_id: 't2', total: 5 }),
  ])
  assert.equal(totales.t1.total_efectivo, 36)
  assert.equal(totales.t1.total_qr, 29)
  assert.equal(totales.t1.num_ventas, 3)
  assert.equal(totales.t2.total_efectivo, 5)
})

test('centavos exactos y métodos secundarios no se cuentan dos veces', () => {
  const t = calculos.calcularTotalesTurnos([
    venta({ total: '0.10' }), venta({ total: '0.20' }),
    venta({ total: 20, metodo_pago: 'qr', metodo_pago_2: 'efectivo', monto_pago_2: 8 }),
    venta({ total: 10, metodo_pago: 'tarjeta' }),
    venta({ total: 12, metodo_pago: 'transferencia' }),
  ]).t1
  assert.equal(t.total_efectivo, 8.3)
  assert.equal(t.total_qr, 12)
  assert.equal(t.total_tarjeta, 10)
  assert.equal(t.total_transferencia, 12)
})

function cliente(paginas) {
  const rangos = []
  const query = {
    select() { return this }, in() { return this }, eq() { return this }, order() { return this },
    async range(inicio, fin) { rangos.push([inicio, fin]); return paginas.shift() },
  }
  return { from: () => query, rangos }
}

test('consulta todas las páginas de ventas y no corta a las mil primeras', async () => {
  const client = cliente([{ data: Array.from({ length: 1000 }, () => venta()), error: null }, { data: [venta()], error: null }])
  const total = await leerTotalesTurnos(client, ['t1'])
  assert.equal(total.t1.total_efectivo, 16016)
  assert.equal(total.t1.num_ventas, 1001)
  assert.deepEqual(client.rangos, [[0, 999], [1000, 1999]])
})

test('un fallo de consulta no devuelve ceros ni montos parciales', async () => {
  const client = cliente([{ data: Array.from({ length: 1000 }, () => venta()), error: null }, { data: null, error: { message: 'network' } }])
  await assert.rejects(leerTotalesTurnos(client, ['t1']), /No se pudieron consultar/)
})
