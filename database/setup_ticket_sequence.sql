-- ============================================================
-- Configuración: Numeración de tickets secuencial por sucursal
-- reinicia cada día y se limita a un máximo de 99.
-- Cuando el contador llega a 99, vuelve a 1 (ciclo 1-99).
-- Ejecuta esto en el SQL Editor de Supabase.
-- ============================================================

-- 1. Tabla de contadores: un contador por (sucursal, día)
CREATE TABLE IF NOT EXISTS contador_tickets (
  sucursal_id   uuid NOT NULL REFERENCES sucursales(id),
  fecha         date NOT NULL DEFAULT CURRENT_DATE,
  ultimo_numero integer NOT NULL DEFAULT 0,
  PRIMARY KEY (sucursal_id, fecha)
);

-- 2. Función que asigna el siguiente número del día para la sucursal
--    limitando a 99 y reiniciando a 1.
CREATE OR REPLACE FUNCTION asignar_numero_ticket_diario()
RETURNS TRIGGER AS $$
DECLARE
  v_numero integer;
BEGIN
  INSERT INTO contador_tickets (sucursal_id, fecha, ultimo_numero)
  VALUES (NEW.sucursal_id, CURRENT_DATE, 1)
  ON CONFLICT (sucursal_id, fecha)
  DO UPDATE SET ultimo_numero =
    CASE
      WHEN contador_tickets.ultimo_numero >= 99 THEN 1
      ELSE contador_tickets.ultimo_numero + 1
    END
  RETURNING ultimo_numero INTO v_numero;

  NEW.numero_ticket := v_numero;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger: corre antes de insertar cada venta
DROP TRIGGER IF EXISTS trg_numero_ticket_diario ON ventas;
CREATE TRIGGER trg_numero_ticket_diario
BEFORE INSERT ON ventas
FOR EACH ROW
EXECUTE FUNCTION asignar_numero_ticket_diario();

-- 4. Asegurarse que la columna use el trigger y no la secuencia por defecto
ALTER TABLE ventas ALTER COLUMN numero_ticket DROP DEFAULT;
