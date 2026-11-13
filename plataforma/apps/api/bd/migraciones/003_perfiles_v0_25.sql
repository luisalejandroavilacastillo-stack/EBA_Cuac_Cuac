-- =====================================================================================
-- EBA Cuac Cuac · MariaDB · Migración 003: perfiles reorganizados del prototipo v0.25
--   · usuario: cuentas con perfil (administrador, coordinador, inspector, productor); las crea el administrador.
--   · evaluacion: asignación (quién asignó), envío a aprobación y aprobación (solo el coordinador).
--   · revision_evaluacion: enviada, reenviada, devuelta (con observación) y aprobada.
--   · reprogramacion: cambios de fecha de los seguimientos con su motivo.
--   · constancia: constancia de cumplimiento de bienestar animal (CER-AAAA-NNNNN, vigencia 1 año).
--   · aviso: avisos dentro de la aplicación.
-- La tabla «usuario» de la v0.24 era una lista de ejemplo con otro formato: se reemplaza.
-- La aplicación vuelve a subir los usuarios de ejemplo la primera vez que se abre.
-- =====================================================================================

DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  clave           VARCHAR(40)   NOT NULL PRIMARY KEY,          -- identificador interno (inspector, u_mf3k2…)
  nombre          VARCHAR(120)  NOT NULL,
  perfil          VARCHAR(20)   NOT NULL,
  tipo_documento  VARCHAR(5)    NULL,
  documento       VARCHAR(20)   NOT NULL,
  correo          VARCHAR(120)  NOT NULL,
  telefono        VARCHAR(15)   NULL,
  estado          VARCHAR(10)   NOT NULL DEFAULT 'Activo',
  datos           LONGTEXT      NOT NULL CHECK (JSON_VALID(datos)),
  version         INT UNSIGNED  NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('admin', 'coordinador', 'inspector', 'productor')),
  CONSTRAINT ck_usuario_estado CHECK (estado IN ('Activo', 'Inactivo')),
  UNIQUE KEY ux_usuario_correo (correo),
  UNIQUE KEY ux_usuario_documento (tipo_documento, documento)
) ENGINE=InnoDB;

ALTER TABLE evaluacion
  ADD COLUMN asignado_por    VARCHAR(40) NULL AFTER inspector,
  ADD COLUMN asignado_en     DATETIME    NULL AFTER asignado_por,
  ADD COLUMN enviada_en      DATETIME    NULL AFTER asignado_en,
  ADD COLUMN aprobada_por    VARCHAR(40) NULL AFTER enviada_en,
  ADD COLUMN aprobada_en     DATETIME    NULL AFTER aprobada_por,
  ADD KEY ix_eval_inspector (inspector, estado);

CREATE TABLE revision_evaluacion (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evaluacion      CHAR(14)      NOT NULL,
  accion          VARCHAR(12)   NOT NULL,
  usuario         VARCHAR(40)   NOT NULL,
  fecha           DATETIME      NOT NULL,
  observacion     VARCHAR(1000) NULL,
  CONSTRAINT fk_rev_eval FOREIGN KEY (evaluacion) REFERENCES evaluacion (codigo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_rev_accion CHECK (accion IN ('Enviada', 'Reenviada', 'Devuelta', 'Aprobada')),
  CONSTRAINT ck_rev_obs CHECK (accion <> 'Devuelta' OR CHAR_LENGTH(TRIM(observacion)) >= 5),
  UNIQUE KEY ux_rev (evaluacion, accion, fecha)
) ENGINE=InnoDB;

CREATE TABLE reprogramacion (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evaluacion      CHAR(14)      NOT NULL,
  fecha_anterior  DATE          NOT NULL,
  fecha_nueva     DATE          NOT NULL,
  motivo          VARCHAR(300)  NOT NULL,
  usuario         VARCHAR(40)   NULL,
  registrada_en   DATETIME      NOT NULL,
  CONSTRAINT fk_rep_eval FOREIGN KEY (evaluacion) REFERENCES evaluacion (codigo) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT ck_rep_fechas CHECK (fecha_nueva <> fecha_anterior),
  UNIQUE KEY ux_rep (evaluacion, registrada_en)
) ENGINE=InnoDB;

CREATE TABLE constancia (
  codigo          CHAR(14)      NOT NULL PRIMARY KEY,
  verificacion    CHAR(9)       NOT NULL,
  evaluacion      CHAR(14)      NOT NULL,
  finca_codigo    CHAR(14)      NOT NULL,
  especie         VARCHAR(10)   NOT NULL,
  puntaje         DECIMAL(5,1)  NULL,
  nivel           VARCHAR(20)   NULL,
  emitida_en      DATETIME      NOT NULL,
  vence           DATE          NOT NULL,
  aprobada_por    VARCHAR(40)   NULL,
  CONSTRAINT fk_cons_eval FOREIGN KEY (evaluacion) REFERENCES evaluacion (codigo) ON UPDATE CASCADE,
  CONSTRAINT ck_cons_codigo CHECK (codigo REGEXP '^CER-[0-9]{4}-[0-9]{5}$'),
  CONSTRAINT ck_cons_vence CHECK (vence > DATE(emitida_en)),
  UNIQUE KEY ux_cons_eval (evaluacion),
  UNIQUE KEY ux_cons_verif (verificacion)
) ENGINE=InnoDB;

CREATE TABLE aviso (
  id              VARCHAR(30)   NOT NULL PRIMARY KEY,
  para            VARCHAR(40)   NOT NULL,                      -- clave del usuario o perfil (coordinador)
  tipo            VARCHAR(20)   NULL,                          -- «aprobar»: solo para el coordinador
  texto           VARCHAR(400)  NOT NULL,
  enlace          VARCHAR(200)  NULL,
  leido           BOOLEAN       NOT NULL DEFAULT FALSE,
  creado_en       DATETIME      NOT NULL,
  datos           LONGTEXT      NOT NULL CHECK (JSON_VALID(datos)),
  version         INT UNSIGNED  NOT NULL DEFAULT 1,
  KEY ix_aviso_para (para, leido)
) ENGINE=InnoDB;

-- Lo que espera al coordinador: inspecciones por aprobar y devueltas.
CREATE OR REPLACE VIEW v_bandeja_coordinador AS
SELECT e.codigo AS evaluacion, f.nombre AS finca, e.especie, e.estado, e.fecha, u.nombre AS inspector, e.enviada_en
FROM evaluacion e
JOIN finca f ON f.codigo = e.finca_codigo
LEFT JOIN usuario u ON u.clave = e.inspector
WHERE e.estado IN ('Pendiente de aprobación', 'Devuelta');

-- Constancias con su vigencia.
CREATE OR REPLACE VIEW v_constancias AS
SELECT c.codigo, c.verificacion, f.nombre AS finca, c.especie, c.puntaje, c.nivel, DATE(c.emitida_en) AS emitida, c.vence,
       c.vence >= CURDATE() AS vigente, u.nombre AS aprobada_por
FROM constancia c
JOIN finca f ON f.codigo = c.finca_codigo
LEFT JOIN usuario u ON u.clave = c.aprobada_por;
