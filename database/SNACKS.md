# Inventario de Snacks

## Activación en producción

1. En el proyecto Supabase de PollosQ-Delicia, abrir **SQL Editor**.
2. Ejecutar el archivo completo `database/migration_stock_snacks.sql` una sola vez.
   El script usa una transacción: si falla, no deja una instalación parcial.
3. Cuando esté desplegado el código, abrir **Admin → Snacks**, seleccionar la
   sucursal y guardar la cantidad total disponible de cada producto.
4. En el cajero, actualizar el stock o esperar hasta 15 segundos. La categoría
   debe llamarse **Snacks** o **Snack** (se ignoran mayúsculas y espacios externos).

No se cargan cantidades ficticias. Un snack sin cantidad registrada se muestra
agotado y no se puede vender. Si no se puede consultar el inventario, se muestra
“SIN DATOS” y se bloquea la selección hasta recuperar la conexión.

Los administradores gestionan todas las sucursales; los supervisores solo la
suya. Los cajeros pueden consultar su stock, pero no modificarlo directamente.

Las cantidades persisten entre turnos. “Guardar” establece la existencia total
actual, no añade unidades a la cantidad anterior. Si hubo una venta desde la
última carga del formulario, el ajuste se rechaza para evitar sobrescribirla:
actualizar el listado y verificar el nuevo total antes de guardar.

## Ventas y devoluciones

Las ventas con snacks se registran mediante `registrar_venta_snacks`, que guarda
venta y detalles en una transacción. Los triggers descuentan el stock con una
actualización condicional bloqueada por fila. Si no alcanza, toda la venta se
revierte; el pedido del cajero se conserva. No se reintenta automáticamente.

Editar un pedido utiliza `editar_venta_snacks` para devolver y descontar las
cantidades dentro de una transacción. Se preservan los IDs de producto. Anular
una venta devuelve solo las cantidades previamente descontadas; repetir la
anulación no duplica la devolución. Las ventas históricas no reciben descuentos
retroactivos al instalar la migración.

## Validación local

- `npm run build`
- `node --test tests/snacks.test.mjs`
- Instalar `@electric-sql/pglite` en un directorio temporal (fuera del proyecto),
  definir `PGLITE_MODULE_PATH` con la ruta del módulo y ejecutar
  `node --test tests/snacks-db.test.cjs`.

La prueba PostgreSQL utiliza datos ficticios y una base temporal en memoria;
no se conecta a producción. Incluye rollback por insuficiencia, varias líneas
del mismo producto, edición fallida sin pérdida del pedido, anulación y RLS.
