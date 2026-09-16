-- ============================================================
-- Migración: Compras con texto libre
-- Permite registrar compras que no sean insumos previamente creados
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Quitar la restricción NOT NULL de insumo_id
ALTER TABLE detalle_compras ALTER COLUMN insumo_id DROP NOT NULL;

-- 2. Añadir columna para guardar el nombre de lo comprado (texto libre o nombre del insumo)
ALTER TABLE detalle_compras ADD COLUMN IF NOT EXISTS nombre_insumo VARCHAR(150);

-- 3. Actualizar la función del trigger para que ignore las compras de texto libre (no actualiza stock)
CREATE OR REPLACE FUNCTION actualizar_stock_insumo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.insumo_id IS NOT NULL THEN
        UPDATE insumos
        SET stock_actual = stock_actual + NEW.cantidad,
            updated_at   = NOW()
        WHERE id = NEW.insumo_id;
    END IF;
    RETURN NEW;
END;
$$;
