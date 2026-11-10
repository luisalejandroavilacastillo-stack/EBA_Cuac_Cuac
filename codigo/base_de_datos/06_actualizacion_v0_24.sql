-- =====================================================================================
-- EBA Cuac Cuac · Actualización del modelo a la versión 0.24 del prototipo
-- PostgreSQL 14 o superior · esquema eba · se ejecuta después de 01 a 05
--
-- Cambios que recoge:
--   1. Número de aves por especie al registrar la finca (CU-04) y tramo por especie (opción B).
--   2. Proceso de seguimiento (PRC) con 3 seguimientos ampliables a 5 y el estado
--      «Seguimiento programado» con fecha acordada y reprogramable (CU-17 a CU-19).
--   3. Plan de muestreo con 5 aves por punto: 2 × 5 × 5 = 50 · 1 × 3 × 5 = 15 · sin corral 1 a 3 puntos.
--   4. Recorrido por puntos de gansos: novedad y tratamiento por ganso; recursos por punto (CU-11).
--   5. Asistente de la norma: configuración y registro de consultas SIN el texto de la pregunta (CU-22).
-- =====================================================================================
SET search_path TO eba;

-- 1. Aves por especie ------------------------------------------------------------------
ALTER TABLE finca_especie
  ADD COLUMN numero_aves int NOT NULL DEFAULT 0 CHECK (numero_aves >= 0);       -- dato del registro de la finca
COMMENT ON COLUMN finca_especie.numero_aves IS 'Número de aves declarado al registrar la finca; define el tramo de la especie (< 200 traspatio, ≥ 200 comercial).';

ALTER TABLE evaluacion
  ADD COLUMN poblacion_especie int CHECK (poblacion_especie >= 0);              -- aves de la especie confirmadas en la apertura
COMMENT ON COLUMN evaluacion.poblacion_especie IS 'Aves de la especie evaluada confirmadas en la apertura (ev.pobEsp). El tramo y la muestra se calculan con este dato.';
COMMENT ON COLUMN evaluacion.poblacion_total   IS 'Total de aves de la finca (suma de especies); se conserva por compatibilidad.';

-- 2. Proceso de seguimiento ------------------------------------------------------------
CREATE TYPE estado_proceso AS ENUM ('EN_CURSO', 'SEGUIMIENTO_PROGRAMADO', 'EN_SEGUIMIENTO',
                                    'REQUIERE_AMPLIACION', 'CUMPLIDO', 'CERRADO_SIN_CUMPLIR');

CREATE TABLE proceso_seguimiento (               -- PRC: una finca y especie, visita inicial + seguimientos
  id                 serial         PRIMARY KEY,
  codigo             char(13)       NOT NULL UNIQUE CHECK (codigo ~ '^PRC-\d{4}-\d{4}$'),
  finca_especie_id   int            NOT NULL REFERENCES finca_especie,
  max_seguimientos   smallint       NOT NULL DEFAULT 3 CHECK (max_seguimientos BETWEEN 3 AND 5),
  estado             estado_proceso NOT NULL DEFAULT 'EN_CURSO',
  motivo_ampliacion  varchar(500),
  ampliado_por       int            REFERENCES usuario,
  ampliado_en        timestamptz,
  creado_en          timestamptz    NOT NULL DEFAULT now(),
  cerrado_en         timestamptz,
  CHECK (max_seguimientos = 3 OR (motivo_ampliacion IS NOT NULL AND ampliado_por IS NOT NULL AND ampliado_en IS NOT NULL)),
  CHECK (estado NOT IN ('CUMPLIDO', 'CERRADO_SIN_CUMPLIR') OR cerrado_en IS NOT NULL)
);
CREATE INDEX ix_proceso_finca_especie ON proceso_seguimiento (finca_especie_id, estado);

