-- =====================================================================================
-- EBA Cuac Cuac · Actualización del modelo a la versión 0.25 del prototipo
-- PostgreSQL 14 o superior · esquema eba · se ejecuta después de 01 a 06 (sin transacción
-- explícita: los valores nuevos de los ENUM deben quedar confirmados antes de usarlos)
--
-- Cambios que recoge:
--   1. Perfiles: administrador, coordinador, inspector y productor. Solo el administrador crea cuentas;
--      el inspector ya no necesita matrícula profesional en la plataforma.
--   2. Asignación de cada inspección (inspector y fecha) con historial de reasignaciones (CU-08, CU-27).
--   3. Estados nuevos de la visita: PENDIENTE_APROBACION y DEVUELTA; revisión del coordinador
--      (enviada, reenviada, devuelta, aprobada) y solo el coordinador aprueba (CU-15, CU-28, CU-29).
--   4. Seguimiento: fecha propuesta por el inspector; reprogramación con motivo (CU-17, CU-18).
--   5. Constancia de cumplimiento de bienestar animal: CER-AAAA-NNNNN, verificación, vigencia 1 año (CU-30).
--   6. Avisos dentro de la aplicación para los eventos del flujo (CU-31).
-- =====================================================================================
SET search_path TO eba;

-- 1. Perfiles ---------------------------------------------------------------------------
UPDATE rol SET descripcion = 'Gestiona usuarios y perfiles, parametrización y bitácora; registra fincas, asigna y gestiona seguimientos. No aprueba inspecciones.' WHERE codigo = 'ADMIN';
UPDATE rol SET nombre = 'Coordinador ICA', descripcion = 'Registra fincas, asigna cada inspección a un inspector, aprueba o devuelve y gestiona los seguimientos. Único que aprueba.' WHERE codigo = 'COORDINADOR';
UPDATE rol SET nombre = 'Inspector ICA', requiere_matricula = false,
               descripcion = 'Ve las fincas que le asignan; diligencia la visita, propone la fecha del seguimiento y la envía a aprobación.' WHERE codigo = 'INSPECTOR';
COMMENT ON TABLE rol IS 'Perfiles. El nombre visible es el mismo para hombres y mujeres (RN-191). Las cuentas las crea solo el administrador (RN-192).';

-- 2 y 3. Estados nuevos de la evaluación ---------------------------------------------------
ALTER TYPE estado_evaluacion ADD VALUE IF NOT EXISTS 'PENDIENTE_APROBACION' AFTER 'EN_PROCESO';
ALTER TYPE estado_evaluacion ADD VALUE IF NOT EXISTS 'DEVUELTA' AFTER 'PENDIENTE_APROBACION';

DROP INDEX IF EXISTS ux_evaluacion_abierta;
CREATE UNIQUE INDEX ux_evaluacion_abierta ON evaluacion (finca_especie_id)
  WHERE estado IN ('PROGRAMADA', 'EN_PROCESO', 'PENDIENTE_APROBACION', 'DEVUELTA');      -- RN-196

ALTER TABLE evaluacion
  ADD COLUMN fecha_seguimiento_propuesta date,                       -- la propone el inspector al finalizar
  ADD COLUMN aprobada_por int REFERENCES usuario,
  ADD COLUMN aprobada_en  timestamptz,
  ADD CONSTRAINT ck_evaluacion_aprobada CHECK ((aprobada_por IS NULL) = (aprobada_en IS NULL));
COMMENT ON COLUMN evaluacion.inspector_id IS 'Inspector asignado vigente (el historial está en asignacion_evaluacion).';
COMMENT ON COLUMN evaluacion.fecha_finalizacion IS 'Fecha en que el inspector la finalizó y la envió a aprobación.';

