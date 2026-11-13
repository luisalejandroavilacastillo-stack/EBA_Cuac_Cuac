# Base de datos de la plataforma 1.0 · MariaDB 11.8

Diccionario generado desde la base instalada con `base_de_datos/herramientas/documentar_mariadb.py`. La API crea y actualiza estas tablas sola al arrancar, con las migraciones de `plataforma/apps/api/bd/migraciones/` (cada una se aplica una sola vez y queda en la tabla `esquema_version`).

Diagrama entidad-relación: [SVG](er_mariadb.svg) · [PNG](er_mariadb.png)

## Cómo guarda los datos la plataforma

- **Fincas, visitas (evaluacion), procesos, usuarios y avisos** guardan el registro completo en la columna `datos` (JSON, el mismo formato del prototipo v0.25 y de `@eba/norma`) y una columna `version` que sube con cada cambio: si dos personas cambian el mismo registro, la segunda recibe un conflicto (409) y se le carga la versión de la base.
- Las columnas sueltas (estado, finca, inspector, fechas…) se llenan desde `datos` para filtrar y ordenar sin leer el JSON.
- **Ingreso real** (migración 004): contraseñas cifradas con scrypt (`usuario.clave_hash`); códigos, enlaces y sesiones se guardan solo como huella SHA-256.
- La **bitácora** no se edita ni se borra; el usuario y la hora los pone el servidor.

## Migraciones aplicadas

| Migración | Aplicada |
|---|---|
| `001_registro_fincas.sql` | 2026-11-13 03:48:13 |
| `002_prototipo_conectado.sql` | 2026-11-13 03:48:13 |
| `003_perfiles_v0_25.sql` | 2026-11-13 03:48:23 |
| `004_ingreso_real.sql` | 2026-11-13 03:48:23 |

## Tablas

