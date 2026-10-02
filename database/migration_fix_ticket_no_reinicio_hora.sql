-- ============================================================
-- Fix: El contador de tickets se reiniciaba a las 8pm porque
-- CURRENT_DATE en Supabase (UTC) cambia a medianoche UTC, que
-- equivale a las 8pm en zonas UTC-4.
--
-- Solución: Eliminar la llave de fecha del contador.
-- El ticket sólo reinicia al llegar a 99 → vuelve a 1.
-- Ejecuta esto en el SQL Editor de Supabase.
-- ============================================================

-- 1. Recrear la tabla de contadores SIN columna de fecha
--    (un único contador por sucursal, persiste indefinidamente)
DROP TABLE IF EXISTS contador_tickets CASCADE;

CREATE TABLE contador_tickets (
  sucursal_id   uuid NOT NULL REFERENCES sucursales(id),
  ultimo_numero integer NOT NULL DEFAULT 0,
  PRIMARY KEY (sucursal_id)
);

-- Copiar permisos RLS
ALTER TABLE contador_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir select en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir select en contador_tickets"
ON contador_tickets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insert en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir insert en contador_tickets"
ON contador_tickets FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir update en contador_tickets"
ON contador_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 2. Actualizar la función del trigger:
--    - Ya no filtra por fecha
--    - Cicla 1-99: cuando llega a 99 vuelve a 1
CREATE OR REPLACE FUNCTION asignar_numero_ticket_diario()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_numero integer;
BEGIN
  INSERT INTO contador_tickets (sucursal_id, ultimo_numero)
  VALUES (NEW.sucursal_id, 1)
  ON CONFLICT (sucursal_id)
  DO UPDATE SET ultimo_numero =
    CASE
      WHEN contador_tickets.ultimo_numero >= 100 THEN 1
      ELSE contador_tickets.ultimo_numero + 1
    END
  RETURNING ultimo_numero INTO v_numero;

  NEW.numero_ticket := v_numero;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-crear el trigger (por si acaso)
DROP TRIGGER IF EXISTS trg_numero_ticket_diario ON ventas;
CREATE TRIGGER trg_numero_ticket_diario
BEFORE INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION asignar_numero_ticket_diario();
