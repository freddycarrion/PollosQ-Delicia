const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function acciones({ user = { id: 'usuario' }, rol = 'admin', activo = true, sucursal = 's1', compra = null, error = null } = {}) {
  const accesos = []
  const filtros = []
  const admin = { from(tabla) {
    accesos.push(tabla)
    const query = {
      select() { return this },
      eq(campo, valor) { filtros.push([tabla, campo, valor]); return this },
      async single() { return tabla === 'perfiles'
        ? { data: { rol, activo, sucursal_id: sucursal }, error: null }
        : { data: compra, error } },
    }
    return query
  } }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/admin/inventario/compras/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, console, process: { env: {} }, require: nombre => ({
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
    '@supabase/supabase-js': { createClient: () => admin },
  })[nombre] })
  return { ...exports, accesos, filtros }
}

const compra = {
  id: 'compra-1', numero_factura: null, fecha_compra: '2026-10-26', total: '805.00', observaciones: 'Mercado',
  proveedores: { nombre: 'Mercado La Villa' }, sucursales: [{ nombre: 'Sucursal 1' }], perfiles: { nombre: 'Ana', apellido: 'Pérez' },
  detalle_compras: [
    { id: 'a', nombre_insumo: 'Pollo registrado', cantidad: '10.5', precio_unitario: '20', subtotal: '210', insumos: { nombre: 'Pollo actual', unidad: 'kg' } },
    { id: 'b', nombre_insumo: 'Transporte', cantidad: '1', precio_unitario: '15', subtotal: '15', insumos: null },
    { id: 'c', nombre_insumo: null, cantidad: '2', precio_unitario: '3', subtotal: '6', insumos: [{ nombre: 'Papa', unidad: 'kg' }] },
  ],
}

test('exige sesión, rol autorizado y perfil activo antes de consultar compras', async () => {
  for (const opciones of [{ user: null }, { rol: 'cajero' }, { activo: false }]) {
    const api = acciones(opciones)
    assert.ok((await api.obtenerDetalleCompra('compra-1')).error)
    assert.equal(api.accesos.includes('compras'), false)
  }
})

test('supervisor consulta solamente su sucursal y no puede consultar sin sucursal', async () => {
  const api = acciones({ rol: 'supervisor', compra })
  assert.ok((await api.obtenerDetalleCompra('compra-1')).data)
  assert.ok(api.filtros.some(f => f[0] === 'compras' && f[1] === 'sucursal_id' && f[2] === 's1'))
  const sinSucursal = acciones({ rol: 'supervisor', sucursal: null })
  assert.ok((await sinSucursal.obtenerDetalleCompra('compra-1')).error)
})

test('devuelve artículos libres, nombres históricos, unidades, importes y metadatos reales', async () => {
  const { data, error } = await acciones({ compra }).obtenerDetalleCompra('compra-1')
  assert.equal(error, undefined)
  assert.equal(data.total, 805)
  assert.equal(data.registradoPor, 'Ana Pérez')
  assert.equal(data.sucursal, 'Sucursal 1')
  assert.equal(data.articulos.length, 3)
  assert.equal(data.articulos[0].nombre, 'Pollo registrado')
  assert.equal(data.articulos[0].cantidad, 10.5)
  assert.equal(data.articulos[1].nombre, 'Transporte')
  assert.equal(data.articulos[1].unidad, 'unid.')
  assert.equal(data.articulos[2].nombre, 'Papa')
})

test('compra sin detalle muestra lista vacía; error de consulta no inventa datos', async () => {
  const resultado = await acciones({ compra: { ...compra, detalle_compras: [] } }).obtenerDetalleCompra('compra-1')
  assert.equal(resultado.data.articulos.length, 0)
  const fallo = await acciones({ error: { message: 'network' } }).obtenerDetalleCompra('compra-1')
  assert.ok(fallo.error)
  assert.equal(fallo.data, undefined)
})
