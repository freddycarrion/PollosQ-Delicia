-- ============================================================
-- Fix: Add Row-Level Security (RLS) policies to contador_tickets
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================

-- Habilitar RLS en la tabla
ALTER TABLE contador_tickets ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados leer los contadores
DROP POLICY IF EXISTS "Permitir select en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir select en contador_tickets" 
ON contador_tickets 
FOR SELECT 
TO authenticated 
USING (true);

-- Permitir a usuarios autenticados insertar nuevos contadores
DROP POLICY IF EXISTS "Permitir insert en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir insert en contador_tickets" 
ON contador_tickets 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir a usuarios autenticados actualizar los contadores
DROP POLICY IF EXISTS "Permitir update en contador_tickets" ON contador_tickets;
CREATE POLICY "Permitir update en contador_tickets" 
ON contador_tickets 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Alternativamente, también modificamos la función del trigger para que
-- se ejecute con los permisos del creador (SECURITY DEFINER) y evite 
-- problemas de RLS en caso de que el usuario no tenga permisos completos.
CREATE OR REPLACE FUNCTION asignar_numero_ticket_diario()
RETURNS TRIGGER 
SECURITY DEFINER
AS $$
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
