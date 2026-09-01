-- ============================================================
-- Migración: Módulo de Pagos al Personal
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS pagos_personal (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id     UUID          NOT NULL REFERENCES sucursales(id)  ON DELETE RESTRICT,
    empleado_id     UUID                   REFERENCES perfiles(id)    ON DELETE SET NULL,
    registrado_por  UUID          NOT NULL REFERENCES perfiles(id)    ON DELETE RESTRICT,
    nombre_empleado VARCHAR(200)  NOT NULL,   -- guardado directamente para no perder el nombre si se elimina el empleado
    concepto        TEXT          NOT NULL,   -- ej: "Sueldo semanal", "Horas extra", "Bono"
    periodo         VARCHAR(20)   NOT NULL DEFAULT 'diario',  -- 'diario', 'semanal', 'mensual'
    monto           NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    fecha_pago      DATE          NOT NULL DEFAULT CURRENT_DATE,
    observaciones   TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_pagos_personal_sucursal   ON pagos_personal(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_pagos_personal_empleado   ON pagos_personal(empleado_id);
CREATE INDEX IF NOT EXISTS idx_pagos_personal_fecha      ON pagos_personal(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_personal_periodo    ON pagos_personal(periodo);
CREATE INDEX IF NOT EXISTS idx_pagos_personal_created_at ON pagos_personal(created_at DESC);

-- RLS
ALTER TABLE pagos_personal ENABLE ROW LEVEL SECURITY;

-- Admin y supervisor pueden ver todos los pagos de su sucursal
CREATE POLICY "pagos_personal_ver"
  ON pagos_personal FOR SELECT
  USING (
    (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin'
    OR (
      (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'supervisor' 
      AND sucursal_id = (SELECT sucursal_id FROM perfiles WHERE id = auth.uid())
    )
  );

-- Solo admin y supervisor pueden registrar pagos
CREATE POLICY "pagos_personal_insertar"
  ON pagos_personal FOR INSERT
  WITH CHECK (
    registrado_por = auth.uid()
    AND (
      (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin'
      OR (
        (SELECT rol FROM perfiles WHERE id = auth.uid()) = 'supervisor' 
        AND sucursal_id = (SELECT sucursal_id FROM perfiles WHERE id = auth.uid())
      )
    )
  );

-- Solo admin puede actualizar o eliminar
CREATE POLICY "pagos_personal_admin_modificar"
  ON pagos_personal FOR UPDATE
  USING ((SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "pagos_personal_admin_eliminar"
  ON pagos_personal FOR DELETE
  USING ((SELECT rol FROM perfiles WHERE id = auth.uid()) = 'admin');

COMMENT ON TABLE pagos_personal IS
  'Registro de pagos realizados al personal: sueldos, bonos, pagos por día/semana/mes.';
COMMENT ON COLUMN pagos_personal.periodo IS
  'Tipo de pago: diario, semanal o mensual.';
