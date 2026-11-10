-- =============================================================================
-- EBA Patos y Gansos · ICA — Pruebas de las reglas de la base de datos
-- Ejecutar después de 04_datos_ejemplo.sql. Cada bloque falla con un mensaje si la regla no se cumple.
-- =============================================================================
SET search_path TO eba;
\set ON_ERROR_STOP on

DO $$
DECLARE n int;
BEGIN
  -- Metodología: 58 indicadores (33 de patos y 25 de gansos), pesos de la Tabla 1 suman 1 por tramo
  SELECT count(*) INTO n FROM indicador;                                   ASSERT n = 58, 'Deben existir 58 indicadores';
  SELECT count(*) INTO n FROM indicador i JOIN version_metodologia v ON v.id = i.version_id JOIN especie e ON e.id = v.especie_id
   WHERE e.nombre = 'pato';                                                ASSERT n = 33, 'Patos: 33 indicadores';
  SELECT count(*) INTO n FROM (SELECT d.version_id, pt.tramo, sum(pt.peso) s FROM ponderacion_tramo pt JOIN dimension d ON d.id = pt.dimension_id
   GROUP BY 1, 2 HAVING sum(pt.peso) <> 1) x;                              ASSERT n = 0, 'Los pesos de cada tramo deben sumar 100 %';
  SELECT count(*) INTO n FROM indicador i WHERE NOT EXISTS (SELECT 1 FROM regla_conversion r WHERE r.indicador_id = i.id)
                                           AND NOT EXISTS (SELECT 1 FROM regla_condicion r WHERE r.indicador_id = i.id);
  ASSERT n = 0, 'Todo indicador necesita una regla de cálculo (calificación automática)';

  -- Clasificación (Tabla 2) con 1 decimal
  ASSERT fn_clasificar(1::smallint, 89.94) = 'ALTO',      '89,9 es ALTO';
  ASSERT fn_clasificar(1::smallint, 89.95) = 'EXCELENTE', '89,95 se redondea a 90,0 → EXCELENTE';
  ASSERT fn_clasificar(1::smallint, 74.5)  = 'MEDIO',     '74,5 es MEDIO';
  ASSERT fn_clasificar(1::smallint, 49.9)  = 'BAJO',      '49,9 es BAJO';

  -- Resultado calculado en la base de datos para EVA-2026-00051
  SELECT count(*) INTO n FROM v_resultado_vigente WHERE evaluacion = 'EVA-2026-00051' AND puntaje_total = 83.4 AND nivel = 'ALTO';
  ASSERT n = 1, 'EVA-2026-00051 debe dar 83,4 (ALTO)';
  SELECT count(*) INTO n FROM v_hallazgos WHERE evaluacion = 'EVA-2026-00051' AND indicador = 'Jadeo' AND observacion IS NOT NULL;
  ASSERT n = 1, 'El hallazgo MBA en 0 (jadeo) queda con su observación';

  -- Pendientes (notificaciones): visita programada, evaluación en proceso, documento pendiente
  SELECT count(DISTINCT tipo) INTO n FROM v_pendientes;                  ASSERT n >= 3, 'v_pendientes debe mostrar al menos 3 tipos';

  -- Población y tramo
  SELECT count(*) INTO n FROM v_poblacion_finca WHERE codigo = 'FIN-2025-00198' AND poblacion_total = 27 AND tramo = 'TRASPATIO';
  ASSERT n = 1, 'San Isidro: 27 aves → traspatio';
  RAISE NOTICE 'Reglas de datos: OK';
END $$;

-- Reglas que deben rechazar operaciones indebidas
DO $$
BEGIN
  BEGIN
    UPDATE evaluacion SET estado = 'EN_PROCESO' WHERE codigo = 'EVA-2026-00051';
    RAISE EXCEPTION 'FALLA: una evaluación FINALIZADA volvió a EN_PROCESO';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALLA%' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM evaluacion WHERE codigo = 'EVA-2026-00088';
    RAISE EXCEPTION 'FALLA: se eliminó una evaluación EN_PROCESO';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FALLA%' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM registro_auditoria;
    RAISE EXCEPTION 'FALLA: se borró la bitácora';
  EXCEPTION WHEN restrict_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO evaluacion (codigo, finca_especie_id, version_id, inspector_id, fecha_visita)
    SELECT 'EVA-2026-00999', finca_especie_id, version_id, inspector_id, now() FROM evaluacion WHERE codigo = 'EVA-2026-00088';
    RAISE EXCEPTION 'FALLA: dos evaluaciones abiertas para la misma finca y especie';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO item_diagnostico (diagnostico_id, tipo, indicador_evaluado_id, texto, puntaje)
    SELECT diagnostico_id, 'FORTALEZA', indicador_evaluado_id, 'x', 55 FROM item_diagnostico LIMIT 1;
    RAISE EXCEPTION 'FALLA: una fortaleza con 55 puntos';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'Restricciones: OK';
END $$;
