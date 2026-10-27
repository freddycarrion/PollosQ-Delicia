import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esCategoriaSnack, cantidadSnackValida } from '../lib/snacks.ts'

test('reconoce Snack y Snacks sin incluir categorías parecidas', () => {
  for (const nombre of ['Snacks', ' snack ', 'SNACKS']) assert.equal(esCategoriaSnack(nombre), true)
  for (const nombre of ['Bebidas', 'Snack especial', '', 'Pollos']) assert.equal(esCategoriaSnack(nombre), false)
})

test('stock admite cero y enteros dentro del rango de PostgreSQL', () => {
  for (const cantidad of [0, 1, 80, 2147483647]) assert.equal(cantidadSnackValida(cantidad), true)
  for (const cantidad of [-1, 0.5, NaN, Infinity, 2147483648]) assert.equal(cantidadSnackValida(cantidad), false)
})
