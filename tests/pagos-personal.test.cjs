const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')

function cargar({ user = { id: 'autor-real' }, rol = 'admin', filas = [], error = null } = {}) {
  const escrituras = []
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(tabla) {
      const resultado = tabla === 'perfiles'
        ? { data: { rol, sucursal_id: 'sucursal-1', activo: true }, error: null }
        : { data: filas, error }
      const query = {
        select() { return query }, eq() { return query }, in() { return query },
        insert(datos) { escrituras.push({ tabla, datos }); return query },
        update(datos) { escrituras.push({ tabla, datos }); return query },
        delete() { escrituras.push({ tabla, eliminar: true }); return query },
        single: async () => tabla === 'perfiles' ? resultado : { data: filas[0], error },
        then(resolve, reject) { return Promise.resolve(resultado).then(resolve, reject) },
      }
      return query
    },
  }
  const codigo = ts.transpileModule(fs.readFileSync('app/admin/pagos-personal/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const exports = {}
  vm.runInNewContext(codigo, {
    exports, require: () => ({ createClient: async () => client }), console, Date, Set,
  })
  return { ...exports, escrituras }
}

const pago = { sucursal_id: 'sucursal-1', empleado_id: null, personal_operativo_id: null,
  nombre_empleado: 'Ana', concepto: 'Sueldo', periodo: 'diario', estado: 'pagado',
  monto: 50, fecha_pago: '2026-10-27', observaciones: null }

test('rechaza sesión ausente, rol sin permiso y sucursal ajena sin escribir', async () => {
  for (const opciones of [{ user: null }, { rol: 'cajero' }]) {
    const actions = cargar(opciones)
    assert.ok((await actions.registrarPagoPersonal(pago)).error)
    assert.equal(actions.escrituras.length, 0)
  }
  const supervisor = cargar({ rol: 'supervisor' })
  assert.ok((await supervisor.registrarPagoPersonal({ ...pago, sucursal_id: 'otra' })).error)
  assert.equal(supervisor.escrituras.length, 0)
})

test('usa autor de sesión y rechaza monto inválido', async () => {
  const actions = cargar({ filas: [{ id: 'pago-1' }] })
  assert.ok((await actions.registrarPagoPersonal({ ...pago, registrado_por: 'autor-falso' })).data)
  assert.equal(actions.escrituras[0].datos.registrado_por, 'autor-real')
  const invalido = cargar()
  assert.ok((await invalido.registrarPagoPersonal({ ...pago, monto: NaN })).error)
  assert.equal(invalido.escrituras.length, 0)
})

test('liquidación sin filas no informa éxito y devuelve solo filas confirmadas', async () => {
  assert.ok((await cargar().liquidarPagosPersonal(['pago-1'])).error)
  const result = await cargar({ filas: [{ id: 'pago-1', estado: 'pagado' }] })
    .liquidarPagosPersonal(['pago-1', 'pago-2'])
  assert.equal(result.data.length, 1)
  assert.equal(result.data[0].id, 'pago-1')
})

test('solo administrador puede editar o eliminar pagos', async () => {
  const actions = cargar({ rol: 'supervisor' })
  assert.ok((await actions.registrarPagoPersonal(pago, 'pago-1')).error)
  assert.ok((await actions.eliminarPagoPersonal('pago-1')).error)
  assert.equal(actions.escrituras.length, 0)
})

test('edición conserva autor y fecha de liquidación de pagos ya pagados', async () => {
  const actions = cargar({ filas: [{ id: 'pago-1', estado: 'pagado', fecha_pagado: '2026-10-01T12:00:00Z' }] })
  assert.ok((await actions.registrarPagoPersonal({ ...pago, monto: 80 }, 'pago-1')).data)
  assert.equal(actions.escrituras[0].datos.monto, 80)
  assert.equal(actions.escrituras[0].datos.fecha_pagado, '2026-10-01T12:00:00Z')
  assert.equal('registrado_por' in actions.escrituras[0].datos, false)
})

test('pasar a pendiente limpia fecha y eliminar exige confirmación de la base', async () => {
  const actions = cargar({ filas: [{ id: 'pago-1', estado: 'pagado', fecha_pagado: '2026-10-01T12:00:00Z' }] })
  assert.ok((await actions.registrarPagoPersonal({ ...pago, estado: 'pendiente' }, 'pago-1')).data)
  assert.equal(actions.escrituras[0].datos.fecha_pagado, null)
  assert.equal((await actions.eliminarPagoPersonal('pago-1')).data.id, 'pago-1')
  assert.ok((await cargar().eliminarPagoPersonal('no-existe')).error)
})
