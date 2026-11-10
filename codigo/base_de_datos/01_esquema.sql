-- =============================================================================
-- EBA Patos y Gansos · ICA — Diseño de la base de datos (PostgreSQL 14 o superior)
-- Plataforma de Evaluación de Bienestar Animal en patos y gansos.
-- Fuente: diagramas de clases Vista 1 a Vista 6 y Metodología ICA v1.0 (2024).
--
-- Orden de ejecución:
--   01_esquema.sql        tipos, tablas, índices, restricciones, disparadores, vistas
--   02_catalogos.sql      roles, permisos, especies, ubicación, catálogos de apoyo
--   03_metodologia.sql    versión 1.0 de la norma: 58 indicadores, escalas y reglas
--   04_datos_ejemplo.sql  usuarios, fincas y evaluaciones del prototipo
--
-- Convenciones
--   · Un esquema: eba. Tablas en singular y snake_case. Clave primaria «id».
--   · Toda entidad con historial tiene creado_en / modificado_en.
--   · Lo que tiene historial no se borra: se inactiva (estado) o se anula.
--   · Tablas «historial» e «inmutables» tienen disparadores que impiden UPDATE/DELETE.
-- =============================================================================

SET client_min_messages = warning;
DROP SCHEMA IF EXISTS eba CASCADE;
CREATE SCHEMA eba;
SET search_path TO eba;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE estado_usuario     AS ENUM ('PENDIENTE_ACTIVACION', 'ACTIVO', 'INACTIVO', 'BLOQUEADO');
CREATE TYPE estado_registro    AS ENUM ('ACTIVO', 'INACTIVO');
CREATE TYPE tipo_documento     AS ENUM ('CC', 'CE', 'TI', 'PPT', 'NIT', 'PASAPORTE');
CREATE TYPE tipo_productor     AS ENUM ('COMERCIAL', 'TRASPATIO');
CREATE TYPE profesion          AS ENUM ('MV', 'MVZ', 'Z');
CREATE TYPE estado_sesion      AS ENUM ('PENDIENTE_SEGUNDO_FACTOR', 'ACTIVA', 'CERRADA', 'EXPIRADA');
CREATE TYPE etapa_intento      AS ENUM ('CONTRASENA', 'CODIGO', 'RECUPERACION');
CREATE TYPE estado_codigo      AS ENUM ('VIGENTE', 'USADO', 'VENCIDO', 'ANULADO');
CREATE TYPE origen_token       AS ENUM ('CORREO', 'ASISTIDO');

CREATE TYPE estado_finca       AS ENUM ('INCOMPLETA', 'ACTIVA', 'INACTIVA');
CREATE TYPE tipo_vinculo       AS ENUM ('PROPIETARIO', 'RESPONSABLE_TECNICO', 'ENCARGADO');
CREATE TYPE tipo_instalacion   AS ENUM ('GALPON', 'CORRAL', 'POCETA', 'ESTANQUE', 'POTRERO', 'BODEGA');
CREATE TYPE tramo              AS ENUM ('TRASPATIO', 'COMERCIAL');

CREATE TYPE estado_version     AS ENUM ('BORRADOR', 'PUBLICADA', 'RETIRADA');
CREATE TYPE grupo_medidas      AS ENUM ('MBR', 'MBA', 'MBG');
CREATE TYPE nivel_bienestar    AS ENUM ('EXCELENTE', 'ALTO', 'MEDIO', 'BAJO');
CREATE TYPE tipo_captura       AS ENUM ('CONDICIONES', 'PORCENTAJE', 'POR_UNIDAD', 'CONDICION_CORPORAL',
                                        'DENSIDAD', 'PRACTICAS', 'DOCUMENTO', 'OPCION');
CREATE TYPE tipo_dato          AS ENUM ('CASILLA', 'NUMERO', 'TEXTO', 'FECHA', 'ARCHIVO', 'OPCION');
CREATE TYPE requisito_evidencia AS ENUM ('NO', 'OPCIONAL', 'OBLIGATORIA', 'SEGUN_NIVEL');
CREATE TYPE variable_contexto  AS ENUM ('TRAMO', 'PROPOSITO', 'SISTEMA', 'PERMANENCIA', 'PISO');

CREATE TYPE estado_evaluacion  AS ENUM ('PROGRAMADA', 'EN_PROCESO', 'FINALIZADA', 'ANULADA');
CREATE TYPE fase_visita        AS ENUM ('APERTURA', 'RECURSOS_MBR', 'ANIMALES_MBA', 'DOCUMENTAL_MBG', 'CIERRE');
CREATE TYPE estado_seccion     AS ENUM ('SIN_INICIAR', 'EN_PROGRESO', 'COMPLETA', 'CON_PENDIENTES');
CREATE TYPE origen_guardado    AS ENUM ('MANUAL', 'AUTOMATICO', 'SINCRONIZACION');
CREATE TYPE tipo_unidad        AS ENUM ('AVE', 'BEBEDERO', 'COMEDERO', 'NIDAL', 'CAMA', 'INSTALACION', 'DOCUMENTO');
CREATE TYPE estado_indicador   AS ENUM ('PENDIENTE', 'CALIFICADO', 'NO_APLICA');
CREATE TYPE nivel_observacion  AS ENUM ('PREGUNTA', 'INDICADOR', 'GENERAL');
CREATE TYPE tipo_observacion   AS ENUM ('HALLAZGO', 'ACLARACION', 'ACUERDO');
CREATE TYPE tipo_archivo       AS ENUM ('FOTO', 'PDF', 'VIDEO');
CREATE TYPE estado_documento   AS ENUM ('APORTADO', 'VALIDO', 'NO_VALIDO', 'PENDIENTE', 'NO_PRESENTADO');
CREATE TYPE caracter_resultado AS ENUM ('PRELIMINAR', 'PROVISIONAL', 'DEFINITIVO');
CREATE TYPE tipo_item          AS ENUM ('FORTALEZA', 'OPORTUNIDAD', 'INCUMPLIMIENTO');

CREATE TYPE estado_plan        AS ENUM ('ABIERTO', 'CERRADO');
CREATE TYPE prioridad          AS ENUM ('ALTA', 'MEDIA', 'BAJA');
CREATE TYPE estado_accion      AS ENUM ('PENDIENTE', 'EN_CURSO', 'CUMPLIDA', 'NO_CUMPLIDA', 'VENCIDA');
CREATE TYPE tipo_notificacion  AS ENUM ('VISITA_PROGRAMADA', 'EVALUACION_EN_PROCESO', 'OBSERVACION_FALTANTE',
                                        'DOCUMENTO_PENDIENTE', 'MATRICULA_POR_VENCER', 'INCUMPLIMIENTOS');
CREATE TYPE canal              AS ENUM ('PLATAFORMA', 'CORREO');
CREATE TYPE tipo_reporte       AS ENUM ('PDF_RESULTADO', 'CSV_RESULTADOS');

-- -----------------------------------------------------------------------------
-- 2. Funciones de apoyo
-- -----------------------------------------------------------------------------
CREATE FUNCTION fn_modificado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.modificado_en := now();
  RETURN NEW;
END $$;

-- Impide modificar o borrar tablas de historial (RN-41, RN-42, RN-108, RN-146, RN-150)
CREATE FUNCTION fn_solo_insercion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de historial: no admite %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END $$;

-- =============================================================================
-- 3. MÓDULO ADMINISTRADOR (Vistas 1 y 2 · RF01 a RF04)
-- =============================================================================
CREATE TABLE departamento (
  codigo_dane   char(2)      PRIMARY KEY,
  nombre        varchar(60)  NOT NULL UNIQUE
);

CREATE TABLE municipio (
  codigo_dane   char(5)      PRIMARY KEY,
  departamento  char(2)      NOT NULL REFERENCES departamento,
  nombre        varchar(80)  NOT NULL,
  UNIQUE (departamento, nombre)
);

CREATE TABLE seccional (
  id            smallserial  PRIMARY KEY,
  codigo        varchar(10)  NOT NULL UNIQUE,
  nombre        varchar(80)  NOT NULL,
  departamento  char(2)      NOT NULL REFERENCES departamento,
  estado        estado_registro NOT NULL DEFAULT 'ACTIVO'
);