ALTER TABLE evaluacion
  ADD COLUMN proceso_id         int      REFERENCES proceso_seguimiento,
  ADD COLUMN numero_visita      smallint NOT NULL DEFAULT 0 CHECK (numero_visita BETWEEN 0 AND 5),  -- 0 = visita inicial
  ADD COLUMN evaluacion_base_id int      REFERENCES evaluacion,                                       -- visita que se retoma
  ADD COLUMN fecha_programada   date;                                                                -- fecha acordada con el productor
CREATE UNIQUE INDEX ux_evaluacion_proceso_visita ON evaluacion (proceso_id, numero_visita) WHERE estado <> 'ANULADA';
COMMENT ON COLUMN evaluacion.fecha_programada IS 'Fecha del seguimiento acordada al cierre de la visita anterior; se puede reprogramar mientras la visita esté PROGRAMADA.';

CREATE TABLE reprogramacion (                    -- «historial» (CU-18)
  id             serial      PRIMARY KEY,
  evaluacion_id  int         NOT NULL REFERENCES evaluacion,
  fecha_anterior date        NOT NULL,
  fecha_nueva    date        NOT NULL,
  usuario_id     int         NOT NULL REFERENCES usuario,
  registrada_en  timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_nueva <> fecha_anterior)
);

-- Solo se reprograma una visita PROGRAMADA y nunca a una fecha pasada.
CREATE FUNCTION fn_validar_reprogramacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT estado FROM evaluacion WHERE id = NEW.evaluacion_id) <> 'PROGRAMADA' THEN
    RAISE EXCEPTION 'Solo se puede reprogramar una visita que aún no se ha iniciado';
  END IF;
  IF NEW.fecha_nueva < current_date THEN
    RAISE EXCEPTION 'La fecha no puede ser anterior a hoy';
  END IF;
  UPDATE evaluacion SET fecha_programada = NEW.fecha_nueva WHERE id = NEW.evaluacion_id;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_reprogramacion BEFORE INSERT ON reprogramacion FOR EACH ROW EXECUTE FUNCTION fn_validar_reprogramacion();

-- 3. Plan de muestreo con 5 aves por punto ---------------------------------------------
ALTER TABLE plan_muestreo DROP CONSTRAINT IF EXISTS plan_muestreo_check;
ALTER TABLE plan_muestreo
  ADD COLUMN aves_por_punto smallint CHECK (aves_por_punto BETWEEN 2 AND 5),
  ADD COLUMN total_aves     smallint CHECK (total_aves BETWEEN 1 AND 50),
  ADD CONSTRAINT ck_plan_tabla3 CHECK (
        NOT con_corral
     OR aves_por_punto IS NULL
     OR (corrales, puntos_por_corral, aves_por_punto) IN ((1, 3, 5), (2, 5, 5)));
COMMENT ON COLUMN plan_muestreo.tamano_muestra IS 'Mínimo de la Tabla 3 (5 en traspatio, 10 en comercial).';
COMMENT ON COLUMN plan_muestreo.total_aves     IS 'Aves a evaluar: 50 (comercial), 15 (traspatio) o todas si la especie tiene menos.';

-- 4. Recorrido por puntos de gansos ----------------------------------------------------
CREATE TABLE recurso_punto (                     -- agua, comida y bebedero observados en el punto
  punto_id  int     PRIMARY KEY REFERENCES punto_muestreo ON DELETE CASCADE,
  agua      boolean,
  comida    boolean,
  bebedero  boolean
);

CREATE TABLE novedad_ave (                       -- ganso por ganso: GA01 a GA07 con o sin tratamiento
  id            bigserial PRIMARY KEY,
  unidad_id     int       NOT NULL REFERENCES unidad_muestreo ON DELETE CASCADE,  -- tipo AVE
  indicador_id  int       NOT NULL REFERENCES indicador,
  en_tratamiento boolean  NOT NULL DEFAULT false,                                -- GA01, GA03, GA04, GA07
  UNIQUE (unidad_id, indicador_id)
);
COMMENT ON TABLE novedad_ave IS 'Un ave sin filas en esta tabla no tiene novedad. El cálculo deriva total, parte y extra por indicador y por galpón.';

