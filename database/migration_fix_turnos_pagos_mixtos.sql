-- ============================================================
--  MIGRACIÓN: Corrección de Totales por Pagos Mixtos en Turnos
--  Pollos Q' Delicia — Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Actualizar el trigger para calcular correctamente los totales
-- dividiendo el `total` según `monto_pago_2` y `metodo_pago_2`.

CREATE OR REPLACE FUNCTION actualizar_totales_turno()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_monto1 NUMERIC(10, 2);
    v_monto2 NUMERIC(10, 2);
BEGIN
    v_monto2 := COALESCE(NEW.monto_pago_2, 0);
    v_monto1 := NEW.total - v_monto2;

    IF NEW.estado = 'completada' THEN
        UPDATE turnos SET
            total_efectivo      = total_efectivo 
                                  + CASE WHEN NEW.metodo_pago = 'efectivo' THEN v_monto1 ELSE 0 END
                                  + CASE WHEN NEW.metodo_pago_2 = 'efectivo' THEN v_monto2 ELSE 0 END,
            total_tarjeta       = total_tarjeta 
                                  + CASE WHEN NEW.metodo_pago = 'tarjeta' THEN v_monto1 ELSE 0 END
                                  + CASE WHEN NEW.metodo_pago_2 = 'tarjeta' THEN v_monto2 ELSE 0 END,
            total_qr            = total_qr 
                                  + CASE WHEN NEW.metodo_pago = 'qr' THEN v_monto1 ELSE 0 END
                                  + CASE WHEN NEW.metodo_pago_2 = 'qr' THEN v_monto2 ELSE 0 END,
            total_transferencia = total_transferencia 
                                  + CASE WHEN NEW.metodo_pago = 'transferencia' THEN v_monto1 ELSE 0 END
                                  + CASE WHEN NEW.metodo_pago_2 = 'transferencia' THEN v_monto2 ELSE 0 END,
            num_ventas          = num_ventas + 1
        WHERE id = NEW.turno_id;
    END IF;

    IF OLD IS NOT NULL AND OLD.estado = 'completada' AND NEW.estado = 'anulada' THEN
        v_monto2 := COALESCE(OLD.monto_pago_2, 0);
        v_monto1 := OLD.total - v_monto2;

        UPDATE turnos SET
            total_efectivo      = total_efectivo 
                                  - CASE WHEN OLD.metodo_pago = 'efectivo' THEN v_monto1 ELSE 0 END
                                  - CASE WHEN OLD.metodo_pago_2 = 'efectivo' THEN v_monto2 ELSE 0 END,
            total_tarjeta       = total_tarjeta 
                                  - CASE WHEN OLD.metodo_pago = 'tarjeta' THEN v_monto1 ELSE 0 END
                                  - CASE WHEN OLD.metodo_pago_2 = 'tarjeta' THEN v_monto2 ELSE 0 END,
            total_qr            = total_qr 
                                  - CASE WHEN OLD.metodo_pago = 'qr' THEN v_monto1 ELSE 0 END
                                  - CASE WHEN OLD.metodo_pago_2 = 'qr' THEN v_monto2 ELSE 0 END,
            total_transferencia = total_transferencia 
                                  - CASE WHEN OLD.metodo_pago = 'transferencia' THEN v_monto1 ELSE 0 END
                                  - CASE WHEN OLD.metodo_pago_2 = 'transferencia' THEN v_monto2 ELSE 0 END,
            num_ventas          = GREATEST(num_ventas - 1, 0)
        WHERE id = OLD.turno_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Recalcular los totales de todos los turnos existentes
-- para corregir aquellos afectados por el bug.

UPDATE turnos t
SET 
  total_efectivo = COALESCE(v.calc_efectivo, 0),
  total_tarjeta = COALESCE(v.calc_tarjeta, 0),
  total_qr = COALESCE(v.calc_qr, 0),
  total_transferencia = COALESCE(v.calc_transferencia, 0),
  num_ventas = COALESCE(v.calc_num, 0)
FROM (
  SELECT 
    t2.id as turno_id,
    COUNT(v2.id) as calc_num,
    SUM(
      CASE WHEN v2.metodo_pago = 'efectivo' THEN (v2.total - COALESCE(v2.monto_pago_2, 0)) ELSE 0 END +
      CASE WHEN v2.metodo_pago_2 = 'efectivo' THEN COALESCE(v2.monto_pago_2, 0) ELSE 0 END
    ) as calc_efectivo,
    SUM(
      CASE WHEN v2.metodo_pago = 'tarjeta' THEN (v2.total - COALESCE(v2.monto_pago_2, 0)) ELSE 0 END +
      CASE WHEN v2.metodo_pago_2 = 'tarjeta' THEN COALESCE(v2.monto_pago_2, 0) ELSE 0 END
    ) as calc_tarjeta,
    SUM(
      CASE WHEN v2.metodo_pago = 'qr' THEN (v2.total - COALESCE(v2.monto_pago_2, 0)) ELSE 0 END +
      CASE WHEN v2.metodo_pago_2 = 'qr' THEN COALESCE(v2.monto_pago_2, 0) ELSE 0 END
    ) as calc_qr,
    SUM(
      CASE WHEN v2.metodo_pago = 'transferencia' THEN (v2.total - COALESCE(v2.monto_pago_2, 0)) ELSE 0 END +
      CASE WHEN v2.metodo_pago_2 = 'transferencia' THEN COALESCE(v2.monto_pago_2, 0) ELSE 0 END
    ) as calc_transferencia
  FROM turnos t2
  LEFT JOIN ventas v2 ON v2.turno_id = t2.id AND v2.estado = 'completada'
  GROUP BY t2.id
) v
WHERE t.id = v.turno_id;
