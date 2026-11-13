-- =====================================================================================
-- EBA Cuac Cuac · MariaDB · Migración 004: ingreso real (módulo 1)
--   · usuario: contraseña cifrada (scrypt), activación por enlace, bloqueo por intentos y último ingreso.
--   · sesion: sesiones abiertas (el navegador guarda un identificador aleatorio en una cookie; aquí solo su hash).
--   · codigo_verificacion: código de 6 dígitos del segundo paso (vence en 10 minutos, máximo 5 intentos).
--   · enlace_cuenta: enlaces de un solo uso para activar la cuenta (48 horas) o restablecer la contraseña (30 minutos).
-- Las contraseñas, los códigos y los enlaces se guardan cifrados (hash): nunca en texto plano.
-- El administrador crea las cuentas sin contraseña: cada persona crea la suya con el enlace que le llega al correo.
-- =====================================================================================

ALTER TABLE usuario
  ADD COLUMN clave_hash         VARCHAR(200)     NULL,
  ADD COLUMN activado_en        DATETIME         NULL,
  ADD COLUMN enlace_enviado_en  DATETIME         NULL,
  ADD COLUMN enlace_vence       DATETIME         NULL,
  ADD COLUMN intentos_fallidos  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN bloqueado_hasta    DATETIME         NULL,
  ADD COLUMN ultimo_ingreso     DATETIME         NULL;

CREATE TABLE sesion (
  id                CHAR(64)     NOT NULL PRIMARY KEY,
  usuario           VARCHAR(40)  NOT NULL,
  creada_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_actividad  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en         DATETIME     NOT NULL,
  ip                VARCHAR(45)  NULL,
  navegador         VARCHAR(200) NULL,
  cerrada_en        DATETIME     NULL,
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario) REFERENCES usuario (clave) ON UPDATE CASCADE ON DELETE CASCADE,
  KEY ix_sesion_usuario (usuario, cerrada_en)
) ENGINE=InnoDB;

CREATE TABLE codigo_verificacion (
  desafio      CHAR(64)         NOT NULL PRIMARY KEY,
  usuario      VARCHAR(40)      NOT NULL,
  codigo_hash  CHAR(64)         NOT NULL,
  creado_en    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en    DATETIME         NOT NULL,
  intentos     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  reenvios     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  usado_en     DATETIME         NULL,
  CONSTRAINT fk_codigo_usuario FOREIGN KEY (usuario) REFERENCES usuario (clave) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE enlace_cuenta (
  token_hash  CHAR(64)     NOT NULL PRIMARY KEY,
  usuario     VARCHAR(40)  NOT NULL,
  tipo        VARCHAR(12)  NOT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en   DATETIME     NOT NULL,
  usado_en    DATETIME     NULL,
  CONSTRAINT fk_enlace_usuario FOREIGN KEY (usuario) REFERENCES usuario (clave) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT ck_enlace_tipo CHECK (tipo IN ('activacion', 'recuperacion')),
  KEY ix_enlace_usuario (usuario, tipo)
) ENGINE=InnoDB;

-- Estado de cada cuenta tal como lo ve el administrador.
CREATE OR REPLACE VIEW v_cuentas AS
SELECT clave, nombre, perfil, correo, estado,
       CASE WHEN activado_en IS NOT NULL THEN 'Activa'
            WHEN enlace_enviado_en IS NULL THEN 'Sin enlace'
            WHEN enlace_vence < NOW() THEN 'Enlace vencido'
            ELSE 'Pendiente de activación' END AS activacion,
       bloqueado_hasta > NOW() AS bloqueada, ultimo_ingreso
FROM usuario;