CREATE TABLE usuario (
  id                      serial        PRIMARY KEY,
  tipo_documento          tipo_documento NOT NULL,
  numero_documento        varchar(20)   NOT NULL,
  nombres                 varchar(80)   NOT NULL,
  apellidos               varchar(80)   NOT NULL,
  correo                  varchar(120),                       -- opcional en traspatio (RN-50)
  telefono                varchar(20)   NOT NULL,
  municipio               char(5)       REFERENCES municipio,
  vereda                  varchar(80),
  estado                  estado_usuario NOT NULL DEFAULT 'PENDIENTE_ACTIVACION',
  motivo_estado           varchar(300),
  fecha_estado            timestamptz,
  autoriza_datos          boolean       NOT NULL DEFAULT false,   -- Ley 1581 de 2012
  fecha_autorizacion      timestamptz,
  intentos_fallidos       smallint      NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta         timestamptz,
  debe_cambiar_contrasena boolean       NOT NULL DEFAULT true,
  ultimo_acceso           timestamptz,
  creado_en               timestamptz   NOT NULL DEFAULT now(),
  modificado_en           timestamptz   NOT NULL DEFAULT now(),
  creado_por              int           REFERENCES usuario,
  modificado_por          int           REFERENCES usuario,
  UNIQUE (tipo_documento, numero_documento),
  CHECK (correo IS NULL OR correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CHECK (NOT autoriza_datos OR fecha_autorizacion IS NOT NULL),
  CHECK (estado <> 'INACTIVO' OR motivo_estado IS NOT NULL)
);
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo)) WHERE correo IS NOT NULL;
CREATE TRIGGER tg_usuario_mod BEFORE UPDATE ON usuario FOR EACH ROW EXECUTE FUNCTION fn_modificado_en();

CREATE TABLE rol (
  id                    smallserial PRIMARY KEY,
  codigo                varchar(30) NOT NULL UNIQUE,
  nombre                varchar(60) NOT NULL,
  descripcion           varchar(300),
  ambito                varchar(20) NOT NULL CHECK (ambito IN ('ICA', 'EXTERNO')),
  estado                estado_registro NOT NULL DEFAULT 'ACTIVO',
  es_rol_sistema        boolean     NOT NULL DEFAULT false,
  requiere_matricula    boolean     NOT NULL DEFAULT false,
  requiere_doble_factor boolean     NOT NULL DEFAULT true
);

CREATE TABLE permiso (
  id          smallserial PRIMARY KEY,
  codigo      varchar(40) NOT NULL UNIQUE,
  modulo      varchar(30) NOT NULL,
  accion      varchar(20) NOT NULL CHECK (accion IN ('CONSULTAR', 'CREAR', 'EDITAR', 'ELIMINAR', 'INACTIVAR', 'EXPORTAR', 'ADMINISTRAR')),
  descripcion varchar(200)
);

CREATE TABLE rol_permiso (                      -- «historial»
  id               serial      PRIMARY KEY,
  rol_id           smallint    NOT NULL REFERENCES rol,
  permiso_id       smallint    NOT NULL REFERENCES permiso,
  fecha_asignacion timestamptz NOT NULL DEFAULT now(),
  asignado_por     int         REFERENCES usuario,
  fecha_retiro     timestamptz,
  CHECK (fecha_retiro IS NULL OR fecha_retiro >= fecha_asignacion)
);
CREATE UNIQUE INDEX ux_rol_permiso_vigente ON rol_permiso (rol_id, permiso_id) WHERE fecha_retiro IS NULL;

CREATE TABLE usuario_rol (                      -- «historial» (RN-12)
  id            serial      PRIMARY KEY,
  usuario_id    int         NOT NULL REFERENCES usuario,
  rol_id        smallint    NOT NULL REFERENCES rol,
  fecha_inicio  date        NOT NULL DEFAULT current_date,
  fecha_fin     date,
  asignado_por  int         REFERENCES usuario,
  motivo_retiro varchar(300),
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CHECK (fecha_fin IS NULL OR motivo_retiro IS NOT NULL)
);
CREATE UNIQUE INDEX ux_usuario_rol_vigente ON usuario_rol (usuario_id, rol_id) WHERE fecha_fin IS NULL;

CREATE TABLE perfil_profesional (               -- MV, MVZ o Z con matrícula COMVEZCOL (5.5 Fase III)
  usuario_id         int        PRIMARY KEY REFERENCES usuario,
  profesion          profesion  NOT NULL,
  numero_matricula   varchar(20) NOT NULL UNIQUE,
  vigencia_matricula date       NOT NULL,
  soporte_matricula  varchar(300)
);

CREATE TABLE perfil_ica (
  usuario_id   int         PRIMARY KEY REFERENCES usuario,
  cargo        varchar(80) NOT NULL,
  seccional_id smallint    NOT NULL REFERENCES seccional
);

CREATE TABLE perfil_productor (
  usuario_id        int            PRIMARY KEY REFERENCES usuario,
  tipo_productor    tipo_productor NOT NULL,
  acceso_plataforma boolean        NOT NULL DEFAULT true,
  registrado_por    int            REFERENCES usuario       -- registro asistido por el inspector
);

CREATE TABLE perfil_consultor (
  usuario_id               int          PRIMARY KEY REFERENCES usuario,
  entidad                  varchar(120) NOT NULL,
  alcance                  varchar(300) NOT NULL,
  fecha_vencimiento_acceso date         NOT NULL
);

CREATE TABLE politica_contrasena (              -- «configuración», una sola fila
  id                       smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  longitud_minima          smallint NOT NULL DEFAULT 10,
  exige_mayuscula          boolean  NOT NULL DEFAULT true,
  exige_minuscula          boolean  NOT NULL DEFAULT true,
  exige_numero             boolean  NOT NULL DEFAULT true,
  exige_caracter_especial  boolean  NOT NULL DEFAULT true,
  no_repetir_ultimas       smallint NOT NULL DEFAULT 5,
  intentos_maximos         smallint NOT NULL DEFAULT 5,
  minutos_bloqueo          smallint NOT NULL DEFAULT 15,
  dias_expiracion_ica      smallint NOT NULL DEFAULT 90,
  dias_expiracion_externo  smallint NOT NULL DEFAULT 180,
  minutos_inactividad      smallint NOT NULL DEFAULT 15,
  minutos_vigencia_codigo  smallint NOT NULL DEFAULT 10,
  intentos_maximos_codigo  smallint NOT NULL DEFAULT 3,
  minutos_vigencia_enlace  smallint NOT NULL DEFAULT 30
);

CREATE TABLE credencial (
  usuario_id       int          PRIMARY KEY REFERENCES usuario,
  hash_contrasena  varchar(255) NOT NULL,
  algoritmo        varchar(20)  NOT NULL DEFAULT 'argon2id',
  fecha_cambio     timestamptz  NOT NULL DEFAULT now(),
  fecha_expiracion timestamptz  NOT NULL,
  es_temporal      boolean      NOT NULL DEFAULT true
);

CREATE TABLE historial_contrasena (             -- «historial»
  id              serial       PRIMARY KEY,
  usuario_id      int          NOT NULL REFERENCES usuario,
  hash_contrasena varchar(255) NOT NULL,
  fecha_registro  timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE sesion (                           -- «historial»
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id                int           NOT NULL REFERENCES usuario,
  estado                    estado_sesion NOT NULL DEFAULT 'PENDIENTE_SEGUNDO_FACTOR',
  segundo_factor_verificado boolean       NOT NULL DEFAULT false,
  fecha_inicio              timestamptz   NOT NULL DEFAULT now(),
  fecha_ultima_actividad    timestamptz   NOT NULL DEFAULT now(),
  fecha_cierre              timestamptz,
  dispositivo               varchar(120)  NOT NULL,
  ciudad                    varchar(80),
  ip                        inet,
  CHECK (estado NOT IN ('CERRADA', 'EXPIRADA') OR fecha_cierre IS NOT NULL)
);
CREATE INDEX ix_sesion_usuario_activa ON sesion (usuario_id) WHERE estado = 'ACTIVA';

CREATE TABLE codigo_verificacion (              -- doble factor (RN-45 a RN-48)
  id             serial        PRIMARY KEY,
  sesion_id      uuid          NOT NULL REFERENCES sesion,
  hash_codigo    varchar(255)  NOT NULL,
  canal          canal         NOT NULL DEFAULT 'CORREO',
  correo_destino varchar(120)  NOT NULL,
  fecha_emision  timestamptz   NOT NULL DEFAULT now(),
  intentos       smallint      NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 3),
  estado         estado_codigo NOT NULL DEFAULT 'VIGENTE'
);

