-- =====================================================================================
-- EBA Cuac Cuac · Pruebas de las reglas de la v0.25 (se ejecuta después de 07; no deja cambios)
-- Envío a aprobación, devolución, aprobación solo por el coordinador, constancia y reprogramación con motivo.
-- =====================================================================================
SET search_path TO eba;
BEGIN;
DO $$
DECLARE ev int; insp int; coord int; adm int; fe int; err text;
BEGIN
  SELECT id, inspector_id, finca_especie_id INTO ev, insp, fe FROM evaluacion WHERE codigo = 'EVA-2026-00088';
  SELECT ur.usuario_id INTO coord FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE r.codigo = 'COORDINADOR' AND ur.fecha_fin IS NULL LIMIT 1;
  SELECT ur.usuario_id INTO adm   FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE r.codigo = 'ADMIN' AND ur.fecha_fin IS NULL LIMIT 1;

  -- 1. El inspector asignado la envía: queda pendiente de aprobación.
  INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id) VALUES (ev, 'ENVIADA', insp);
  ASSERT (SELECT estado FROM evaluacion WHERE id = ev) = 'PENDIENTE_APROBACION', 'el envío debe dejarla pendiente';

  -- 2. El administrador no aprueba.
  BEGIN
    INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id) VALUES (ev, 'APROBADA', adm);
    RAISE EXCEPTION 'el administrador no debería poder aprobar';
  EXCEPTION WHEN raise_exception THEN GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    ASSERT err LIKE 'Solo el coordinador%', 'mensaje inesperado: ' || err;
  END;

  -- 3. Devolver exige observación.
  BEGIN
    INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id, observacion) VALUES (ev, 'DEVUELTA', coord, '');
    RAISE EXCEPTION 'devolver sin observación debería fallar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id, observacion) VALUES (ev, 'DEVUELTA', coord, 'Falta la observación del galpón 2');
  ASSERT (SELECT estado FROM evaluacion WHERE id = ev) = 'DEVUELTA', 'debe quedar devuelta';

  -- 4. Reenvío y aprobación por el coordinador.
  INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id) VALUES (ev, 'REENVIADA', insp);
  INSERT INTO revision_evaluacion (evaluacion_id, accion, usuario_id) VALUES (ev, 'APROBADA', coord);
  ASSERT (SELECT estado = 'FINALIZADA' AND aprobada_por = coord FROM evaluacion WHERE id = ev), 'debe quedar aprobada por el coordinador';
  ASSERT (SELECT count(*) FROM transicion_estado WHERE evaluacion_id = ev) >= 4, 'cada paso deja transición';

  -- 5. Constancia: solo de visitas aprobadas; vence en 12 meses.
  INSERT INTO constancia_cumplimiento (codigo, verificacion, evaluacion_id, finca_especie_id, puntaje, emitida_por)
  VALUES (fn_codigo_constancia(), '7KQ2-M9XA', ev, fe, 95.0, coord);
  ASSERT (SELECT vence = (emitida_en + interval '12 months' - interval '1 day')::date FROM constancia_cumplimiento WHERE evaluacion_id = ev), 'vigencia de 1 año';
  BEGIN
    INSERT INTO constancia_cumplimiento (codigo, verificacion, evaluacion_id, finca_especie_id, puntaje, emitida_por)
    SELECT fn_codigo_constancia(), 'ABCD-EFGH', id, finca_especie_id, 95.0, coord FROM evaluacion WHERE codigo = 'EVA-2026-00091';
    RAISE EXCEPTION 'no debería emitir constancia de una visita sin aprobar';
  EXCEPTION WHEN raise_exception THEN GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    ASSERT err LIKE 'La constancia solo%', 'mensaje inesperado: ' || err;
  END;

  -- 6. Una sola visita abierta (incluye pendiente y devuelta) por finca y especie.
  ASSERT (SELECT indexdef LIKE '%PENDIENTE_APROBACION%DEVUELTA%' FROM pg_indexes WHERE indexname = 'ux_evaluacion_abierta'), 'índice de visita abierta';
  RAISE NOTICE 'Reglas v0.25: OK';
END $$;
ROLLBACK;
