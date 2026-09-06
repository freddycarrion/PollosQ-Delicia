-- Permitir la eliminación de productos que ya tienen historial de ventas
-- Quitamos la restricción "NOT NULL" y cambiamos a "ON DELETE SET NULL"

ALTER TABLE public.detalle_ventas ALTER COLUMN producto_id DROP NOT NULL;

ALTER TABLE public.detalle_ventas
  DROP CONSTRAINT IF EXISTS detalle_ventas_producto_id_fkey;

ALTER TABLE public.detalle_ventas
  ADD CONSTRAINT detalle_ventas_producto_id_fkey 
  FOREIGN KEY (producto_id) REFERENCES public.productos(id) 
  ON DELETE SET NULL;
