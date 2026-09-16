-- ============================================================
-- Migración: Estados de Pagos al Personal
-- Permite marcar pagos como pendientes o pagados,
-- y registrar la fecha en que se liquidaron.
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Añadir columna estado (pagado o pendiente)
ALTER TABLE pagos_personal 
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'pagado';

-- 2. Añadir columna para guardar la fecha de liquidación si estaba pendiente
ALTER TABLE pagos_personal 
ADD COLUMN IF NOT EXISTS fecha_pagado TIMESTAMPTZ;

-- 3. Crear índice para optimizar filtros por estado
CREATE INDEX IF NOT EXISTS idx_pagos_personal_estado ON pagos_personal(estado);

-- 4. Actualizar la descripción de la tabla para reflejar el cambio
COMMENT ON COLUMN pagos_personal.estado IS 'Estado del pago: "pagado" o "pendiente"';
COMMENT ON COLUMN pagos_personal.fecha_pagado IS 'Fecha en que se liquidó si el pago original era pendiente';
