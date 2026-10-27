-- Ejecutar una vez en SQL Editor de Supabase, antes de habilitar Snacks.
-- Stock persistente por sucursal; las ventas y sus detalles se guardan juntos.
BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_snacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id),
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  cantidad integer NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  version integer NOT NULL DEFAULT 0,
  UNIQUE (sucursal_id, producto_id)
);
ALTER TABLE public.stock_snacks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.stock_snacks TO authenticated;
CREATE POLICY snacks_ver ON public.stock_snacks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.activo
    AND (p.rol::text = 'admin' OR p.sucursal_id = stock_snacks.sucursal_id))
);
CREATE POLICY snacks_crear ON public.stock_snacks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.activo
    AND (p.rol::text = 'admin' OR (p.rol::text = 'supervisor' AND p.sucursal_id = stock_snacks.sucursal_id)))
);
CREATE POLICY snacks_editar ON public.stock_snacks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.activo
    AND (p.rol::text = 'admin' OR (p.rol::text = 'supervisor' AND p.sucursal_id = stock_snacks.sucursal_id)))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.perfiles p WHERE p.id = auth.uid() AND p.activo
    AND (p.rol::text = 'admin' OR (p.rol::text = 'supervisor' AND p.sucursal_id = stock_snacks.sucursal_id)))
);

CREATE OR REPLACE FUNCTION public.version_stock_snacks() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.version := OLD.version + 1; RETURN NEW; END;
$$;
CREATE TRIGGER version_stock_snacks BEFORE UPDATE ON public.stock_snacks
FOR EACH ROW EXECUTE FUNCTION public.version_stock_snacks();

-- Solo las unidades realmente descontadas pueden devolverse al editar/anular.
-- Los detalles históricos comienzan con cero y no crean stock al eliminarse.
ALTER TABLE public.detalle_ventas
  ADD COLUMN IF NOT EXISTS snack_stock_id uuid REFERENCES public.stock_snacks(id),
  ADD COLUMN IF NOT EXISTS snack_cantidad integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.aplicar_stock_snack() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  anterior_id uuid;
  anterior_cantidad integer := 0;
  nuevo_id uuid;
  nueva_cantidad integer := 0;
  sucursal uuid;
  estado text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    anterior_id := OLD.snack_stock_id;
    anterior_cantidad := OLD.snack_cantidad;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT v.sucursal_id, v.estado::text INTO sucursal, estado
      FROM public.ventas v WHERE v.id = NEW.venta_id FOR UPDATE;
    IF estado = 'completada' AND EXISTS (
      SELECT 1 FROM public.productos p JOIN public.categorias c ON c.id = p.categoria_id
      WHERE p.id = NEW.producto_id AND lower(trim(c.nombre)) IN ('snack', 'snacks')
    ) THEN
      SELECT s.id INTO nuevo_id FROM public.stock_snacks s
        WHERE s.sucursal_id = sucursal AND s.producto_id = NEW.producto_id;
      IF nuevo_id IS NULL THEN RAISE EXCEPTION 'Configura el stock de snacks antes de vender este producto'; END IF;
      nueva_cantidad := NEW.cantidad;
    END IF;
  END IF;

  -- Un UPDATE condicional toma el bloqueo de fila: nunca puede quedar negativo.
  IF anterior_id IS NOT DISTINCT FROM nuevo_id AND nuevo_id IS NOT NULL THEN
    UPDATE public.stock_snacks SET cantidad = cantidad + anterior_cantidad - nueva_cantidad
      WHERE id = nuevo_id AND cantidad + anterior_cantidad >= nueva_cantidad;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente para este snack. Actualiza las cantidades disponibles'; END IF;
  ELSE
    IF anterior_id IS NOT NULL AND anterior_cantidad > 0 THEN
      UPDATE public.stock_snacks SET cantidad = cantidad + anterior_cantidad WHERE id = anterior_id;
    END IF;
    IF nuevo_id IS NOT NULL THEN
      UPDATE public.stock_snacks SET cantidad = cantidad - nueva_cantidad
        WHERE id = nuevo_id AND cantidad >= nueva_cantidad;
      IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuficiente para este snack. Actualiza las cantidades disponibles'; END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.snack_stock_id := nuevo_id;
  NEW.snack_cantidad := nueva_cantidad;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.aplicar_stock_snack() FROM PUBLIC;
