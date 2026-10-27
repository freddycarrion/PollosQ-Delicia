import { test } from 'node:test'
import assert from 'node:assert/strict'
import { agruparProductosVendidos } from '../lib/reportes-productos.ts'

test('distingue productos renombrados conservando unidades e importes originales', () => {
  const datos = [
    { producto_id: 'a', nombre_producto: 'Economico 16bs', cantidad: 2, subtotal: '32', productos: { nombre: 'Economico 19bs' } },
    { producto_id: 'a', nombre_producto: 'Economico 19bs', cantidad: 1, subtotal: '19', productos: { nombre: 'Economico 19bs' } },
    { producto_id: 'b', nombre_producto: 'Economico 16BS', cantidad: 1, subtotal: 16, productos: [{ nombre: 'Economico 16BS' }] },
  ]
  const resultado = agruparProductosVendidos(datos)
  assert.equal(resultado.length, 2)
  assert.deepEqual(resultado[0], { producto_id: 'a', nombre_producto: 'Economico 19bs', total_unidades: 3, total_bs: 51 })
  assert.equal(resultado[1].nombre_producto, 'Economico 16BS')
  assert.deepEqual(datos[0].nombre_producto, 'Economico 16bs')
})

test('separa productos sin ID y unifica solo variantes de escritura históricas', () => {
  const resultado = agruparProductosVendidos([
    { producto_id: null, nombre_producto: ' Económico  16BS ', cantidad: 1, subtotal: 16 },
    { producto_id: null, nombre_producto: 'economico 16bs', cantidad: 2, subtotal: 32 },
    { producto_id: null, nombre_producto: 'Soda Pop', cantidad: 1, subtotal: 5 },
    { producto_id: 'b', nombre_producto: 'Economico 16BS', cantidad: 1, subtotal: 16, productos: { nombre: 'Economico 16BS' } },
  ])
  assert.equal(resultado.length, 3)
  assert.equal(resultado[0].total_unidades, 3)
  assert.match(resultado[0].nombre_producto, /sin referencia/)
  assert.equal(resultado.reduce((s, p) => s + p.total_bs, 0), 69)
  assert.equal(resultado.reduce((s, p) => s + p.total_unidades, 0), 5)
})

test('tolera catálogo ausente y reporte vacío', () => {
  assert.deepEqual(agruparProductosVendidos([]), [])
  assert.equal(agruparProductosVendidos([{ producto_id: 'eliminado', nombre_producto: 'Producto anterior', cantidad: 1, subtotal: 10, productos: null }])[0].nombre_producto, 'Producto anterior')
})
