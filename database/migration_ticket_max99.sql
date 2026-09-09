-- ============================================================
-- Migración: Limitar numeración de tickets a máximo 99.
-- Cuando el contador llega a 99, vuelve a 01 (ciclo 1-99).
-- Ejecuta esto en el SQL Editor de Supabase.
-- ============================================================

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
