-- =====================================================================================
-- EBA Cuac Cuac · MariaDB · Migración 002: el prototipo v0.24 guarda todo en la base de datos
-- Fincas, evaluaciones (inspecciones), procesos de seguimiento, usuarios y bitácora.
-- Cada tabla tiene columnas para consultar (estado, finca, especie…) y una columna JSON «datos»
-- con el registro completo tal como lo maneja la aplicación (respuestas, recorridos, firmas, plan de mejora).
-- «version» evita que dos personas se sobrescriban: cada cambio debe partir de la última versión.
-- =====================================================================================

-- Fincas: los datos de manejo del prototipo (propósito «Carne y plumas», sistema «Semi-intensivo», inventario)
-- se guardan tal cual; por eso estas columnas pasan a texto.
ALTER TABLE finca
  MODIFY persona_id INT UNSIGNED NULL,
  ADD COLUMN datos    LONGTEXT     NULL CHECK (datos IS NULL OR JSON_VALID(datos)),
  ADD COLUMN version  INT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN modificado_por VARCHAR(80) NULL;

ALTER TABLE finca_especie
  DROP CONSTRAINT ck_fe_aves,
  MODIFY proposito VARCHAR(40) NOT NULL DEFAULT 'Carne',
  MODIFY sistema   VARCHAR(30) NULL,
  ADD CONSTRAINT ck_fe_aves CHECK (numero_aves BETWEEN 0 AND 1000000);
UPDATE finca_especie SET proposito = 'Carne' WHERE proposito = 'CARNE';
UPDATE finca_especie SET proposito = 'Huevo' WHERE proposito = 'HUEVO';
UPDATE finca_especie SET sistema = 'Semi-intensivo' WHERE sistema = 'SEMI_INTENSIVO';
UPDATE finca_especie SET sistema = 'Intensivo' WHERE sistema = 'INTENSIVO';
UPDATE finca_especie SET sistema = 'Extensivo' WHERE sistema = 'EXTENSIVO';

-- Evaluaciones (visitas de inspección): apertura, recorridos, respuestas, observaciones, firmas, plan de mejora.
CREATE TABLE evaluacion (
  codigo          CHAR(14)      NOT NULL PRIMARY KEY,
  finca_codigo    CHAR(14)      NOT NULL,
  especie         VARCHAR(10)   NOT NULL,
  estado          VARCHAR(30)   NOT NULL,
  fecha           DATE          NULL,
  inspector       VARCHAR(30)   NULL,
  proceso         VARCHAR(14)   NULL,
  visita          TINYINT UNSIGNED NOT NULL DEFAULT 0,
  datos           LONGTEXT      NOT NULL CHECK (JSON_VALID(datos)),
  version         INT UNSIGNED  NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  modificado_por  VARCHAR(80)   NULL,
  CONSTRAINT fk_eval_finca   FOREIGN KEY (finca_codigo) REFERENCES finca (codigo) ON UPDATE CASCADE,
  CONSTRAINT fk_eval_especie FOREIGN KEY (especie) REFERENCES especie (codigo),
  CONSTRAINT ck_eval_codigo  CHECK (codigo REGEXP '^EVA-[0-9]{4}-[0-9]{5}$'),
  KEY ix_eval_finca (finca_codigo, especie),
  KEY ix_eval_estado (estado),
  KEY ix_eval_proceso (proceso)
) ENGINE=InnoDB;

-- Procesos de seguimiento: datos propios del proceso (p. ej. la ampliación a 5 seguimientos con su motivo).
CREATE TABLE proceso (
  codigo          VARCHAR(14)   NOT NULL PRIMARY KEY,
  datos           LONGTEXT      NOT NULL CHECK (JSON_VALID(datos)),
  version         INT UNSIGNED  NOT NULL DEFAULT 1,
  modificado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  modificado_por  VARCHAR(80)   NULL
) ENGINE=InnoDB;

-- Usuarios de la plataforma (el ingreso con contraseña y código llega en la siguiente migración).
CREATE TABLE usuario (
  documento       VARCHAR(20)   NOT NULL PRIMARY KEY,   -- solo dígitos o letras, sin puntos
  nombre          VARCHAR(120)  NOT NULL,
  rol             VARCHAR(60)   NOT NULL,
  correo          VARCHAR(120)  NULL,
  estado          VARCHAR(20)   NOT NULL,
  datos           LONGTEXT      NOT NULL CHECK (JSON_VALID(datos)),
  version         INT UNSIGNED  NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bitácora: la «huella» identifica cada entrada para no repetirla al sincronizar.
ALTER TABLE bitacora
  ADD COLUMN huella CHAR(40) NULL,
  ADD COLUMN fecha_original VARCHAR(30) NULL,
  ADD UNIQUE KEY ux_bitacora_huella (huella);
