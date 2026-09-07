-- Agregar columna carnet_cliente a la tabla ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS carnet_cliente VARCHAR(50);