-- Transiciones permitidas v0.25 (reemplaza RN-149): el inspector finaliza → pendiente; el coordinador aprueba o devuelve.
CREATE OR REPLACE FUNCTION fn_estado_evaluacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'PROGRAMADA' THEN
      RAISE EXCEPTION 'Una evaluación se crea en estado PROGRAMADA';
    END IF;
    INSERT INTO transicion_estado (evaluacion_id, estado_de, estado_a, usuario_id)
    VALUES (NEW.id, NULL, NEW.estado, NEW.inspector_id);
    RETURN NEW;
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT ((OLD.estado = 'PROGRAMADA'           AND NEW.estado IN ('EN_PROCESO', 'ANULADA'))
         OR (OLD.estado = 'EN_PROCESO'           AND NEW.estado IN ('PENDIENTE_APROBACION', 'ANULADA'))
         OR (OLD.estado = 'PENDIENTE_APROBACION' AND NEW.estado IN ('DEVUELTA', 'FINALIZADA'))
         OR (OLD.estado = 'DEVUELTA'             AND NEW.estado IN ('PENDIENTE_APROBACION', 'ANULADA'))) THEN
      RAISE EXCEPTION 'Transición no permitida: % → %', OLD.estado, NEW.estado;
    END IF;
    INSERT INTO transicion_estado (evaluacion_id, estado_de, estado_a, usuario_id, motivo)
    VALUES (NEW.id, OLD.estado, NEW.estado, COALESCE(NEW.aprobada_por, NEW.inspector_id), NEW.motivo_anulacion);
  ELSIF OLD.estado IN ('FINALIZADA', 'ANULADA')
        AND (NEW.finca_especie_id, NEW.version_id, NEW.fecha_visita, NEW.tramo, NEW.pesos)
            IS DISTINCT FROM (OLD.finca_especie_id, OLD.version_id, OLD.fecha_visita, OLD.tramo, OLD.pesos) THEN
    RAISE EXCEPTION 'La evaluación % está % y no se modifica', OLD.codigo, OLD.estado;
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE asignacion_evaluacion (            -- «historial» de asignaciones y reasignaciones (RN-196, RN-197)
  id             serial      PRIMARY KEY,
  evaluacion_id  int         NOT NULL REFERENCES evaluacion,
  inspector_id   int         NOT NULL REFERENCES usuario,
  fecha_visita   date        NOT NULL,
  asignado_por   int         NOT NULL REFERENCES usuario,
  asignado_en    timestamptz NOT NULL DEFAULT now(),
  retirado_en    timestamptz,
  CHECK (retirado_en IS NULL OR retirado_en >= asignado_en)
);
CREATE UNIQUE INDEX ux_asignacion_vigente ON asignacion_evaluacion (evaluacion_id) WHERE retirado_en IS NULL;
CREATE INDEX ix_asignacion_inspector ON asignacion_evaluacion (inspector_id) WHERE retirado_en IS NULL;

CREATE TYPE accion_revision AS ENUM ('ENVIADA', 'REENVIADA', 'DEVUELTA', 'APROBADA');
CREATE TABLE revision_evaluacion (              -- «historial» de la revisión del coordinador (RN-200, RN-201)
  id             serial          PRIMARY KEY,
  evaluacion_id  int             NOT NULL REFERENCES evaluacion,
  accion         accion_revision NOT NULL,
  usuario_id     int             NOT NULL REFERENCES usuario,
  observacion    varchar(1000),
  registrada_en  timestamptz     NOT NULL DEFAULT now(),
  CHECK (accion <> 'DEVUELTA' OR length(trim(observacion)) >= 5)
);
CREATE INDEX ix_revision_evaluacion ON revision_evaluacion (evaluacion_id, registrada_en);
CREATE TRIGGER tg_revision_inmutable BEFORE UPDATE OR DELETE ON revision_evaluacion
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

/** ¿El usuario tiene vigente el perfil indicado? */
CREATE FUNCTION fn_tiene_perfil(p_usuario int, p_codigo varchar) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id
                 WHERE ur.usuario_id = p_usuario AND r.codigo = p_codigo AND ur.fecha_fin IS NULL);
$$;

-- Solo el coordinador aprueba o devuelve, y solo lo que está pendiente; el envío lo hace el inspector asignado.
CREATE FUNCTION fn_validar_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ev evaluacion%ROWTYPE;
BEGIN
  SELECT * INTO ev FROM evaluacion WHERE id = NEW.evaluacion_id FOR UPDATE;
  IF NEW.accion IN ('APROBADA', 'DEVUELTA') THEN
    IF NOT fn_tiene_perfil(NEW.usuario_id, 'COORDINADOR') THEN
      RAISE EXCEPTION 'Solo el coordinador aprueba o devuelve inspecciones';
    END IF;
    IF ev.estado <> 'PENDIENTE_APROBACION' THEN
      RAISE EXCEPTION 'Solo se aprueba o devuelve una visita pendiente de aprobación';
    END IF;
    IF NEW.accion = 'APROBADA' THEN
      UPDATE evaluacion SET estado = 'FINALIZADA', aprobada_por = NEW.usuario_id, aprobada_en = NEW.registrada_en WHERE id = ev.id;
    ELSE
      UPDATE evaluacion SET estado = 'DEVUELTA' WHERE id = ev.id;
    END IF;
  ELSE   -- ENVIADA o REENVIADA
    IF NEW.usuario_id <> ev.inspector_id THEN
      RAISE EXCEPTION 'Solo el inspector asignado envía la visita a aprobación';
    END IF;
    IF ev.estado NOT IN ('EN_PROCESO', 'DEVUELTA') THEN
      RAISE EXCEPTION 'La visita no está en proceso ni devuelta';
    END IF;
    UPDATE evaluacion SET estado = 'PENDIENTE_APROBACION', fecha_finalizacion = NEW.registrada_en WHERE id = ev.id;
  END IF;
  RETURN NEW;   -- la transición la registra fn_estado_evaluacion
END $$;
CREATE TRIGGER tg_revision_validar BEFORE INSERT ON revision_evaluacion FOR EACH ROW EXECUTE FUNCTION fn_validar_revision();