CREATE TABLE intento_acceso (                   -- «historial» (RN-07)
  id               bigserial     PRIMARY KEY,
  usuario_id       int           REFERENCES usuario,
  correo_ingresado varchar(120)  NOT NULL,
  fecha_hora       timestamptz   NOT NULL DEFAULT now(),
  etapa            etapa_intento NOT NULL,
  exitoso          boolean       NOT NULL,
  motivo_fallo     varchar(30)   CHECK (motivo_fallo IN ('CONTRASENA', 'USUARIO_INACTIVO', 'BLOQUEADO', 'ACCESO_VENCIDO', 'CODIGO_INVALIDO')),
  ip               inet,
  CHECK (exitoso OR motivo_fallo IS NOT NULL)
);

CREATE TABLE token_recuperacion (               -- «historial»
  id                serial       PRIMARY KEY,
  usuario_id        int          NOT NULL REFERENCES usuario,
  hash_token        varchar(255) NOT NULL UNIQUE,
  origen            origen_token NOT NULL,
  fecha_emision     timestamptz  NOT NULL DEFAULT now(),
  fecha_vencimiento timestamptz  NOT NULL,
  usado             boolean      NOT NULL DEFAULT false,
  asistido_por      int          REFERENCES usuario,
  CHECK (fecha_vencimiento > fecha_emision),
  CHECK (origen = 'CORREO' OR asistido_por IS NOT NULL)
);

CREATE TABLE registro_auditoria (               -- «inmutable» (RN-41, RN-42, RN-146)
  id             bigserial    PRIMARY KEY,
  fecha_hora     timestamptz  NOT NULL DEFAULT now(),
  actor_id       int          REFERENCES usuario,
  accion         varchar(60)  NOT NULL,
  entidad        varchar(60)  NOT NULL,
  id_entidad     varchar(40),
  valor_anterior jsonb,
  valor_nuevo    jsonb,
  motivo         varchar(500),
  ip             inet
);
CREATE INDEX ix_auditoria_entidad ON registro_auditoria (entidad, id_entidad);
CREATE INDEX ix_auditoria_fecha   ON registro_auditoria (fecha_hora);
CREATE TRIGGER tg_auditoria_inmutable BEFORE UPDATE OR DELETE ON registro_auditoria
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();
CREATE TRIGGER tg_intento_inmutable BEFORE UPDATE OR DELETE ON intento_acceso
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

-- =============================================================================
-- 4. CATÁLOGOS (Vista 3 y Vista 6 · RF07, RF08, RF35)
-- =============================================================================
CREATE TABLE especie (
  id                smallserial PRIMARY KEY,
  nombre            varchar(30) NOT NULL UNIQUE,      -- pato, ganso (cap. 6 y 7)
  nombre_cientifico varchar(80) NOT NULL,
  activa            boolean     NOT NULL DEFAULT true
);

CREATE TABLE categoria_etaria (
  id         smallserial PRIMARY KEY,
  especie_id smallint    NOT NULL REFERENCES especie,
  nombre     varchar(40) NOT NULL,
  orden      smallint    NOT NULL,
  activa     boolean     NOT NULL DEFAULT true,
  UNIQUE (especie_id, nombre)
);

CREATE TABLE catalogo (                          -- catálogos de apoyo (RF35)
  id       smallserial PRIMARY KEY,
  codigo   varchar(30) NOT NULL UNIQUE,
  nombre   varchar(80) NOT NULL,
  editable boolean     NOT NULL DEFAULT true          -- RN-148: lo que fija la norma no es editable
);

CREATE TABLE item_catalogo (
  id          serial          PRIMARY KEY,
  catalogo_id smallint        NOT NULL REFERENCES catalogo,
  codigo      varchar(30)     NOT NULL,
  nombre      varchar(120)    NOT NULL,
  orden       smallint        NOT NULL DEFAULT 1,
  estado      estado_registro NOT NULL DEFAULT 'ACTIVO',
  UNIQUE (catalogo_id, codigo)
);

CREATE TABLE festivo (                           -- plazo de 1 día hábil (5.5 Fase IV)
  fecha  date        PRIMARY KEY,
  nombre varchar(80) NOT NULL
);

-- =============================================================================
-- 5. UNIDADES PRODUCTIVAS (Vista 3 · RF05 a RF08)
-- =============================================================================
CREATE TABLE finca (
  id             serial        PRIMARY KEY,
  codigo         char(14)      NOT NULL UNIQUE CHECK (codigo ~ '^FIN-\d{4}-\d{5}$'),
  nombre         varchar(120)  NOT NULL,
  tenencia       varchar(20)   NOT NULL CHECK (tenencia IN ('PROPIA', 'ARRENDADA', 'COMODATO', 'OTRA')),
  telefono       varchar(20),
  encargado      varchar(120),
  area_total_ha  numeric(10,2) CHECK (area_total_ha > 0),
  estado         estado_finca  NOT NULL DEFAULT 'INCOMPLETA',
  motivo_estado  varchar(300),
  creado_en      timestamptz   NOT NULL DEFAULT now(),
  modificado_en  timestamptz   NOT NULL DEFAULT now(),
  creado_por     int           REFERENCES usuario,
  CHECK (estado <> 'INACTIVA' OR motivo_estado IS NOT NULL)
);
CREATE TRIGGER tg_finca_mod BEFORE UPDATE ON finca FOR EACH ROW EXECUTE FUNCTION fn_modificado_en();

