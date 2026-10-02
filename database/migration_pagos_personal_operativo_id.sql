-- ============================================================
-- Migración: Añadir personal_operativo_id a pagos_personal
-- Esta columna es necesaria para vincular pagos con personal
-- operativo (cocineros, meseros, etc.) sin cuenta de usuario.
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Añadir la columna (nullable, FK a personal_operativo)
ALTER TABLE pagos_personal
ADD COLUMN IF NOT EXISTS personal_operativo_id UUID
  REFERENCES personal_operativo(id) ON DELETE SET NULL;

-- 2. Índice para acelerar búsquedas por personal operativo
CREATE INDEX IF NOT EXISTS idx_pagos_personal_operativo_id
  ON pagos_personal(personal_operativo_id);

-- 3. Comentario descriptivo
COMMENT ON COLUMN pagos_personal.personal_operativo_id IS
  'Referencia al personal operativo (cocineros, meseros, etc.) que no tienen cuenta de usuario en el sistema.';