-- 4. Reprogramación con motivo ------------------------------------------------------------
ALTER TABLE reprogramacion ADD COLUMN motivo varchar(300);
UPDATE reprogramacion SET motivo = 'Registrada antes de la v0.25' WHERE motivo IS NULL;
ALTER TABLE reprogramacion ALTER COLUMN motivo SET NOT NULL,
  ADD CONSTRAINT ck_reprogramacion_motivo CHECK (length(trim(motivo)) >= 5);
COMMENT ON TABLE reprogramacion IS 'Reprograman el coordinador, el administrador o el inspector asignado, antes de iniciar la visita y con motivo (RN-203).';

-- 5. Constancia de cumplimiento ------------------------------------------------------------
CREATE TABLE constancia_cumplimiento (          -- RN-205, RN-206
  id                serial      PRIMARY KEY,
  codigo            char(14)    NOT NULL UNIQUE CHECK (codigo ~ '^CER-\d{4}-\d{5}$'),
  verificacion      char(9)     NOT NULL UNIQUE CHECK (verificacion ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  evaluacion_id     int         NOT NULL UNIQUE REFERENCES evaluacion,
  finca_especie_id  int         NOT NULL REFERENCES finca_especie,
  puntaje           numeric(5,1) NOT NULL CHECK (puntaje BETWEEN 90 AND 100),
  emitida_por       int         NOT NULL REFERENCES usuario,          -- coordinador que aprobó
  emitida_en        timestamptz NOT NULL DEFAULT now(),
  vence             date        NOT NULL,
  CHECK (vence > emitida_en::date)
);
CREATE INDEX ix_constancia_finca ON constancia_cumplimiento (finca_especie_id, vence);
COMMENT ON TABLE constancia_cumplimiento IS 'Se emite al aprobar una visita que cumple (≥ 90, sin ceros, sin pendientes); vigencia 12 meses. No hay verificación pública por código.';

/** Siguiente código de constancia del año (CER-AAAA-NNNNN). */
CREATE FUNCTION fn_codigo_constancia() RETURNS char(14) LANGUAGE sql AS $$
  SELECT 'CER-' || to_char(now(), 'YYYY') || '-' || lpad((
    SELECT count(*) + 1 FROM constancia_cumplimiento WHERE codigo LIKE 'CER-' || to_char(now(), 'YYYY') || '-%')::text, 5, '0');
$$;

-- La constancia solo existe para una visita aprobada.
CREATE FUNCTION fn_validar_constancia() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT estado FROM evaluacion WHERE id = NEW.evaluacion_id) <> 'FINALIZADA'
     OR (SELECT aprobada_por FROM evaluacion WHERE id = NEW.evaluacion_id) IS NULL THEN
    RAISE EXCEPTION 'La constancia solo se emite para una visita aprobada';
  END IF;
  NEW.vence := COALESCE(NEW.vence, (NEW.emitida_en + interval '12 months' - interval '1 day')::date);
  RETURN NEW;
END $$;
CREATE TRIGGER tg_constancia_validar BEFORE INSERT ON constancia_cumplimiento FOR EACH ROW EXECUTE FUNCTION fn_validar_constancia();
CREATE TRIGGER tg_constancia_inmutable BEFORE UPDATE OR DELETE ON constancia_cumplimiento
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

-- 6. Avisos ---------------------------------------------------------------------------------
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'ASIGNACION';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'REASIGNACION';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'POR_APROBAR';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'DEVOLUCION';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'APROBACION';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'CERTIFICACION';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'REPROGRAMACION';
COMMENT ON TABLE notificacion IS 'Avisos por usuario. POR_APROBAR se envía solo a coordinadores (el administrador no aprueba, RN-200).';

-- Vistas ------------------------------------------------------------------------------------
CREATE VIEW v_bandeja_coordinador AS            -- lo que espera al coordinador (CU-20)
SELECT ev.codigo AS evaluacion, f.codigo AS finca, e.nombre AS especie, ev.estado, ev.fecha_visita,
       u.nombres || ' ' || u.apellidos AS inspector, ev.fecha_finalizacion AS enviada_en
FROM evaluacion ev
JOIN finca_especie fe ON fe.id = ev.finca_especie_id
JOIN finca f          ON f.id = fe.finca_id
JOIN especie e        ON e.id = fe.especie_id
JOIN usuario u        ON u.id = ev.inspector_id
WHERE ev.estado IN ('PENDIENTE_APROBACION', 'DEVUELTA');

CREATE VIEW v_constancia_vigente AS             -- constancias por finca y especie (CU-30)
SELECT c.codigo, c.verificacion, f.codigo AS finca, e.nombre AS especie, c.puntaje, c.emitida_en::date AS emitida, c.vence,
       c.vence >= current_date AS vigente
FROM constancia_cumplimiento c
JOIN finca_especie fe ON fe.id = c.finca_especie_id
JOIN finca f          ON f.id = fe.finca_id
JOIN especie e        ON e.id = fe.especie_id;
