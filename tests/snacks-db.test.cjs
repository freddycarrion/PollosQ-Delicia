// PostgreSQL temporal: instalar @electric-sql/pglite fuera del proyecto y definir
// PGLITE_MODULE_PATH con la ruta del módulo. No usa la base de producción.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite')
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

test('stock de snacks en PostgreSQL: venta, rollback, edición, anulación y RLS', async t => {
  const db = new PGlite()
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE perfiles (id uuid PRIMARY KEY, rol text, sucursal_id uuid, activo boolean DEFAULT true);
      CREATE TABLE sucursales (id uuid PRIMARY KEY);
      CREATE TABLE categorias (id uuid PRIMARY KEY, nombre text);
      CREATE TABLE productos (id uuid PRIMARY KEY, categoria_id uuid REFERENCES categorias(id));
      CREATE TABLE turnos (id uuid PRIMARY KEY, cajero_id uuid, sucursal_id uuid, estado text);
      CREATE TABLE ventas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), numero_ticket serial,
        turno_id uuid, cajero_id uuid, sucursal_id uuid, subtotal numeric, descuento numeric, total numeric,
        metodo_pago text, monto_recibido numeric, vuelto numeric, tipo_pedido text, nombre_cliente text,
        carnet_cliente text, estado text, metodo_pago_2 text, monto_pago_2 numeric);
      CREATE TABLE detalle_ventas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venta_id uuid REFERENCES ventas(id),
        producto_id uuid REFERENCES productos(id), nombre_producto text, precio_unitario numeric,
        cantidad smallint CHECK(cantidad > 0), subtotal numeric, notas_item text);
      GRANT SELECT ON perfiles, sucursales, categorias, productos TO authenticated;
      GRANT SELECT, UPDATE ON turnos TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON ventas TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON detalle_ventas TO authenticated;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
      CREATE POLICY ventas_propias ON ventas TO authenticated USING (cajero_id = auth.uid()) WITH CHECK(cajero_id = auth.uid());
      ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
      CREATE POLICY detalles_propios ON detalle_ventas TO authenticated USING (EXISTS(SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.cajero_id = auth.uid()));
    `)
    await db.exec(fs.readFileSync('database/migration_stock_snacks.sql', 'utf8'))
    await db.exec(`
      INSERT INTO sucursales VALUES ('${id(1)}'), ('${id(2)}');
      INSERT INTO perfiles VALUES ('${id(3)}', 'cajero', '${id(1)}', true), ('${id(4)}', 'admin', '${id(1)}', true);
      INSERT INTO categorias VALUES ('${id(5)}', 'Snacks'), ('${id(6)}', 'Pollos');
      INSERT INTO productos VALUES ('${id(7)}', '${id(5)}'), ('${id(8)}', '${id(6)}'), ('${id(9)}', '${id(5)}');
      INSERT INTO turnos VALUES ('${id(10)}', '${id(3)}', '${id(1)}', 'abierto');
      INSERT INTO stock_snacks (sucursal_id, producto_id, cantidad) VALUES
        ('${id(1)}', '${id(7)}', 5), ('${id(2)}', '${id(7)}', 20);
      SET ROLE authenticated;
      SET request.jwt.claim.sub = '${id(3)}';
    `)
    const datos = { turno_id: id(10), cajero_id: id(3), sucursal_id: id(1), subtotal: 20, descuento: 0, total: 20, metodo_pago: 'efectivo', estado: 'completada' }
    const detalle = (cantidad, producto = id(7)) => ({ producto_id: producto, nombre_producto: 'Snack', precio_unitario: 10, cantidad, subtotal: cantidad * 10 })
    const vender = detalles => db.query('SELECT registrar_venta_snacks($1::jsonb, $2::jsonb) AS venta', [JSON.stringify(datos), JSON.stringify(detalles)])
    const stock = async () => (await db.query('SELECT cantidad FROM stock_snacks WHERE sucursal_id = $1 AND producto_id = $2', [id(1), id(7)])).rows[0].cantidad
    let venta
    await t.test('venta descuenta la cantidad agregada de líneas repetidas', async () => {
      venta = (await vender([detalle(1), detalle(1), detalle(1, id(8))])).rows[0].venta
      assert.equal(await stock(), 3)
    })
    await t.test('insuficiencia revierte venta, detalles y descuentos previos', async () => {
      await assert.rejects(vender([detalle(2), detalle(2)]), /Stock insuficiente/)
      assert.equal(await stock(), 3)
      assert.equal((await db.query('SELECT count(*)::int AS n FROM ventas')).rows[0].n, 1)
    })
    await t.test('snack sin configurar bloquea venta', async () => {
      await assert.rejects(vender([detalle(1, id(9))]), /Configura el stock/)
    })
    await t.test('editar descuenta solo el resultado neto y falla sin borrar el pedido', async () => {
      await db.query('SELECT editar_venta_snacks($1, $2::jsonb, 40)', [venta.id, JSON.stringify([detalle(4)])])
      assert.equal(await stock(), 1)
      await assert.rejects(db.query('SELECT editar_venta_snacks($1, $2::jsonb, 60)', [venta.id, JSON.stringify([detalle(6)])]), /Stock insuficiente/)
      assert.equal(await stock(), 1)
      assert.equal((await db.query('SELECT sum(cantidad)::int AS n FROM detalle_ventas WHERE venta_id=$1', [venta.id])).rows[0].n, 4)
    })
    await t.test('anular devuelve stock una vez y reactivar lo descuenta', async () => {
      await db.query("UPDATE ventas SET estado='anulada' WHERE id=$1", [venta.id])
      assert.equal(await stock(), 5)
      await db.query("UPDATE ventas SET estado='anulada' WHERE id=$1", [venta.id])
      assert.equal(await stock(), 5)
      await db.query("UPDATE ventas SET estado='completada' WHERE id=$1", [venta.id])
      assert.equal(await stock(), 1)
    })
    await t.test('cajero no cambia stock ni ve otra sucursal', async () => {
      const cambios = await db.query('UPDATE stock_snacks SET cantidad=100 RETURNING id')
      assert.equal(cambios.rows.length, 0)
      assert.equal((await db.query('SELECT count(*)::int AS n FROM stock_snacks')).rows[0].n, 1)
      await assert.rejects(db.query('INSERT INTO stock_snacks (sucursal_id, producto_id, cantidad) VALUES ($1,$2,100)', [id(1), id(9)]), /row-level security/)
    })
    await t.test('versión evita que un ajuste viejo sobrescriba ventas recientes', async () => {
      const version = (await db.query('SELECT version FROM stock_snacks')).rows[0].version
      const intentos = await Promise.allSettled([vender([detalle(1)]), vender([detalle(1)])])
      assert.equal(intentos.filter(r => r.status === 'fulfilled').length, 1)
      assert.equal(intentos.filter(r => r.status === 'rejected').length, 1)
      await db.exec(`SET request.jwt.claim.sub = '${id(4)}'`)
      const result = await db.query('UPDATE stock_snacks SET cantidad=50 WHERE sucursal_id=$1 AND producto_id=$2 AND version=$3 RETURNING id', [id(1), id(7), version])
      assert.equal(result.rows.length, 0)
      assert.equal(await stock(), 0)
      assert.equal((await db.query('SELECT cantidad FROM stock_snacks WHERE sucursal_id=$1', [id(2)])).rows[0].cantidad, 20)
    })
  } finally { await db.close() }
})
