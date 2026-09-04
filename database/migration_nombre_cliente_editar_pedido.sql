-- ============================================================
--  Migration: nombre_cliente en ventas + edición de pedidos
--  Ejecutar en: Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna nombre_cliente a la tabla ventas
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS nombre_cliente VARCHAR(150);

-- 2. Permitir DELETE en detalle_ventas al cajero dueño de la venta
--    (necesario para editar/reemplazar los ítems de un pedido)
CREATE POLICY "detalle_venta_eliminar" ON detalle_ventas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.cajero_id = auth.uid())
    OR get_my_rol() IN ('admin', 'supervisor')
  );

-- 3. Permitir UPDATE en ventas al cajero (para actualizar total al editar)
--    La política existente "venta_admin_anular" solo cubre admin/supervisor.
--    Añadimos una política que permita al cajero actualizar SUS propias ventas.
CREATE POLICY "venta_cajero_actualizar_propia" ON ventas
  FOR UPDATE USING (cajero_id = auth.uid())
  WITH CHECK (cajero_id = auth.uid());