-- 5. Asistente de la norma -------------------------------------------------------------
CREATE TABLE configuracion_asistente (           -- «configuración», una sola fila
  id              smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  modo            varchar(5)  NOT NULL DEFAULT 'LOCAL' CHECK (modo IN ('LOCAL', 'IA')),
  modelo          varchar(60),
  referencia_clave varchar(120),                  -- nombre del secreto en el servidor; la clave NUNCA se guarda aquí
  actualizado_por int         REFERENCES usuario,
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  CHECK (modo = 'LOCAL' OR (modelo IS NOT NULL AND referencia_clave IS NOT NULL))
);
INSERT INTO configuracion_asistente (id) VALUES (1);

CREATE TABLE consulta_asistente (                -- «historial» sin el texto de la pregunta (Ley 1581)
  id          bigserial   PRIMARY KEY,
  usuario_id  int         NOT NULL REFERENCES usuario,
  rol         varchar(20) NOT NULL,
  pantalla    varchar(60),                        -- ruta donde se abrió el panel
  tema        varchar(30),                        -- muestreo, pesos, niveles, fases, documentos, traspatio, seguimiento, indicador
  modo        varchar(5)  NOT NULL CHECK (modo IN ('LOCAL', 'IA')),
  dentro_tema boolean     NOT NULL,
  realizada_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_consulta_asistente_fecha ON consulta_asistente (realizada_en);

-- Vista: estado de cada proceso con sus visitas -----------------------------------------
CREATE VIEW v_estado_proceso AS
SELECT p.codigo AS proceso, f.codigo AS finca, e.nombre AS especie, p.estado, p.max_seguimientos,
       COALESCE(max(ev.numero_visita), 0)                               AS seguimientos_usados,
       p.max_seguimientos - COALESCE(max(ev.numero_visita), 0)          AS seguimientos_restantes,
       min(ev.fecha_programada) FILTER (WHERE ev.estado = 'PROGRAMADA') AS proxima_visita
FROM proceso_seguimiento p
JOIN finca_especie fe ON fe.id = p.finca_especie_id
JOIN finca f          ON f.id = fe.finca_id
JOIN especie e        ON e.id = fe.especie_id
LEFT JOIN evaluacion ev ON ev.proceso_id = p.id AND ev.estado <> 'ANULADA'
GROUP BY p.id, f.codigo, e.nombre;

-- Datos de ejemplo: un proceso por cada evaluación existente (visita inicial) -----------
UPDATE finca_especie fe SET numero_aves = COALESCE((
  SELECT sum(d.cantidad) FROM inventario_corte c JOIN detalle_inventario d ON d.corte_id = c.id
  WHERE c.finca_especie_id = fe.id AND c.id = (SELECT max(id) FROM inventario_corte WHERE finca_especie_id = fe.id)), 0);

INSERT INTO proceso_seguimiento (codigo, finca_especie_id, estado, creado_en)
SELECT 'PRC-' || substr(ev.codigo, 5, 4) || '-' || lpad((row_number() OVER (ORDER BY ev.id))::text, 4, '0'),
       ev.finca_especie_id, CASE WHEN ev.estado = 'FINALIZADA' THEN 'EN_SEGUIMIENTO'::estado_proceso ELSE 'EN_CURSO' END, ev.creado_en
FROM evaluacion ev ORDER BY ev.id;

UPDATE evaluacion ev SET proceso_id = p.id, numero_visita = 0,
       poblacion_especie = (SELECT numero_aves FROM finca_especie WHERE id = ev.finca_especie_id)
FROM (SELECT id, row_number() OVER (ORDER BY id) AS n FROM proceso_seguimiento) p
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS n FROM evaluacion) e2 ON e2.n = p.n
WHERE ev.id = e2.id;
