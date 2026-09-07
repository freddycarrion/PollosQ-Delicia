-- ============================================================
-- Stock de Bebidas por Turno
-- Permite al cajero declarar cuántas bebidas hay disponibles
-- al abrir el turno, y se descuenta automáticamente al vender.
-- ============================================================

-- Asegurar que la función set_updated_at exista
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS stock_bebidas_turno (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turno_id        UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
    producto_id     UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre_producto VARCHAR(150) NOT NULL,
    stock_inicial   INTEGER NOT NULL DEFAULT 0 CHECK (stock_inicial >= 0),
    stock_actual    INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (turno_id, producto_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_bebidas_turno_id ON stock_bebidas_turno(turno_id);
CREATE INDEX IF NOT EXISTS idx_stock_bebidas_producto_id ON stock_bebidas_turno(producto_id);

-- Trigger updated_at
CREATE TRIGGER trg_stock_bebidas_updated_at
    BEFORE UPDATE ON stock_bebidas_turno
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE stock_bebidas_turno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_bebidas_cajero_ver" ON stock_bebidas_turno
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.cajero_id = auth.uid())
        OR get_my_rol() IN ('admin', 'supervisor')
    );

CREATE POLICY "stock_bebidas_cajero_insertar" ON stock_bebidas_turno
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.cajero_id = auth.uid())
        OR get_my_rol() IN ('admin', 'supervisor')
    );

CREATE POLICY "stock_bebidas_cajero_actualizar" ON stock_bebidas_turno
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.cajero_id = auth.uid())
        OR get_my_rol() IN ('admin', 'supervisor')
    );
