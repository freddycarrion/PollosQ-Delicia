-- Repara el trigger de ventas si contador_tickets fue eliminado.
-- Ejecutar una vez en el SQL Editor del proyecto Supabase.

CREATE TABLE IF NOT EXISTS public.contador_tickets (
  sucursal_id uuid PRIMARY KEY REFERENCES public.sucursales(id) ON DELETE CASCADE,
  ultimo_numero integer NOT NULL DEFAULT 0
);

-- Si la tabla estaba ausente, continuar desde el ticket más reciente de cada
-- sucursal y mantener la numeración cíclica de 1 a 99.
INSERT INTO public.contador_tickets (sucursal_id, ultimo_numero)
SELECT DISTINCT ON (v.sucursal_id)
       v.sucursal_id,
       mod(v.numero_ticket, 99)::integer
FROM public.ventas AS v
WHERE v.sucursal_id IS NOT NULL
ORDER BY v.sucursal_id, v.created_at DESC, v.id DESC
ON CONFLICT (sucursal_id) DO NOTHING;

ALTER TABLE public.contador_tickets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.asignar_numero_ticket_diario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_numero integer;
BEGIN
  INSERT INTO public.contador_tickets AS actual (sucursal_id, ultimo_numero)
  VALUES (NEW.sucursal_id, 1)
  ON CONFLICT (sucursal_id)
  DO UPDATE SET ultimo_numero =
    CASE
      WHEN actual.ultimo_numero >= 99 THEN 1
      ELSE actual.ultimo_numero + 1
    END
  RETURNING ultimo_numero INTO v_numero;

  NEW.numero_ticket := v_numero;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_numero_ticket_diario ON public.ventas;
CREATE TRIGGER trg_numero_ticket_diario
BEFORE INSERT ON public.ventas
FOR EACH ROW
EXECUTE FUNCTION public.asignar_numero_ticket_diario();

ALTER TABLE public.ventas ALTER COLUMN numero_ticket DROP DEFAULT;