CREATE TABLE asignacion_finca (                 -- «historial» (RN-74, RN-75)
  id           serial       PRIMARY KEY,
  finca_id     int          NOT NULL REFERENCES finca,
  usuario_id   int          NOT NULL REFERENCES usuario,
  tipo         tipo_vinculo NOT NULL,
  fecha_inicio date         NOT NULL DEFAULT current_date,
  fecha_fin    date,
  motivo       varchar(300),
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
-- un solo propietario vigente por finca
CREATE UNIQUE INDEX ux_finca_propietario ON asignacion_finca (finca_id) WHERE tipo = 'PROPIETARIO' AND fecha_fin IS NULL;

CREATE TABLE ubicacion_finca (
  finca_id    int           PRIMARY KEY REFERENCES finca,
  municipio   char(5)       NOT NULL REFERENCES municipio,
  vereda      varchar(80),
  zona        varchar(6)    NOT NULL DEFAULT 'RURAL' CHECK (zona IN ('RURAL', 'URBANA')),
  direccion   varchar(300)  NOT NULL,
  latitud     numeric(9,6)  CHECK (latitud BETWEEN -4.3 AND 13.5),      -- Colombia (RN-63)
  longitud    numeric(9,6)  CHECK (longitud BETWEEN -82 AND -66.8),
  precision_m numeric(7,1),
  fuente      varchar(10)   CHECK (fuente IN ('GPS', 'MAPA', 'MANUAL')),
  CHECK ((latitud IS NULL) = (longitud IS NULL)),
  CHECK (zona = 'URBANA' OR vereda IS NOT NULL)
);

CREATE TABLE historial_ubicacion (              -- «historial» (RN-64)
  id          serial       PRIMARY KEY,
  finca_id    int          NOT NULL REFERENCES finca,
  municipio   char(5)      NOT NULL REFERENCES municipio,
  vereda      varchar(80),
  direccion   varchar(300) NOT NULL,
  latitud     numeric(9,6),
  longitud    numeric(9,6),
  vigente_hasta timestamptz NOT NULL DEFAULT now(),
  motivo      varchar(300) NOT NULL,
  usuario_id  int          REFERENCES usuario
);

CREATE TABLE instalacion (
  id             serial           PRIMARY KEY,
  finca_id       int              NOT NULL REFERENCES finca,
  tipo           tipo_instalacion NOT NULL,
  nombre         varchar(60)      NOT NULL,
  especie_id     smallint         REFERENCES especie,
  area_util_m2   numeric(10,2)    CHECK (area_util_m2 > 0),
  uso            varchar(12)      CHECK (uso IN ('PERMANENTE', 'NOCTURNO', 'PASTOREO')),
  piso           varchar(12)      CHECK (piso IN ('CAMA', 'CEMENTO', 'MADERA', 'TIERRA')),
  profundidad_cm numeric(6,1)     CHECK (profundidad_cm >= 0),       -- pocetas (6.1.12)
  estado         estado_registro  NOT NULL DEFAULT 'ACTIVO',
  UNIQUE (finca_id, tipo, nombre),
  CHECK (tipo NOT IN ('GALPON', 'CORRAL', 'POTRERO') OR area_util_m2 IS NOT NULL)
);

CREATE TABLE finca_especie (                    -- asociación de especies (RF07)
  id                  serial      PRIMARY KEY,
  finca_id            int         NOT NULL REFERENCES finca,
  especie_id          smallint    NOT NULL REFERENCES especie,
  proposito_principal varchar(20) NOT NULL,       -- CARNE, HUEVO, CRIA, PLUMAS, HIGADO_GRASO
  otros_propositos    varchar(20)[] NOT NULL DEFAULT '{}',
  sistema             varchar(16) CHECK (sistema IN ('INTENSIVO', 'SEMI_INTENSIVO', 'EXTENSIVO')),  -- gansos (7.3.8)
  con_corral          boolean     NOT NULL DEFAULT true,
  permanencia_corral  boolean,                    -- jadeo (6.2.1)
  tipo_bebedero       varchar(14) CHECK (tipo_bebedero IN ('ARTESANAL', 'AUTOMATIZADO')),
  fecha_inicio        date        NOT NULL DEFAULT current_date,
  fecha_fin           date,
  motivo_fin          varchar(300),
  CHECK (fecha_fin IS NULL OR motivo_fin IS NOT NULL)
);
CREATE UNIQUE INDEX ux_finca_especie_vigente ON finca_especie (finca_id, especie_id) WHERE fecha_fin IS NULL;

CREATE TABLE inventario_corte (                 -- RF08
  id                   serial      PRIMARY KEY,
  finca_especie_id     int         NOT NULL REFERENCES finca_especie,
  fecha_corte          date        NOT NULL CHECK (fecha_corte <= current_date),
  verificado_en_visita boolean     NOT NULL DEFAULT false,
  motivo               varchar(20) NOT NULL DEFAULT 'REGISTRO' CHECK (motivo IN ('REGISTRO', 'ACTUALIZACION', 'CORRECCION', 'VISITA')),
  registrado_por       int         REFERENCES usuario,
  creado_en            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE detalle_inventario (
  id                  serial       PRIMARY KEY,
  corte_id            int          NOT NULL REFERENCES inventario_corte ON DELETE CASCADE,
  categoria_etaria_id smallint     NOT NULL REFERENCES categoria_etaria,
  cantidad            int          NOT NULL CHECK (cantidad >= 0),
  hembras             int          CHECK (hembras >= 0),
  machos              int          CHECK (machos >= 0),
  edad_semanas        numeric(5,1) CHECK (edad_semanas >= 0),
  peso_promedio_kg    numeric(5,2) CHECK (peso_promedio_kg > 0),       -- densidad (6.1.11)
  UNIQUE (corte_id, categoria_etaria_id),
  CHECK (hembras IS NULL OR machos IS NULL OR hembras + machos = cantidad)
);

-- =============================================================================
-- 6. PARAMETRIZACIÓN DE LA METODOLOGÍA (Vista 4 · RF10 a RF12)
-- =============================================================================
CREATE TABLE version_metodologia (
  id                smallserial    PRIMARY KEY,
  especie_id        smallint       NOT NULL REFERENCES especie,
  numero            varchar(10)    NOT NULL,
  fuente            varchar(200)   NOT NULL,
  estado            estado_version NOT NULL DEFAULT 'BORRADOR',
  corte_tramo       int            NOT NULL DEFAULT 200 CHECK (corte_tramo > 0),   -- 5; Tabla 1
  fecha_publicacion timestamptz,
  publicada_por     int            REFERENCES usuario,
  copia_de          smallint       REFERENCES version_metodologia,
  UNIQUE (especie_id, numero),
  CHECK (estado = 'BORRADOR' OR fecha_publicacion IS NOT NULL)
);
-- una sola versión PUBLICADA por especie (RN-80)
CREATE UNIQUE INDEX ux_version_publicada ON version_metodologia (especie_id) WHERE estado = 'PUBLICADA';

CREATE TABLE dimension (
  id         smallserial   PRIMARY KEY,
  version_id smallint      NOT NULL REFERENCES version_metodologia,
  codigo     grupo_medidas NOT NULL,
  nombre     varchar(60)   NOT NULL,
  numeral    varchar(6)    NOT NULL,              -- 6.1, 6.2, 7.3…
  orden      smallint      NOT NULL,
  UNIQUE (version_id, codigo)
);

CREATE TABLE ponderacion_tramo (                -- Tabla 1 (RN-89)
  id           smallserial  PRIMARY KEY,
  dimension_id smallint     NOT NULL REFERENCES dimension,
  tramo        tramo        NOT NULL,
  peso         numeric(4,3) NOT NULL CHECK (peso BETWEEN 0 AND 1),
  UNIQUE (dimension_id, tramo)
);

CREATE TABLE rango_clasificacion (              -- Tabla 2 (RN-91)
  id         smallserial     PRIMARY KEY,
  version_id smallint        NOT NULL REFERENCES version_metodologia,
  nivel      nivel_bienestar NOT NULL,
  minimo     numeric(4,1)    NOT NULL,
  maximo     numeric(4,1),                         -- NULL = sin tope (100)
  color      char(7)         NOT NULL,
  UNIQUE (version_id, nivel),
  CHECK (maximo IS NULL OR maximo > minimo)
);

CREATE TABLE criterio (
  id           smallserial  PRIMARY KEY,
  dimension_id smallint     NOT NULL REFERENCES dimension,
  nombre       varchar(80)  NOT NULL,
  orden        smallint     NOT NULL,
  peso         numeric(5,2) NOT NULL DEFAULT 1,     -- la norma no pondera criterios
  padre_id     smallint     REFERENCES criterio,
  UNIQUE (dimension_id, nombre)
);

CREATE TABLE indicador (
  id               serial        PRIMARY KEY,
  version_id       smallint      NOT NULL REFERENCES version_metodologia,
  criterio_id      smallint      NOT NULL REFERENCES criterio,
  codigo           char(4)       NOT NULL CHECK (codigo ~ '^(P[RAG]|G[RAG])\d{2}$'),
  nombre           varchar(120)  NOT NULL,
  numeral          varchar(8)    NOT NULL,
  tabla            varchar(20)   NOT NULL,
  pregunta         text          NOT NULL,
  metodo           varchar(200)  NOT NULL,
  unidad_muestreo  varchar(200)  NOT NULL,
  grupo_productivo varchar(200)  NOT NULL,
  condicion        text          NOT NULL,
  aplica_traspatio boolean       NOT NULL,
  tipo_captura     tipo_captura  NOT NULL,
  formula          text          NOT NULL,
  peso             numeric(5,2)  NOT NULL DEFAULT 1,
  orden            smallint      NOT NULL,
  UNIQUE (version_id, codigo),
  UNIQUE (version_id, numeral)
);

CREATE TABLE regla_aplicabilidad (
  id           serial            PRIMARY KEY,
  indicador_id int               NOT NULL REFERENCES indicador ON DELETE CASCADE,
  variable     variable_contexto NOT NULL,
  operador     varchar(6)        NOT NULL CHECK (operador IN ('=', '<>', 'IN', '>=', '<')),
  valor        varchar(60)       NOT NULL,
  motivo       varchar(200)      NOT NULL       -- texto que ve el inspector
);

CREATE TABLE pregunta (                          -- datos que registra el inspector
  id           serial              PRIMARY KEY,
  indicador_id int                 NOT NULL REFERENCES indicador ON DELETE CASCADE,
  texto        varchar(300)        NOT NULL,
  ayuda        text,
  tipo_dato    tipo_dato           NOT NULL,
  es_principal boolean             NOT NULL DEFAULT false,
  obligatoria  boolean             NOT NULL DEFAULT true,
  evidencia    requisito_evidencia NOT NULL DEFAULT 'NO',
  orden        smallint            NOT NULL,
  UNIQUE (indicador_id, orden)
);

CREATE TABLE opcion_respuesta (
  id          serial       PRIMARY KEY,
  pregunta_id int          NOT NULL REFERENCES pregunta ON DELETE CASCADE,
  texto       varchar(200) NOT NULL,
  valor       varchar(40)  NOT NULL,
  puntaje     smallint     CHECK (puntaje IN (100, 55, 20, 0)),
  orden       smallint     NOT NULL
);

CREATE TABLE nivel_escala (                     -- Tablas 5 a 64
  id              serial   PRIMARY KEY,
  indicador_id    int      NOT NULL REFERENCES indicador ON DELETE CASCADE,
  puntaje         smallint NOT NULL CHECK (puntaje IN (100, 55, 20, 0)),
  descripcion     text     NOT NULL,
  color           char(7)  NOT NULL,
  exige_evidencia boolean  NOT NULL DEFAULT false,
  orden           smallint NOT NULL,
  UNIQUE (indicador_id, orden)          -- no por puntaje: la Tabla 9 (6.1.5) repite el nivel 55
);

CREATE TABLE regla_conversion (                 -- porcentaje o valor → nivel (RN-94)
  id              serial       PRIMARY KEY,
  indicador_id    int          NOT NULL REFERENCES indicador ON DELETE CASCADE,
  variable        varchar(40)  NOT NULL,
  minimo          numeric(7,2),
  incluye_minimo  boolean      NOT NULL DEFAULT true,
  maximo          numeric(7,2),
  incluye_maximo  boolean      NOT NULL DEFAULT true,
  puntaje         smallint     NOT NULL CHECK (puntaje IN (100, 55, 20, 0)),
  CHECK (minimo IS NOT NULL OR maximo IS NOT NULL)
);

CREATE TABLE regla_condicion (                  -- condiciones observadas → nivel (RN-94)
  id           serial   PRIMARY KEY,
  indicador_id int      NOT NULL REFERENCES indicador ON DELETE CASCADE,
  descripcion  text     NOT NULL,
  condiciones  jsonb    NOT NULL,                -- expresión evaluada por el servicio de cálculo
  tramo        tramo,                            -- NULL = aplica a ambos
  puntaje      smallint CHECK (puntaje IN (100, 55, 20, 0)),   -- NULL = la expresión devuelve el nivel
  prioridad    smallint NOT NULL DEFAULT 1
);

CREATE TABLE plantilla_diagnostico (
  id           serial    PRIMARY KEY,
  indicador_id int       NOT NULL REFERENCES indicador ON DELETE CASCADE,
  tipo         tipo_item NOT NULL,
  texto        text      NOT NULL,
  UNIQUE (indicador_id, tipo)
);

-- =============================================================================
-- 7. EVALUACIÓN (Vista 5 · RF13 a RF23)
-- =============================================================================
CREATE TABLE evaluacion (
  id                  serial            PRIMARY KEY,
  codigo              char(14)          NOT NULL UNIQUE CHECK (codigo ~ '^EVA-\d{4}-\d{5}$'),
  finca_especie_id    int               NOT NULL REFERENCES finca_especie,
  version_id          smallint          NOT NULL REFERENCES version_metodologia,
  inspector_id        int               NOT NULL REFERENCES usuario,
  corte_id            int               REFERENCES inventario_corte,
  fecha_visita        timestamptz       NOT NULL,
  estado              estado_evaluacion NOT NULL DEFAULT 'PROGRAMADA',
  tramo               tramo,
  pesos               jsonb,             -- instantánea de la Tabla 1 (RN-99)
  poblacion_total     int               CHECK (poblacion_total >= 0),
  instantanea_finca   jsonb,
  hora_inicio         timestamptz,
  persona_atiende     varchar(120),
  observacion_general varchar(3000),
  fecha_finalizacion  timestamptz,
  motivo_anulacion    varchar(500),
  creado_en           timestamptz       NOT NULL DEFAULT now(),
  modificado_en       timestamptz       NOT NULL DEFAULT now(),
  CHECK (estado <> 'ANULADA'    OR motivo_anulacion IS NOT NULL),
  CHECK (estado <> 'FINALIZADA' OR (fecha_finalizacion IS NOT NULL AND persona_atiende IS NOT NULL AND tramo IS NOT NULL))
);
-- una sola evaluación abierta por finca y especie (RN-97)
CREATE UNIQUE INDEX ux_evaluacion_abierta ON evaluacion (finca_especie_id) WHERE estado IN ('PROGRAMADA', 'EN_PROCESO');
CREATE INDEX ix_evaluacion_inspector ON evaluacion (inspector_id, estado);
CREATE TRIGGER tg_evaluacion_mod BEFORE UPDATE ON evaluacion FOR EACH ROW EXECUTE FUNCTION fn_modificado_en();

CREATE TABLE transicion_estado (                -- «historial» (RN-150)
  id            serial            PRIMARY KEY,
  evaluacion_id int               NOT NULL REFERENCES evaluacion,
  estado_de     estado_evaluacion,
  estado_a      estado_evaluacion NOT NULL,
  fecha         timestamptz       NOT NULL DEFAULT now(),
  usuario_id    int               REFERENCES usuario,
  motivo        varchar(500)
);
CREATE TRIGGER tg_transicion_inmutable BEFORE UPDATE OR DELETE ON transicion_estado
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

-- Transiciones permitidas (RN-149) y registro automático (RN-150)
CREATE FUNCTION fn_estado_evaluacion() RETURNS trigger LANGUAGE plpgsql AS $$
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
    IF NOT ((OLD.estado = 'PROGRAMADA' AND NEW.estado IN ('EN_PROCESO', 'ANULADA'))
         OR (OLD.estado = 'EN_PROCESO' AND NEW.estado IN ('FINALIZADA', 'ANULADA'))) THEN
      RAISE EXCEPTION 'Transición no permitida: % → %', OLD.estado, NEW.estado;
    END IF;
    INSERT INTO transicion_estado (evaluacion_id, estado_de, estado_a, usuario_id, motivo)
    VALUES (NEW.id, OLD.estado, NEW.estado, NEW.inspector_id, NEW.motivo_anulacion);
  ELSIF OLD.estado IN ('FINALIZADA', 'ANULADA')
        AND (NEW.finca_especie_id, NEW.version_id, NEW.fecha_visita, NEW.tramo, NEW.pesos)
            IS DISTINCT FROM (OLD.finca_especie_id, OLD.version_id, OLD.fecha_visita, OLD.tramo, OLD.pesos) THEN
    RAISE EXCEPTION 'La evaluación % está % y no se modifica', OLD.codigo, OLD.estado;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tg_evaluacion_estado_ins AFTER INSERT ON evaluacion FOR EACH ROW EXECUTE FUNCTION fn_estado_evaluacion();
CREATE TRIGGER tg_evaluacion_estado_upd BEFORE UPDATE ON evaluacion FOR EACH ROW EXECUTE FUNCTION fn_estado_evaluacion();

-- Solo se elimina una evaluación PROGRAMADA (RN-100, RN-131)
CREATE FUNCTION fn_evaluacion_eliminar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado <> 'PROGRAMADA' THEN
    RAISE EXCEPTION 'La evaluación % está % y no se puede eliminar; anúlela con motivo', OLD.codigo, OLD.estado;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER tg_evaluacion_eliminar BEFORE DELETE ON evaluacion FOR EACH ROW EXECUTE FUNCTION fn_evaluacion_eliminar();

CREATE TABLE seccion_evaluacion (
  id            serial         PRIMARY KEY,
  evaluacion_id int            NOT NULL REFERENCES evaluacion ON DELETE CASCADE,
  fase          fase_visita    NOT NULL,
  orden         smallint       NOT NULL,
  estado        estado_seccion NOT NULL DEFAULT 'SIN_INICIAR',
  UNIQUE (evaluacion_id, fase)
);

CREATE TABLE guardado_parcial (                 -- «historial» (RN-108)
  id                    bigserial       PRIMARY KEY,
  evaluacion_id         int             NOT NULL REFERENCES evaluacion,
  fecha_hora_servidor   timestamptz     NOT NULL DEFAULT now(),
  fecha_hora_dispositivo timestamptz    NOT NULL,
  usuario_id            int             NOT NULL REFERENCES usuario,
  seccion               fase_visita     NOT NULL,
  avance                numeric(5,2)    NOT NULL CHECK (avance BETWEEN 0 AND 100),
  origen                origen_guardado NOT NULL
);
CREATE TRIGGER tg_guardado_inmutable BEFORE UPDATE OR DELETE ON guardado_parcial
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

CREATE TABLE plan_muestreo (                    -- 5.6, Tabla 3 (RN-105)
  evaluacion_id     int      PRIMARY KEY REFERENCES evaluacion ON DELETE CASCADE,
  con_corral        boolean  NOT NULL,
  corrales          smallint NOT NULL CHECK (corrales BETWEEN 0 AND 2),   -- galpones o corrales a inspeccionar
  puntos_por_corral smallint NOT NULL CHECK (puntos_por_corral BETWEEN 1 AND 5),
  tamano_muestra    smallint NOT NULL CHECK (tamano_muestra BETWEEN 2 AND 15),  -- < 199 aves: 5 · 199 o más: 10 · sin corral: 2 a 5 por punto
  CHECK (NOT con_corral OR (corrales, puntos_por_corral, tamano_muestra) IN ((1, 3, 5), (2, 5, 10))),
  justificacion     varchar(500)                    -- muestra incompleta (RN-111)
);

CREATE TABLE punto_muestreo (
  id             serial      PRIMARY KEY,
  evaluacion_id  int         NOT NULL REFERENCES plan_muestreo ON DELETE CASCADE,
  corral         smallint    NOT NULL DEFAULT 1,
  numero         smallint    NOT NULL,
  posicion       varchar(80),
  instalacion_id int         REFERENCES instalacion,
  UNIQUE (evaluacion_id, corral, numero)
);

CREATE TABLE unidad_muestreo (
  id       serial      PRIMARY KEY,
  punto_id int         NOT NULL REFERENCES punto_muestreo ON DELETE CASCADE,
  tipo     tipo_unidad NOT NULL,
  numero   smallint    NOT NULL,
  UNIQUE (punto_id, tipo, numero)
);

CREATE TABLE indicador_evaluado (
  id                int              PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  evaluacion_id     int              NOT NULL REFERENCES evaluacion ON DELETE CASCADE,
  indicador_id      int              NOT NULL REFERENCES indicador,
  aplica            boolean          NOT NULL DEFAULT true,
  motivo_no_aplica  varchar(300),
  no_aplica_manual  boolean          NOT NULL DEFAULT false,
  puntaje           numeric(5,2)     CHECK (puntaje BETWEEN 0 AND 100),   -- lo calcula la regla
  estado            estado_indicador NOT NULL DEFAULT 'PENDIENTE',
  UNIQUE (evaluacion_id, indicador_id),
  CHECK (aplica OR motivo_no_aplica IS NOT NULL),
  CHECK (estado <> 'CALIFICADO' OR puntaje IS NOT NULL)
);

CREATE TABLE respuesta (
  id                    bigserial    PRIMARY KEY,
  indicador_evaluado_id int          NOT NULL REFERENCES indicador_evaluado ON DELETE CASCADE,
  pregunta_id           int          NOT NULL REFERENCES pregunta,
  unidad_id             int          REFERENCES unidad_muestreo,
  valor                 varchar(200) NOT NULL,
  puntaje_unidad        smallint     CHECK (puntaje_unidad IN (100, 55, 20, 0)),
  registrada_en         timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_respuesta ON respuesta (indicador_evaluado_id, pregunta_id, COALESCE(unidad_id, 0));

CREATE TABLE observacion (                      -- RF18
  id                    serial            PRIMARY KEY,
  evaluacion_id         int               NOT NULL REFERENCES evaluacion,
  indicador_evaluado_id int               REFERENCES indicador_evaluado,
  pregunta_id           int               REFERENCES pregunta,
  nivel                 nivel_observacion NOT NULL,
  tipo                  tipo_observacion  NOT NULL DEFAULT 'HALLAZGO',
  texto                 varchar(3000)     NOT NULL,
  autor_id              int               NOT NULL REFERENCES usuario,
  fecha                 timestamptz       NOT NULL DEFAULT now(),
  adenda_de             int               REFERENCES observacion,
  CHECK (nivel <> 'INDICADOR' OR indicador_evaluado_id IS NOT NULL),
  CHECK (nivel <> 'PREGUNTA'  OR pregunta_id IS NOT NULL),
  CHECK (nivel = 'GENERAL' OR char_length(texto) <= 1000)
);

CREATE TABLE evidencia (                        -- RF19
  id                    serial        PRIMARY KEY,
  evaluacion_id         int           NOT NULL REFERENCES evaluacion,
  indicador_evaluado_id int           REFERENCES indicador_evaluado,
  respuesta_id          bigint        REFERENCES respuesta,
  tipo                  tipo_archivo  NOT NULL,
  url                   varchar(500)  NOT NULL,
  tamano_mb             numeric(6,2)  NOT NULL CHECK (tamano_mb > 0),
  duracion_seg          smallint      CHECK (duracion_seg <= 60),
  fecha_captura         timestamptz   NOT NULL,
  latitud               numeric(9,6),
  longitud              numeric(9,6),
  hash_sha256           char(64)      NOT NULL,
  autor_id              int           NOT NULL REFERENCES usuario,
  CHECK ((tipo = 'FOTO'  AND tamano_mb <= 10)
      OR (tipo = 'PDF'   AND tamano_mb <= 20)
      OR (tipo = 'VIDEO' AND tamano_mb <= 50 AND duracion_seg IS NOT NULL))
);

CREATE TABLE documento_soporte (                -- hereda de evidencia (1:1) · Fase III
  evidencia_id       int              PRIMARY KEY REFERENCES evidencia,
  estado             estado_documento NOT NULL DEFAULT 'APORTADO',
  legible            boolean,
  sin_correcciones   boolean,
  firmado            boolean,
  contenido_completo boolean,
  matricula_vigente  boolean,                       -- solo si lo firma MV, MVZ o Z
  fecha_limite       timestamptz,                   -- 1 día hábil tras el cierre
  CHECK (estado <> 'VALIDO' OR (legible AND sin_correcciones AND firmado AND contenido_completo AND matricula_vigente IS NOT FALSE)),
  CHECK (estado <> 'PENDIENTE' OR fecha_limite IS NOT NULL)
);

CREATE TABLE resultado_evaluacion (             -- «historial»: recálculo = versión nueva (RN-123)
  id            serial             PRIMARY KEY,
  evaluacion_id int                NOT NULL REFERENCES evaluacion,
  version       smallint           NOT NULL DEFAULT 1,
  puntaje_total numeric(4,1)       NOT NULL CHECK (puntaje_total BETWEEN 0 AND 100),
  nivel         nivel_bienestar    NOT NULL,
  caracter      caracter_resultado NOT NULL,
  calculado_en  timestamptz        NOT NULL DEFAULT now(),
  traza         jsonb              NOT NULL,
  UNIQUE (evaluacion_id, version)
);
CREATE TRIGGER tg_resultado_inmutable BEFORE UPDATE OR DELETE ON resultado_evaluacion
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

CREATE TABLE resultado_dimension (
  id                     serial        PRIMARY KEY,
  resultado_id           int           NOT NULL REFERENCES resultado_evaluacion,
  dimension              grupo_medidas NOT NULL,
  puntaje                numeric(5,2)  NOT NULL CHECK (puntaje BETWEEN 0 AND 100),
  peso                   numeric(4,3)  NOT NULL,
  aporte                 numeric(5,2)  NOT NULL,
  indicadores_aplicados  smallint      NOT NULL,
  UNIQUE (resultado_id, dimension)
);

CREATE TABLE diagnostico (
  id           serial      PRIMARY KEY,
  resultado_id int         NOT NULL UNIQUE REFERENCES resultado_evaluacion,
  generado_en  timestamptz NOT NULL DEFAULT now(),
  resumen      text        NOT NULL
);

CREATE TABLE item_diagnostico (                 -- RN-126
  id                    serial       PRIMARY KEY,
  diagnostico_id        int          NOT NULL REFERENCES diagnostico,
  tipo                  tipo_item    NOT NULL,
  indicador_evaluado_id int          NOT NULL REFERENCES indicador_evaluado,
  texto                 text         NOT NULL,
  puntaje               numeric(5,2) NOT NULL,
  CHECK ((tipo = 'FORTALEZA' AND puntaje = 100)
      OR (tipo = 'OPORTUNIDAD' AND puntaje > 0 AND puntaje < 100)
      OR (tipo = 'INCUMPLIMIENTO' AND puntaje = 0))
);

CREATE TABLE hallazgo (                         -- HallazgoCritico: indicador en 0 (RN-128 a RN-130)
  id                    serial        PRIMARY KEY,
  diagnostico_id        int           NOT NULL REFERENCES diagnostico,
  indicador_evaluado_id int           NOT NULL REFERENCES indicador_evaluado,
  medida                grupo_medidas NOT NULL,
  peso_medida           numeric(4,3)  NOT NULL,
  observacion_id        int           REFERENCES observacion,
  UNIQUE (diagnostico_id, indicador_evaluado_id)
);

-- =============================================================================
-- 8. SEGUIMIENTO, REPORTES Y CONTROL (Vista 6 · RF27 a RF36, RF40)
-- =============================================================================
CREATE TABLE plan_mejora (                      -- RF27
  id            serial      PRIMARY KEY,
  evaluacion_id int         NOT NULL UNIQUE REFERENCES evaluacion,
  fecha_acuerdo date        NOT NULL,
  estado        estado_plan NOT NULL DEFAULT 'ABIERTO',
  cerrado_por_evaluacion int REFERENCES evaluacion,
  CHECK (estado = 'ABIERTO' OR cerrado_por_evaluacion IS NOT NULL)
);

CREATE TABLE accion_mejora (
  id                    serial        PRIMARY KEY,
  plan_id               int           NOT NULL REFERENCES plan_mejora,
  indicador_evaluado_id int           NOT NULL REFERENCES indicador_evaluado,
  accion                varchar(300)  NOT NULL,
  responsable           varchar(80)   NOT NULL,
  plazo                 date          NOT NULL,
  prioridad             prioridad     NOT NULL,
  estado                estado_accion NOT NULL DEFAULT 'PENDIENTE',
  seguimiento           varchar(500),
  UNIQUE (plan_id, indicador_evaluado_id),
  CHECK (estado <> 'NO_CUMPLIDA' OR seguimiento IS NOT NULL)
);

CREATE TABLE notificacion (                     -- RF40 (avisos enviados; los pendientes se calculan en v_pendientes)
  id          bigserial         PRIMARY KEY,
  usuario_id  int               NOT NULL REFERENCES usuario,
  tipo        tipo_notificacion NOT NULL,
  mensaje     varchar(300)      NOT NULL,
  enlace      varchar(200)      NOT NULL,
  vence       timestamptz,
  canal       canal             NOT NULL DEFAULT 'PLATAFORMA',
  leida       boolean           NOT NULL DEFAULT false,
  creada_en   timestamptz       NOT NULL DEFAULT now(),
  resuelta_en timestamptz
);
CREATE INDEX ix_notificacion_usuario ON notificacion (usuario_id) WHERE resuelta_en IS NULL;

CREATE TABLE reporte (                          -- «historial» RF31, RF32 (RN-143)
  id                   bigserial    PRIMARY KEY,
  tipo                 tipo_reporte NOT NULL,
  evaluacion_id        int          REFERENCES evaluacion,
  version_resultado    smallint,
  filtro               jsonb,
  generado_por         int          NOT NULL REFERENCES usuario,
  fecha                timestamptz  NOT NULL DEFAULT now(),
  sin_datos_personales boolean      NOT NULL DEFAULT true,
  CHECK (tipo <> 'PDF_RESULTADO' OR evaluacion_id IS NOT NULL),
  CHECK (tipo <> 'CSV_RESULTADOS' OR sin_datos_personales)          -- RN-144
);
CREATE TRIGGER tg_reporte_inmutable BEFORE UPDATE OR DELETE ON reporte
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

-- =============================================================================
-- 9. FUNCIONES Y VISTAS DE NEGOCIO
-- =============================================================================

-- Clasificación con la Tabla 2 de la versión (RN-91, RN-122)
CREATE FUNCTION fn_clasificar(p_version smallint, p_puntaje numeric) RETURNS nivel_bienestar
LANGUAGE sql STABLE AS $$
  SELECT nivel FROM rango_clasificacion
   WHERE version_id = p_version
     AND round(p_puntaje, 1) >= minimo
     AND (maximo IS NULL OR round(p_puntaje, 1) < maximo)
   LIMIT 1
$$;

-- Población por finca (último corte de cada especie vigente) y tramo (RN-69)
CREATE VIEW v_poblacion_finca AS
WITH ultimo AS (
  SELECT DISTINCT ON (ic.finca_especie_id) ic.finca_especie_id, ic.id AS corte_id
    FROM inventario_corte ic
   ORDER BY ic.finca_especie_id, ic.fecha_corte DESC, ic.id DESC
)
SELECT f.id AS finca_id, f.codigo, f.nombre,
       COALESCE(sum(d.cantidad), 0)::int AS poblacion_total,
       CASE WHEN COALESCE(sum(d.cantidad), 0) >= 200 THEN 'COMERCIAL'::tramo ELSE 'TRASPATIO'::tramo END AS tramo
  FROM finca f
  LEFT JOIN finca_especie fe ON fe.finca_id = f.id AND fe.fecha_fin IS NULL
  LEFT JOIN ultimo u          ON u.finca_especie_id = fe.id
  LEFT JOIN detalle_inventario d ON d.corte_id = u.corte_id
 GROUP BY f.id;

-- Pendientes de cada inspector: alimentan el botón de notificaciones (RN-151)
CREATE VIEW v_pendientes AS
SELECT e.inspector_id AS usuario_id, 'VISITA_PROGRAMADA'::tipo_notificacion AS tipo,
       'Visita programada · ' || f.nombre AS mensaje, '#/eval/' || e.codigo AS enlace, e.fecha_visita AS vence
  FROM evaluacion e JOIN finca_especie fe ON fe.id = e.finca_especie_id JOIN finca f ON f.id = fe.finca_id
 WHERE e.estado = 'PROGRAMADA'
UNION ALL
SELECT e.inspector_id, 'EVALUACION_EN_PROCESO', 'Completar evaluación ' || e.codigo, '#/eval/' || e.codigo, NULL
  FROM evaluacion e WHERE e.estado = 'EN_PROCESO'
UNION ALL
SELECT e.inspector_id, 'OBSERVACION_FALTANTE', 'Observación del hallazgo ' || i.numeral || ' ' || i.nombre,
       '#/eval/' || e.codigo || '/' || i.codigo, NULL
  FROM indicador_evaluado ie
  JOIN evaluacion e ON e.id = ie.evaluacion_id AND e.estado = 'EN_PROCESO'
  JOIN indicador i  ON i.id = ie.indicador_id
  JOIN criterio c   ON c.id = i.criterio_id
  JOIN dimension d  ON d.id = c.dimension_id AND d.codigo = 'MBA'
 WHERE ie.puntaje = 0
   AND NOT EXISTS (SELECT 1 FROM observacion o WHERE o.indicador_evaluado_id = ie.id)
UNION ALL
SELECT e.inspector_id, 'DOCUMENTO_PENDIENTE', 'Documento pendiente: ' || i.nombre,
       '#/eval/' || e.codigo || '/' || i.codigo, ds.fecha_limite
  FROM documento_soporte ds
  JOIN evidencia ev         ON ev.id = ds.evidencia_id
  JOIN evaluacion e         ON e.id = ev.evaluacion_id
  JOIN indicador_evaluado ie ON ie.id = ev.indicador_evaluado_id
  JOIN indicador i          ON i.id = ie.indicador_id
 WHERE ds.estado = 'PENDIENTE' AND ds.fecha_limite >= now();

-- Resultado vigente de cada evaluación (última versión) para tablero y reportes (RF28, RF30)
CREATE VIEW v_resultado_vigente AS
SELECT DISTINCT ON (r.evaluacion_id)
       e.codigo AS evaluacion, f.codigo AS finca, es.nombre AS especie, e.tramo, e.estado,
       r.version, r.puntaje_total, r.nivel, r.caracter, r.calculado_en
  FROM resultado_evaluacion r
  JOIN evaluacion e     ON e.id = r.evaluacion_id
  JOIN finca_especie fe ON fe.id = e.finca_especie_id
  JOIN finca f          ON f.id = fe.finca_id
  JOIN especie es       ON es.id = fe.especie_id
 ORDER BY r.evaluacion_id, r.version DESC;

-- Exportación sin datos personales (RN-144)
CREATE VIEW v_exportacion_resultados AS
SELECT v.evaluacion, v.especie, v.tramo,
       max(rd.puntaje) FILTER (WHERE rd.dimension = 'MBR') AS recursos,
       max(rd.puntaje) FILTER (WHERE rd.dimension = 'MBA') AS animal,
       max(rd.puntaje) FILTER (WHERE rd.dimension = 'MBG') AS gestion,
       v.puntaje_total AS total, v.nivel
  FROM v_resultado_vigente v
  JOIN evaluacion e ON e.codigo = v.evaluacion
  JOIN resultado_evaluacion r ON r.evaluacion_id = e.id AND r.version = v.version
  JOIN resultado_dimension rd ON rd.resultado_id = r.id
 WHERE v.estado = 'FINALIZADA'
 GROUP BY v.evaluacion, v.especie, v.tramo, v.puntaje_total, v.nivel;

-- Cálculo del resultado (RF20 a RF23): promedio de indicadores aplicables por medida,
-- total ponderado con la Tabla 1 del tramo, clasificación con la Tabla 2, diagnóstico
-- (fortalezas, oportunidades, incumplimientos) y hallazgos (indicadores en 0).
-- Cada llamada crea una versión nueva del resultado; las anteriores se conservan (RN-123).
CREATE FUNCTION fn_calcular_resultado(p_evaluacion int, p_caracter caracter_resultado)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  e        evaluacion%ROWTYPE;
  v_total  numeric := 0;
  v_res    int;
  v_diag   int;
  v_ver    smallint;
  r        record;
BEGIN
  SELECT * INTO e FROM evaluacion WHERE id = p_evaluacion;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe la evaluación %', p_evaluacion; END IF;

  CREATE TEMP TABLE _dim ON COMMIT DROP AS
  SELECT d.codigo AS dimension,
         avg(ie.puntaje)                                  AS puntaje,
         COALESCE((e.pesos ->> d.codigo::text)::numeric, pt.peso) AS peso,
         count(*)                                         AS n
    FROM indicador_evaluado ie
    JOIN indicador i  ON i.id = ie.indicador_id
    JOIN criterio c   ON c.id = i.criterio_id
    JOIN dimension d  ON d.id = c.dimension_id
    JOIN ponderacion_tramo pt ON pt.dimension_id = d.id AND pt.tramo = e.tramo
   WHERE ie.evaluacion_id = e.id AND ie.aplica AND ie.puntaje IS NOT NULL
   GROUP BY d.codigo, pt.peso
  HAVING COALESCE((e.pesos ->> d.codigo::text)::numeric, pt.peso) > 0;

  SELECT round(sum(puntaje * peso), 1) INTO v_total FROM _dim;
  SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM resultado_evaluacion WHERE evaluacion_id = e.id;

  INSERT INTO resultado_evaluacion (evaluacion_id, version, puntaje_total, nivel, caracter, traza)
  VALUES (e.id, v_ver, v_total, fn_clasificar(e.version_id, v_total), p_caracter,
          jsonb_build_object('tramo', e.tramo, 'pesos', e.pesos,
                             'dimensiones', (SELECT jsonb_agg(to_jsonb(_dim)) FROM _dim)))
  RETURNING id INTO v_res;

  INSERT INTO resultado_dimension (resultado_id, dimension, puntaje, peso, aporte, indicadores_aplicados)
  SELECT v_res, dimension, round(puntaje, 2), peso, round(puntaje * peso, 2), n FROM _dim;

  INSERT INTO diagnostico (resultado_id, resumen)
  VALUES (v_res, format('Puntaje %s · nivel %s (%s)', v_total, fn_clasificar(e.version_id, v_total), lower(p_caracter::text)))
  RETURNING id INTO v_diag;

  FOR r IN
    SELECT ie.id, ie.puntaje, d.codigo AS medida, pt.peso,
           CASE WHEN ie.puntaje = 100 THEN 'FORTALEZA' WHEN ie.puntaje = 0 THEN 'INCUMPLIMIENTO' ELSE 'OPORTUNIDAD' END::tipo_item AS tipo,
           pd.texto
      FROM indicador_evaluado ie
      JOIN indicador i  ON i.id = ie.indicador_id
      JOIN criterio c   ON c.id = i.criterio_id
      JOIN dimension d  ON d.id = c.dimension_id
      JOIN ponderacion_tramo pt ON pt.dimension_id = d.id AND pt.tramo = e.tramo
      LEFT JOIN plantilla_diagnostico pd ON pd.indicador_id = i.id
           AND pd.tipo = CASE WHEN ie.puntaje = 100 THEN 'FORTALEZA' WHEN ie.puntaje = 0 THEN 'INCUMPLIMIENTO' ELSE 'OPORTUNIDAD' END::tipo_item
     WHERE ie.evaluacion_id = e.id AND ie.aplica AND ie.puntaje IS NOT NULL AND pt.peso > 0
  LOOP
    INSERT INTO item_diagnostico (diagnostico_id, tipo, indicador_evaluado_id, texto, puntaje)
    VALUES (v_diag, r.tipo, r.id, COALESCE(r.texto, '—'), r.puntaje);
    IF r.puntaje = 0 THEN
      INSERT INTO hallazgo (diagnostico_id, indicador_evaluado_id, medida, peso_medida, observacion_id)
      VALUES (v_diag, r.id, r.medida, r.peso,
              (SELECT o.id FROM observacion o WHERE o.indicador_evaluado_id = r.id ORDER BY o.fecha LIMIT 1));
    END IF;
  END LOOP;
  RETURN v_res;
END $$;

-- Hallazgos ordenados por el peso de su medida (RN-129) y observación exigida en MBA (RN-130)
CREATE VIEW v_hallazgos AS
SELECT e.codigo AS evaluacion, r.version, i.numeral, i.nombre AS indicador, h.medida, h.peso_medida,
       (h.medida = 'MBA') AS requiere_observacion, o.texto AS observacion
  FROM hallazgo h
  JOIN diagnostico dg          ON dg.id = h.diagnostico_id
  JOIN resultado_evaluacion r  ON r.id = dg.resultado_id
  JOIN evaluacion e            ON e.id = r.evaluacion_id
  JOIN indicador_evaluado ie   ON ie.id = h.indicador_evaluado_id
  JOIN indicador i             ON i.id = ie.indicador_id
  LEFT JOIN observacion o      ON o.id = h.observacion_id
 ORDER BY e.codigo, r.version, h.peso_medida DESC, i.numeral;
