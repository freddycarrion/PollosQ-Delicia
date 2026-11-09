-- Impide que cuentas de administrador o supervisor abran una caja.
-- Ejecutar en el SQL Editor de Supabase.
DROP POLICY IF EXISTS "turno_insertar" ON public.turnos;

CREATE POLICY "turno_insertar" ON public.turnos
  FOR INSERT
  WITH CHECK (
    cajero_id = auth.uid()
    AND get_my_rol() = 'cajero'
  );