| Tabla | Tipo | Descripción |
|---|---|---|
| [`aviso`](#aviso) | Tabla | Avisos dentro de la aplicación (asignación, devolución, por aprobar, certificación…), dirigidos a un usuario o a un perfil. |
| [`bitacora`](#bitacora) | Tabla | Registro de acciones; no se edita ni se borra. Usuario y hora los pone el servidor. |
| [`codigo_verificacion`](#codigo_verificacion) | Tabla | Código de 6 dígitos del ingreso (solo la huella), con vencimiento de 10 minutos, intentos y reenvíos. |
| [`consecutivo`](#consecutivo) | Tabla | Consecutivos por año (fincas, visitas, constancias). |
| [`constancia`](#constancia) | Tabla | Constancias de cumplimiento emitidas al aprobar una visita que cumple (código, verificación y vigencia). |
| [`departamento`](#departamento) | Tabla | Catálogo de departamentos (DIVIPOLA) para el registro de fincas. |
| [`enlace_cuenta`](#enlace_cuenta) | Tabla | Enlaces de un solo uso para activar la cuenta (48 h) o restablecer la contraseña (30 min); solo la huella. |
| [`especie`](#especie) | Tabla | Catálogo de especies: pato y ganso. |
| [`esquema_version`](#esquema_version) | Tabla | Migraciones aplicadas por la API al arrancar. |
| [`evaluacion`](#evaluacion) | Tabla | Visitas de inspección: documento JSON completo (respuestas, recorrido, plan de mejora, firmas, revisión) y versión. |
| [`finca`](#finca) | Tabla | Fincas o unidades productivas: documento JSON (especies, inventario, persona responsable) y versión. |
| [`finca_especie`](#finca_especie) | Tabla | Especies de cada finca con su propósito, sistema y número de aves (para consultas). |
| [`persona_responsable`](#persona_responsable) | Tabla | Persona responsable (titular) de la finca. |
| [`proceso`](#proceso) | Tabla | Procesos de seguimiento (visita inicial y seguimientos; ampliación a 5). |
| [`reprogramacion`](#reprogramacion) | Tabla | Historial de reprogramaciones de visitas con su motivo. |
| [`revision_evaluacion`](#revision_evaluacion) | Tabla | Historial de revisión del coordinador: enviada, reenviada, devuelta y aprobada. |
| [`sesion`](#sesion) | Tabla | Sesiones abiertas (solo la huella del token de la cookie), con última actividad y vencimiento. |
| [`usuario`](#usuario) | Tabla | Cuentas con perfil: datos en JSON, contraseña cifrada (scrypt), activación, intentos y bloqueo. |
| [`v_bandeja_coordinador`](#v_bandeja_coordinador) | Vista | Vista: visitas por aprobar y por asignar del coordinador. |
| [`v_constancias`](#v_constancias) | Vista | Vista: constancias con su finca, especie y vigencia. |
| [`v_cuentas`](#v_cuentas) | Vista | Vista: estado de acceso de cada cuenta (Activa, Pendiente de activación, Enlace vencido, Sin enlace) y bloqueo. |

### aviso

Avisos dentro de la aplicación (asignación, devolución, por aprobar, certificación…), dirigidos a un usuario o a un perfil.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | varchar(30) | No | PRI |  |  |  |
| `para` | varchar(40) | No | MUL |  |  |  |
| `tipo` | varchar(20) | Sí |  | NULL |  |  |
| `texto` | varchar(400) | No |  |  |  |  |
| `enlace` | varchar(200) | Sí |  | NULL |  |  |
| `leido` | tinyint(1) | No |  | 0 |  |  |
| `creado_en` | datetime | No |  |  |  |  |
| `datos` | longtext | No |  |  |  |  |
| `version` | int(10) unsigned | No |  | 1 |  |  |

### bitacora

Registro de acciones; no se edita ni se borra. Usuario y hora los pone el servidor.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | bigint(20) unsigned | No | PRI |  |  |  |
| `fecha` | datetime | No | MUL | current_timestamp() |  |  |
| `usuario` | varchar(80) | No |  |  |  |  |
| `accion` | varchar(300) | No |  |  |  |  |
| `huella` | char(40) | Sí | UNI | NULL |  |  |
| `fecha_original` | varchar(30) | Sí |  | NULL |  |  |

### codigo_verificacion

Código de 6 dígitos del ingreso (solo la huella), con vencimiento de 10 minutos, intentos y reenvíos.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `desafio` | char(64) | No | PRI |  |  |  |
| `usuario` | varchar(40) | No | MUL |  | usuario.clave |  |
| `codigo_hash` | char(64) | No |  |  |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `expira_en` | datetime | No |  |  |  |  |
| `intentos` | tinyint(3) unsigned | No |  | 0 |  |  |
| `reenvios` | tinyint(3) unsigned | No |  | 0 |  |  |
| `usado_en` | datetime | Sí |  | NULL |  |  |

### consecutivo

Consecutivos por año (fincas, visitas, constancias).

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `tipo` | varchar(10) | No | PRI |  |  |  |
| `anio` | smallint(6) | No | PRI |  |  |  |
| `ultimo` | int(10) unsigned | No |  | 0 |  |  |

### constancia

Constancias de cumplimiento emitidas al aprobar una visita que cumple (código, verificación y vigencia).

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo` | char(14) | No | PRI |  |  |  |
| `verificacion` | char(9) | No | UNI |  |  |  |
| `evaluacion` | char(14) | No | UNI |  | evaluacion.codigo |  |
| `finca_codigo` | char(14) | No |  |  |  |  |
| `especie` | varchar(10) | No |  |  |  |  |
| `puntaje` | decimal(5,1) | Sí |  | NULL |  |  |
| `nivel` | varchar(20) | Sí |  | NULL |  |  |
| `emitida_en` | datetime | No |  |  |  |  |
| `vence` | date | No |  |  |  |  |
| `aprobada_por` | varchar(40) | Sí |  | NULL |  |  |

### departamento

Catálogo de departamentos (DIVIPOLA) para el registro de fincas.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo_dane` | char(2) | No | PRI |  |  |  |
| `nombre` | varchar(80) | No | UNI |  |  |  |

### enlace_cuenta

Enlaces de un solo uso para activar la cuenta (48 h) o restablecer la contraseña (30 min); solo la huella.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `token_hash` | char(64) | No | PRI |  |  |  |
| `usuario` | varchar(40) | No | MUL |  | usuario.clave |  |
| `tipo` | varchar(12) | No |  |  |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `expira_en` | datetime | No |  |  |  |  |
| `usado_en` | datetime | Sí |  | NULL |  |  |

### especie

Catálogo de especies: pato y ganso.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo` | varchar(10) | No | PRI |  |  |  |
| `nombre` | varchar(30) | No | UNI |  |  |  |
| `nombre_cientifico` | varchar(80) | No |  |  |  |  |

### esquema_version

Migraciones aplicadas por la API al arrancar.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `version` | varchar(100) | No | PRI |  |  |  |
| `aplicada` | datetime | No |  | current_timestamp() |  |  |

### evaluacion

Visitas de inspección: documento JSON completo (respuestas, recorrido, plan de mejora, firmas, revisión) y versión.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo` | char(14) | No | PRI |  |  |  |
| `finca_codigo` | char(14) | No | MUL |  | finca.codigo |  |
| `especie` | varchar(10) | No | MUL |  | especie.codigo |  |
| `estado` | varchar(30) | No | MUL |  |  |  |
| `fecha` | date | Sí |  | NULL |  |  |
| `inspector` | varchar(30) | Sí | MUL | NULL |  |  |
| `asignado_por` | varchar(40) | Sí |  | NULL |  |  |
| `asignado_en` | datetime | Sí |  | NULL |  |  |
| `enviada_en` | datetime | Sí |  | NULL |  |  |
| `aprobada_por` | varchar(40) | Sí |  | NULL |  |  |
| `aprobada_en` | datetime | Sí |  | NULL |  |  |
| `proceso` | varchar(14) | Sí | MUL | NULL |  |  |
| `visita` | tinyint(3) unsigned | No |  | 0 |  |  |
| `datos` | longtext | No |  |  |  |  |
| `version` | int(10) unsigned | No |  | 1 |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_por` | varchar(80) | Sí |  | NULL |  |  |

### finca

Fincas o unidades productivas: documento JSON (especies, inventario, persona responsable) y versión.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | int(10) unsigned | No | PRI |  |  |  |
| `codigo` | char(14) | No | UNI |  |  |  |
| `nombre` | varchar(120) | No | MUL |  |  |  |
| `departamento` | char(2) | No | MUL |  | departamento.codigo_dane |  |
| `municipio` | varchar(80) | No |  |  |  |  |
| `vereda` | varchar(80) | Sí |  | NULL |  |  |
| `persona_id` | int(10) unsigned | Sí | MUL | NULL | persona_responsable.id |  |
| `estado` | enum('ACTIVA','INACTIVA') | No |  | 'ACTIVA' |  |  |
| `motivo_estado` | varchar(300) | Sí |  | NULL |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_en` | datetime | No |  | current_timestamp() |  |  |
| `datos` | longtext | Sí |  | NULL |  |  |
| `version` | int(10) unsigned | No |  | 1 |  |  |
| `modificado_por` | varchar(80) | Sí |  | NULL |  |  |

### finca_especie

Especies de cada finca con su propósito, sistema y número de aves (para consultas).

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `finca_id` | int(10) unsigned | No | PRI |  | finca.id |  |
| `especie` | varchar(10) | No | PRI |  | especie.codigo |  |
| `numero_aves` | int(10) unsigned | No |  |  |  |  |
| `proposito` | varchar(40) | No |  | 'Carne' |  |  |
| `sistema` | varchar(30) | Sí |  | NULL |  |  |
| `con_corral` | tinyint(1) | No |  | 1 |  |  |
| `permanencia_corral` | tinyint(1) | Sí |  | NULL |  |  |
| `con_cama` | tinyint(1) | Sí |  | NULL |  |  |

### persona_responsable

Persona responsable (titular) de la finca.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | int(10) unsigned | No | PRI |  |  |  |
| `nombre` | varchar(120) | No |  |  |  |  |
| `tipo_documento` | enum('CC','CE','NIT','PAS','PPT') | No | MUL |  |  |  |
| `numero_documento` | varchar(20) | No |  |  |  |  |
| `correo` | varchar(120) | Sí |  | NULL |  |  |
| `telefono` | varchar(10) | No |  |  |  |  |
| `autoriza_datos` | tinyint(1) | No |  |  |  |  |
| `fecha_autorizacion` | datetime | No |  | current_timestamp() |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_en` | datetime | No |  | current_timestamp() |  |  |

### proceso

Procesos de seguimiento (visita inicial y seguimientos; ampliación a 5).

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo` | varchar(14) | No | PRI |  |  |  |
| `datos` | longtext | No |  |  |  |  |
| `version` | int(10) unsigned | No |  | 1 |  |  |
| `modificado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_por` | varchar(80) | Sí |  | NULL |  |  |

### reprogramacion

Historial de reprogramaciones de visitas con su motivo.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | int(10) unsigned | No | PRI |  |  |  |
| `evaluacion` | char(14) | No | MUL |  | evaluacion.codigo |  |
| `fecha_anterior` | date | No |  |  |  |  |
| `fecha_nueva` | date | No |  |  |  |  |
| `motivo` | varchar(300) | No |  |  |  |  |
| `usuario` | varchar(40) | Sí |  | NULL |  |  |
| `registrada_en` | datetime | No |  |  |  |  |

### revision_evaluacion

Historial de revisión del coordinador: enviada, reenviada, devuelta y aprobada.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | int(10) unsigned | No | PRI |  |  |  |
| `evaluacion` | char(14) | No | MUL |  | evaluacion.codigo |  |
| `accion` | varchar(12) | No |  |  |  |  |
| `usuario` | varchar(40) | No |  |  |  |  |
| `fecha` | datetime | No |  |  |  |  |
| `observacion` | varchar(1000) | Sí |  | NULL |  |  |

### sesion

Sesiones abiertas (solo la huella del token de la cookie), con última actividad y vencimiento.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `id` | char(64) | No | PRI |  |  |  |
| `usuario` | varchar(40) | No | MUL |  | usuario.clave |  |
| `creada_en` | datetime | No |  | current_timestamp() |  |  |
| `ultima_actividad` | datetime | No |  | current_timestamp() |  |  |
| `expira_en` | datetime | No |  |  |  |  |
| `ip` | varchar(45) | Sí |  | NULL |  |  |
| `navegador` | varchar(200) | Sí |  | NULL |  |  |
| `cerrada_en` | datetime | Sí |  | NULL |  |  |

### usuario

Cuentas con perfil: datos en JSON, contraseña cifrada (scrypt), activación, intentos y bloqueo.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `clave` | varchar(40) | No | PRI |  |  |  |
| `nombre` | varchar(120) | No |  |  |  |  |
| `perfil` | varchar(20) | No |  |  |  |  |
| `tipo_documento` | varchar(5) | Sí | MUL | NULL |  |  |
| `documento` | varchar(20) | No |  |  |  |  |
| `correo` | varchar(120) | No | UNI |  |  |  |
| `telefono` | varchar(15) | Sí |  | NULL |  |  |
| `estado` | varchar(10) | No |  | 'Activo' |  |  |
| `datos` | longtext | No |  |  |  |  |
| `version` | int(10) unsigned | No |  | 1 |  |  |
| `creado_en` | datetime | No |  | current_timestamp() |  |  |
| `modificado_en` | datetime | No |  | current_timestamp() |  |  |
| `clave_hash` | varchar(200) | Sí |  | NULL |  |  |
| `activado_en` | datetime | Sí |  | NULL |  |  |
| `enlace_enviado_en` | datetime | Sí |  | NULL |  |  |
| `enlace_vence` | datetime | Sí |  | NULL |  |  |
| `intentos_fallidos` | tinyint(3) unsigned | No |  | 0 |  |  |
| `bloqueado_hasta` | datetime | Sí |  | NULL |  |  |
| `ultimo_ingreso` | datetime | Sí |  | NULL |  |  |

### v_bandeja_coordinador

Vista: visitas por aprobar y por asignar del coordinador.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `evaluacion` | char(14) | No |  |  |  |  |
| `finca` | varchar(120) | No |  |  |  |  |
| `especie` | varchar(10) | No |  |  |  |  |
| `estado` | varchar(30) | No |  |  |  |  |
| `fecha` | date | Sí |  | NULL |  |  |
| `inspector` | varchar(120) | Sí |  |  |  |  |
| `enviada_en` | datetime | Sí |  | NULL |  |  |

### v_constancias

Vista: constancias con su finca, especie y vigencia.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `codigo` | char(14) | No |  |  |  |  |
| `verificacion` | char(9) | No |  |  |  |  |
| `finca` | varchar(120) | No |  |  |  |  |
| `especie` | varchar(10) | No |  |  |  |  |
| `puntaje` | decimal(5,1) | Sí |  | NULL |  |  |
| `nivel` | varchar(20) | Sí |  | NULL |  |  |
| `emitida` | date | Sí |  | NULL |  |  |
| `vence` | date | No |  |  |  |  |
| `vigente` | int(1) | No |  | 0 |  |  |
| `aprobada_por` | varchar(120) | Sí |  |  |  |  |

### v_cuentas

Vista: estado de acceso de cada cuenta (Activa, Pendiente de activación, Enlace vencido, Sin enlace) y bloqueo.

| Columna | Tipo | Nulo | Clave | Por defecto | Referencia | Descripción |
|---|---|:-:|:-:|---|---|---|
| `clave` | varchar(40) | No |  |  |  |  |
| `nombre` | varchar(120) | No |  |  |  |  |
| `perfil` | varchar(20) | No |  |  |  |  |
| `correo` | varchar(120) | No |  |  |  |  |
| `estado` | varchar(10) | No |  | 'Activo' |  |  |
| `activacion` | varchar(23) | Sí |  | NULL |  |  |
| `bloqueada` | int(1) | Sí |  | NULL |  |  |
| `ultimo_ingreso` | datetime | Sí |  | NULL |  |  |
