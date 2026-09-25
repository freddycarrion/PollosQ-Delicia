-- ============================================================
-- Migración: Agregar campo tipo_presas a productos
-- Propósito: Que las presas del POS no dependan del precio
--            sino de un valor fijo asignado en el admin.
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS tipo_presas TEXT
    CHECK (tipo_presas IN ('pierna_contra', 'pecho_ala'))
    DEFAULT NULL;

COMMENT ON COLUMN productos.tipo_presas IS
  'Si el producto requiere presas, indica cuáles mostrar en el POS:
   pierna_contra = Pierna y Contra,
   pecho_ala     = Pecho/Pechuga y Ala,
   NULL          = mostrar todas (o deducir por nombre).';

-- Asignar valores iniciales según los nombres actuales en BD
-- (Ajusta los LIKE si tus productos tienen nombres distintos)
UPDATE productos
  SET tipo_presas = 'pierna_contra'
  WHERE requiere_presas = TRUE
    AND (
      nombre ILIKE '%pierna%'
      OR nombre ILIKE '%contra%'
    );

UPDATE productos
  SET tipo_presas = 'pecho_ala'
  WHERE requiere_presas = TRUE
    AND (
      nombre ILIKE '%pecho%'
      OR nombre ILIKE '%pechuga%'
      OR nombre ILIKE '%ala%'
    );