CREATE TRIGGER aplicar_stock_snack BEFORE INSERT OR UPDATE OR DELETE ON public.detalle_ventas
FOR EACH ROW EXECUTE FUNCTION public.aplicar_stock_snack();

CREATE OR REPLACE FUNCTION public.restaurar_snacks_venta() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.sucursal_id <> OLD.sucursal_id THEN RAISE EXCEPTION 'No se puede cambiar la sucursal de una venta'; END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    UPDATE public.detalle_ventas SET snack_cantidad = snack_cantidad WHERE venta_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.restaurar_snacks_venta() FROM PUBLIC;
CREATE TRIGGER restaurar_snacks_venta AFTER UPDATE OF estado, sucursal_id ON public.ventas
FOR EACH ROW EXECUTE FUNCTION public.restaurar_snacks_venta();

-- Invoker conserva las políticas de ventas y detalle_ventas del usuario.
CREATE OR REPLACE FUNCTION public.detalles_venta_snacks(venta uuid, detalles jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF jsonb_typeof(detalles) <> 'array' OR jsonb_array_length(detalles) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener productos';
  END IF;
  INSERT INTO public.detalle_ventas (venta_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal, notas_item)
    SELECT venta, d.producto_id, d.nombre_producto, d.precio_unitario, d.cantidad, d.subtotal, d.notas_item
    FROM jsonb_to_recordset(detalles) AS d(producto_id uuid, nombre_producto text,
      precio_unitario numeric, cantidad smallint, subtotal numeric, notas_item text)
    ORDER BY d.producto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_venta_snacks(datos jsonb, detalles jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v public.ventas; resultado public.ventas;
BEGIN
  v := jsonb_populate_record(NULL::public.ventas, datos);
  IF auth.uid() IS NULL OR v.cajero_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Sesión de cajero inválida'; END IF;
  PERFORM 1 FROM public.turnos t WHERE t.id = v.turno_id AND t.cajero_id = auth.uid()
    AND t.sucursal_id = v.sucursal_id AND t.estado::text = 'abierto' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El turno no está abierto o no corresponde a este cajero'; END IF;
  INSERT INTO public.ventas (turno_id, cajero_id, sucursal_id, subtotal, descuento, total,
    metodo_pago, monto_recibido, vuelto, tipo_pedido, nombre_cliente, carnet_cliente, estado, metodo_pago_2, monto_pago_2)
  VALUES (v.turno_id, auth.uid(), v.sucursal_id, v.subtotal, v.descuento, v.total,
    v.metodo_pago, v.monto_recibido, v.vuelto, v.tipo_pedido, v.nombre_cliente, v.carnet_cliente,
    'completada', v.metodo_pago_2, v.monto_pago_2) RETURNING * INTO resultado;
  PERFORM public.detalles_venta_snacks(resultado.id, detalles);
  RETURN jsonb_build_object('id', resultado.id, 'numero_ticket', resultado.numero_ticket);
END;
$$;

CREATE OR REPLACE FUNCTION public.editar_venta_snacks(venta uuid, detalles jsonb, total_nuevo numeric) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.ventas v WHERE v.id = venta AND v.cajero_id = auth.uid()
    AND v.estado::text = 'completada' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No puedes editar esta venta'; END IF;
  DELETE FROM public.detalle_ventas WHERE venta_id = venta;
  PERFORM public.detalles_venta_snacks(venta, detalles);
  UPDATE public.ventas SET total = total_nuevo, subtotal = total_nuevo WHERE id = venta;
END;
$$;
REVOKE ALL ON FUNCTION public.detalles_venta_snacks(uuid,jsonb),
  public.registrar_venta_snacks(jsonb,jsonb), public.editar_venta_snacks(uuid,jsonb,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detalles_venta_snacks(uuid,jsonb),
  public.registrar_venta_snacks(jsonb,jsonb), public.editar_venta_snacks(uuid,jsonb,numeric) TO authenticated;
COMMIT;
