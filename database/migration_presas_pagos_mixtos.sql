-- ============================================================
--  MIGRACIÓN: Presas, Acompañamientos y Pagos Mixtos
--  Pollos Q' Delicia — Ejecutar en Supabase SQL Editor
--  Fecha: 2026-09-01
-- ============================================================

-- 1. Agregar flag "requiere_presas" a la tabla productos
--    Indica si al agregar el producto el cajero debe seleccionar
--    presas específicas (pechuga, pierna, ala, muslo) y acompañamientos.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS requiere_presas BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para filtrar rápidamente productos con presas
CREATE INDEX IF NOT EXISTS idx_productos_requiere_presas ON productos(requiere_presas);

-- 2. Agregar "notas_item" a detalle_ventas
--    Almacena las presas/acompañamientos elegidos como texto legible,
--    ejemplo: "Presas: Pechuga, Ala | Con: Arroz, Papas Fritas"
ALTER TABLE detalle_ventas
  ADD COLUMN IF NOT EXISTS notas_item TEXT;

-- 3. Agregar soporte para pagos mixtos (2 métodos de pago) en ventas
--    metodo_pago_2 y monto_pago_2 son nullables; solo se usan en pagos mixtos.
--    El campo "metodo_pago" sigue siendo el método primario (o único si no es mixto).
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS metodo_pago_2 metodo_pago,
  ADD COLUMN IF NOT EXISTS monto_pago_2  NUMERIC(10, 2);

-- ============================================================
-- NOTA IMPORTANTE: Trigger actualizar_totales_turno
-- El trigger existente ya maneja metodo_pago (primario). 
-- Para pagos mixtos, los totales por método quedan aproximados
-- (se suma solo el método primario, que debe ser el de mayor monto).
-- Si se requiere exactitud total por método, extender el trigger aquí.
-- ============================================================

COMMENT ON COLUMN productos.requiere_presas IS 
  'Si TRUE, al agregar este producto en el POS se solicita selección de presas y acompañamientos.';

COMMENT ON COLUMN detalle_ventas.notas_item IS 
  'Notas libres del ítem: presas elegidas, acompañamientos, personalizaciones.';

COMMENT ON COLUMN ventas.metodo_pago_2 IS 
  'Segundo método de pago en transacciones mixtas. NULL si el pago es con un solo método.';

COMMENT ON COLUMN ventas.monto_pago_2 IS 
  'Monto correspondiente al segundo método de pago. NULL si el pago es con un solo método.';
