-- Ejecutar una sola vez en el SQL Editor de Supabase.
-- El interés porcentual se calcula una sola vez sobre el monto prestado.
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registrado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('persona', 'empresa')),
  destinatario_nombre TEXT NOT NULL CHECK (length(trim(destinatario_nombre)) > 0),
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  tiene_interes BOOLEAN NOT NULL DEFAULT FALSE,
  interes_porcentaje NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (interes_porcentaje >= 0 AND interes_porcentaje <= 1000),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prestamos_interes_consistente CHECK (
    (tiene_interes AND interes_porcentaje > 0)
    OR (NOT tiene_interes AND interes_porcentaje = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON public.prestamos (fecha DESC, created_at DESC);
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prestamos_admin_select ON public.prestamos;
CREATE POLICY prestamos_admin_select ON public.prestamos
  FOR SELECT USING ((SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS prestamos_admin_insert ON public.prestamos;
CREATE POLICY prestamos_admin_insert ON public.prestamos
  FOR INSERT WITH CHECK (
    registrado_por = auth.uid()
    AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin'
  );
