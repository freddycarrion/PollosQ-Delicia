-- ============================================================
-- Migración: Tabla Personal Operativo
-- Cocineros, Meseros, Ayudantes de cocina, etc.
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_operativo (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID          NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    nombre      VARCHAR(150)  NOT NULL,
    apellido    VARCHAR(150)  NOT NULL DEFAULT '',
    cargo       VARCHAR(80)   NOT NULL DEFAULT 'cocinero',
    -- 'cocinero', 'mesero', 'ayudante_cocina', 'cajero_operativo', 'limpieza', 'otro'
    telefono    VARCHAR(20),
    ci          VARCHAR(20),          -- Carnet de identidad
    salario_base NUMERIC(10,2),       -- Referencia de salario (opcional)
    activo      BOOLEAN       NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_personal_op_sucursal ON personal_operativo(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_personal_op_activo   ON personal_operativo(activo);
CREATE INDEX IF NOT EXISTS idx_personal_op_cargo    ON personal_operativo(cargo);

-- Trigger updated_at
CREATE TRIGGER trg_personal_operativo_updated_at
    BEFORE UPDATE ON personal_operativo
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE personal_operativo ENABLE ROW LEVEL SECURITY;

-- Admin y supervisor pueden ver el personal de su sucursal
CREATE POLICY "personal_op_ver"
  ON personal_operativo FOR SELECT
  USING (
    (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'supervisor'
      AND sucursal_id = (SELECT sucursal_id FROM perfiles WHERE id = auth.uid())
    )
  );

-- Admin y supervisor pueden crear personal
CREATE POLICY "personal_op_insertar"
  ON personal_operativo FOR INSERT
  WITH CHECK (
    (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'supervisor'
      AND sucursal_id = (SELECT sucursal_id FROM perfiles WHERE id = auth.uid())
    )
  );

-- Admin y supervisor pueden editar
CREATE POLICY "personal_op_actualizar"
  ON personal_operativo FOR UPDATE
  USING (
    (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'supervisor'
      AND sucursal_id = (SELECT sucursal_id FROM perfiles WHERE id = auth.uid())
    )
  );

-- Solo admin puede eliminar
CREATE POLICY "personal_op_eliminar"
  ON personal_operativo FOR DELETE
  USING ((SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin');

COMMENT ON TABLE personal_operativo IS
  'Personal operativo del negocio: cocineros, meseros, ayudantes, etc. No necesariamente tienen cuenta en el sistema.';
