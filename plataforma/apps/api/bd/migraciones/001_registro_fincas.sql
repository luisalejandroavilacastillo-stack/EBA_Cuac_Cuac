-- =====================================================================================
-- EBA Cuac Cuac · MariaDB · Migración 001: registro de fincas (CU-04, CU-05)
-- Adaptado del modelo PostgreSQL del prototipo (base_de_datos/01_esquema.sql).
-- La API la aplica sola al arrancar si aún no está aplicada (tabla esquema_version).
-- =====================================================================================

-- Catálogo de departamentos (DIVIPOLA - DANE). El municipio se escribe por ahora;
-- el catálogo completo de municipios se carga en una migración posterior.
CREATE TABLE departamento (
  codigo_dane  CHAR(2)      NOT NULL PRIMARY KEY,
  nombre       VARCHAR(80)  NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO departamento (codigo_dane, nombre) VALUES
  ('05','Antioquia'), ('08','Atlántico'), ('11','Bogotá D.C.'), ('13','Bolívar'), ('15','Boyacá'),
  ('17','Caldas'), ('18','Caquetá'), ('19','Cauca'), ('20','Cesar'), ('23','Córdoba'),
  ('25','Cundinamarca'), ('27','Chocó'), ('41','Huila'), ('44','La Guajira'), ('47','Magdalena'),
  ('50','Meta'), ('52','Nariño'), ('54','Norte de Santander'), ('63','Quindío'), ('66','Risaralda'),
  ('68','Santander'), ('70','Sucre'), ('73','Tolima'), ('76','Valle del Cauca'), ('81','Arauca'),
  ('85','Casanare'), ('86','Putumayo'), ('88','Archipiélago de San Andrés, Providencia y Santa Catalina'),
  ('91','Amazonas'), ('94','Guainía'), ('95','Guaviare'), ('97','Vaupés'), ('99','Vichada');

-- Especies que evalúa la metodología (capítulos 6 y 7).
CREATE TABLE especie (
  codigo             VARCHAR(10)  NOT NULL PRIMARY KEY,
  nombre             VARCHAR(30)  NOT NULL UNIQUE,
  nombre_cientifico  VARCHAR(80)  NOT NULL
) ENGINE=InnoDB;

INSERT INTO especie (codigo, nombre, nombre_cientifico) VALUES
  ('pato',  'Patos',  'Anas platyrhynchos domesticus / Cairina moschata'),
  ('ganso', 'Gansos', 'Anser anser domesticus / Anser cygnoides');

-- Persona responsable de la finca (productor o propietario). Datos personales: Ley 1581 de 2012.
CREATE TABLE persona_responsable (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(120)  NOT NULL,
  tipo_documento      ENUM('CC','CE','NIT','PAS','PPT') NOT NULL,
  numero_documento    VARCHAR(20)   NOT NULL,
  correo              VARCHAR(120)  NULL,                         -- opcional en traspatio (RN-50)
  telefono            VARCHAR(10)   NOT NULL,
  autoriza_datos      BOOLEAN       NOT NULL,
  fecha_autorizacion  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_en           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_persona_documento (tipo_documento, numero_documento),
  CONSTRAINT ck_persona_autoriza CHECK (autoriza_datos = TRUE),
  CONSTRAINT ck_persona_telefono CHECK (telefono REGEXP '^(3[0-9]{9}|60[0-9]{8})$'),
  CONSTRAINT ck_persona_correo   CHECK (correo IS NULL OR correo REGEXP '^[^@[:space:]]+@[^@[:space:]]+\\.[A-Za-z]{2,}$')
) ENGINE=InnoDB;

-- Consecutivo del código FIN-AAAA-NNNNN por año.
CREATE TABLE consecutivo (
  tipo    VARCHAR(10)   NOT NULL,
  anio    SMALLINT      NOT NULL,
  ultimo  INT UNSIGNED  NOT NULL DEFAULT 0,
  PRIMARY KEY (tipo, anio)
) ENGINE=InnoDB;

CREATE TABLE finca (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codigo         CHAR(14)      NOT NULL UNIQUE,
  nombre         VARCHAR(120)  NOT NULL,
  departamento   CHAR(2)       NOT NULL,
  municipio      VARCHAR(80)   NOT NULL,
  vereda         VARCHAR(80)   NULL,
  persona_id     INT UNSIGNED  NOT NULL,
  estado         ENUM('ACTIVA','INACTIVA') NOT NULL DEFAULT 'ACTIVA',
  motivo_estado  VARCHAR(300)  NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_finca_departamento FOREIGN KEY (departamento) REFERENCES departamento (codigo_dane),
  CONSTRAINT fk_finca_persona      FOREIGN KEY (persona_id)   REFERENCES persona_responsable (id),
  CONSTRAINT ck_finca_codigo   CHECK (codigo REGEXP '^FIN-[0-9]{4}-[0-9]{5}$'),
  CONSTRAINT ck_finca_inactiva CHECK (estado = 'ACTIVA' OR motivo_estado IS NOT NULL),
  KEY ix_finca_nombre (nombre)
) ENGINE=InnoDB;

-- Especies de la finca con su número de aves (registro, RN-175). El tramo se calcula: < 200 traspatio, ≥ 200 comercial.
-- Los valores de manejo vienen por defecto y se ajustan en la visita (decisión del prototipo v0.21).
CREATE TABLE finca_especie (
  finca_id            INT UNSIGNED  NOT NULL,
  especie             VARCHAR(10)   NOT NULL,
  numero_aves         INT UNSIGNED  NOT NULL,
  proposito           ENUM('CARNE','HUEVO') NOT NULL DEFAULT 'CARNE',
  sistema             ENUM('INTENSIVO','SEMI_INTENSIVO','EXTENSIVO') NOT NULL DEFAULT 'SEMI_INTENSIVO',
  con_corral          BOOLEAN       NOT NULL DEFAULT TRUE,
  permanencia_corral  BOOLEAN       NULL,          -- solo patos
  con_cama            BOOLEAN       NULL,          -- solo patos
  PRIMARY KEY (finca_id, especie),
  CONSTRAINT fk_fe_finca   FOREIGN KEY (finca_id) REFERENCES finca (id) ON DELETE CASCADE,
  CONSTRAINT fk_fe_especie FOREIGN KEY (especie)  REFERENCES especie (codigo),
  CONSTRAINT ck_fe_aves    CHECK (numero_aves BETWEEN 1 AND 1000000)
) ENGINE=InnoDB;

-- Bitácora de acciones (CU-26). No guarda datos personales en la descripción.
CREATE TABLE bitacora (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fecha     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario   VARCHAR(80)     NOT NULL,
  accion    VARCHAR(300)    NOT NULL,
  KEY ix_bitacora_fecha (fecha)
) ENGINE=InnoDB;
