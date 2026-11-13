# EBA Cuac Cuac · Plataforma

Plataforma para evaluar el bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024). Es la versión real del prototipo `EBA Cuac Cuac v0.25`: se toman de allí los casos de uso, los diagramas y las reglas de la norma.

| Parte | Tecnología | Carpeta |
|---|---|---|
| Frontend | Angular 22 (TypeScript) | [`apps/web`](apps/web) |
| Backend (API) | Node.js 24 + Express 5 (JavaScript), puerto **3085** | [`apps/api`](apps/api) |
| Reglas de la norma | Paquete compartido `@eba/norma` | [`packages/norma`](packages/norma) |
| Base de datos | MariaDB 11.8 (con Docker) | `docker-compose.yml` |
| Correo de prueba | Mailpit | `docker-compose.yml` |

**Qué se ve en Docker:**

| Dirección | Qué es |
|---|---|
| http://localhost:4200/plataforma/ | **La plataforma** (versión 1.0): ingreso real, inicio por perfil, fincas, asignación y revisión, **evaluación en campo** (apertura, recorrido de patos y gansos, indicadores, cierre), resultado y constancia, reportes, ayuda de la norma, asistente, bitácora, usuarios y parametrización. http://localhost:4200/ lleva aquí. |
| http://localhost:8025/ | Bandeja de correo de prueba (Mailpit): aquí llegan los códigos y enlaces en desarrollo. |

El prototipo v0.25 se retiró de la publicación: queda en [`apps/prototipo`](apps/prototipo) como referencia y para las pruebas que comparan la plataforma con él (la imagen web solo lo incluye si se construye con `CON_PROTOTIPO=si`).

**Primera vez con la base vacía:** con `DATOS_EJEMPLO=si` la API carga los datos de ejemplo al arrancar (usuarios, fincas y visitas de la demostración, archivo `apps/api/bd/semilla/datos_ejemplo.json`). Para empezar de cero: `docker compose down -v` (borra la base) y `docker compose up -d --build`.

**Trabajo sin señal (campo):** la plataforma queda guardada en el equipo (service worker) y abre aunque no haya conexión, con la última copia de los datos de quien ingresó. Lo que el inspector registra se guarda en el equipo y se envía solo al volver la señal. La copia se borra al cerrar la sesión.

**Privacidad por perfil:** la API entrega a cada perfil solo lo suyo: el productor, sus fincas (y de las visitas que el ICA aún no aprueba, solo el estado); el inspector, las fincas que tiene asignadas; correo, documento y teléfono de los usuarios, solo al administrador (y a cada persona, los suyos); la bitácora, solo al administrador.

**Perfiles (v0.25):** la API aplica los permisos de cada perfil: solo el coordinador aprueba o devuelve, el inspector solo modifica las visitas asignadas a él, el productor no modifica visitas y solo el administrador gestiona usuarios (respuesta 403).

## Ingreso real (módulo 1)

- **Cuentas:** solo el administrador las crea (Usuarios). No se asigna contraseña: la persona recibe en su correo un **enlace de un solo uso (48 horas)** y crea la suya. Mientras no la cree, su acceso aparece como «Pendiente de activación»; si el enlace vence, «Enlace vencido», y el administrador usa **Reenviar enlace**.
- **Ingreso:** correo + contraseña → código de 6 dígitos al correo (vence en 10 minutos) → sesión. La sesión vive en una cookie `HttpOnly` y se cierra tras **15 minutos sin uso** (un minuto antes pregunta si sigue ahí).
- **Contraseña:** mínimo 10 caracteres, con letras y números, y que no contenga el correo ni el documento. Se guarda cifrada (scrypt); nadie la puede ver, ni el administrador.
- **Bloqueo:** 5 contraseñas erradas bloquean la cuenta 15 minutos. **¿Olvidó su contraseña?** envía un enlace de 30 minutos (la respuesta es la misma exista o no el correo).
- **Primer administrador:** si no hay ninguno con la cuenta activada, la API toma (o crea) el usuario de `ADMIN_CORREO` y le envía el enlace. En desarrollo es la cuenta de ejemplo **a.rojas@ica.gov.co**: abra http://localhost:8025, busque el correo «Active su cuenta» y siga el enlace. El enlace también queda en `docker compose logs api` si el correo falla.
- **Correo:** en desarrollo, Mailpit (los correos no salen a internet). En el servidor del ICA se escriben en `.env` los datos del correo institucional (`CORREO_HOST`, `CORREO_PUERTO`, `CORREO_SEGURO`, `CORREO_USUARIO`, `CORREO_CLAVE`); no hay que cambiar código.
- **Producción:** con `NODE_ENV=produccion` la API revisa la configuración y **no arranca** si queda el ingreso de demostración, los datos de ejemplo, la clave de ejemplo de la base, `localhost` en `PUBLICO_URL` o `https` sin `COOKIE_SEGURA=si` (ver la lista al inicio de `.env.example`).
- **Desarrollo:** con `INGRESO_DEMOSTRACION=si` la API también acepta el ingreso de prueba del prototipo (cabeceras `X-EBA-Rol`), que solo usan las pruebas. Úselo solo en su equipo o en una red de confianza. Sin sesión, la API no cambia ningún dato.

Etapa actual: **versión 1.0 — todos los módulos en Angular (0 a 7)**. La API (puerto 3085) crea sola las tablas al arrancar.

### Dependencias de la API (solo tres)

| Paquete | Para qué |
|---|---|
| `express` | Servidor HTTP y rutas |
| `mariadb` | Conexión a la base de datos (driver oficial) |
| `nodemailer` | Envío de los códigos y enlaces por correo (SMTP) |

Lo demás usa lo que ya trae Node.js 24: `--env-file` en lugar de dotenv, `--watch` en lugar de nodemon, `node:test` en lugar de Jest, y CORS, cabeceras de seguridad y validación escritos en el propio proyecto.

## Ejecutar todo con Docker (recomendado para su computador)

Con Docker no necesita instalar Node.js ni MariaDB: cada parte corre en su propio contenedor.

| Contenedor | Qué es | Dirección |
|---|---|---|
| `eba-web` | Nginx: la plataforma en `/plataforma/` (con cabeceras de seguridad y política de contenido) | http://localhost:4200 |
| `eba-api` | API Node.js + Express | http://localhost:3085/api |
| `eba-mariadb` | Base de datos MariaDB 11.8 (los datos se guardan en el volumen `datos_mariadb`) | puerto 3306 |
| `eba-mailpit` | Correo de prueba | http://localhost:8025 |

**Requisito:** Docker Desktop para Windows (https://www.docker.com/products/docker-desktop), con WSL 2 activado (el instalador lo ofrece). Ábralo y espere a que diga *Engine running*.

**Primera vez** (PowerShell en esta carpeta):

```powershell
copy .env.example .env          # cambie DB_CLAVE y DB_CLAVE_ROOT
docker compose up -d --build    # o: npm run docker:subir   (la primera vez tarda varios minutos)
docker compose ps               # los cuatro contenedores deben estar «Up»; api y mariadb «healthy»
```

Abra http://localhost:4200. Desde otro equipo de la red: `http://IP_DE_SU_EQUIPO:4200` (la IP sale con `ipconfig`); Nginx reenvía `/api` a la API, así que no hay que configurar nada más.

| Comando | Qué hace |
|---|---|
| `docker compose up -d --build` | Construye las imágenes con el código actual y enciende todo |
| `docker compose down` | Apaga todo (los datos de MariaDB se conservan) |
| `docker compose logs -f api web` | Ver lo que pasa en la API y en Nginx |
| `docker compose ps` | Estado de los contenedores |
| `docker compose down -v` | Apaga y **borra** la base de datos (empezar de cero) |

Después de cambiar el código, vuelva a ejecutar `docker compose up -d --build`. No use `npm run dev` y Docker al mismo tiempo: los dos usan los puertos 4200 y 3085.

## Desarrollo sin Docker (Node.js en su computador)

### Requisitos (Windows)

1. **Node.js 24 LTS** (24.15 o superior): https://nodejs.org → versión LTS. Verifique en una terminal: `node -v`.
2. **Docker Desktop** (para MariaDB y Mailpit): https://www.docker.com/products/docker-desktop. Se necesita a partir de la etapa de base de datos.
3. **Visual Studio Code** (recomendado) con las extensiones *Angular Language Service* y *ESLint*.

### Primera vez

Abra una terminal (PowerShell) en esta carpeta y ejecute:

```powershell
copy .env.example .env      # luego cambie las claves en .env
npm install                 # instala todo y compila el paquete de la norma
```

### Ejecutar

```powershell
npm run dev                 # API en http://localhost:3085/api y web en http://localhost:4200
```

Abra http://localhost:4200. En «Inicio» debe ver **Conectado**, el estado de MariaDB y el mismo resultado calculado en el navegador y en el servidor. Los cambios en el código se recargan solos.

## Conectar por IP (otro computador o celular en la misma red)

1. Busque la IP de su equipo: en PowerShell, `ipconfig` → «Dirección IPv4» (por ejemplo `192.168.1.20`). La API también la muestra al arrancar.
2. En `.env` agregue la dirección del frontend con esa IP:
   `WEB_ORIGEN=http://localhost:4200,http://192.168.1.20:4200`
   (`API_HOST=0.0.0.0` deja la API escuchando en todas las IP del equipo; puede poner una IP fija si lo prefiere).
3. Ejecute `npm run dev:red` y abra `http://192.168.1.20:4200` desde el otro equipo.
4. La primera vez, Windows pregunta si permite a Node.js en la red: acepte para **redes privadas**. Si no pregunta, abra el puerto 3085 y el 4200 en el Firewall de Windows.

Si la API está en **otro** computador: antes de `npm run dev` ejecute `$env:API_URL="http://IP_DE_LA_API:3085"` en PowerShell; el proxy de Angular la usará.
Para producción, la dirección va en `apps/web/src/environments/environment.production.ts` (`apiUrl`).

## Asistente de la norma con Gemini

El asistente (botón flotante, en todos los perfiles) responde con **Gemini** cuando el servidor tiene la clave; si no, responde en modo local con el texto de la norma.

1. Cree la clave en Google AI Studio (https://aistudio.google.com › *Get API key*).
2. En el archivo `.env` (no en `.env.example`) escriba, sin comillas ni espacios:
   ```
   GEMINI_API_KEY=su_clave
   GEMINI_MODELO=gemini-3.8-flash
   ```
3. Guarde (Ctrl + S) y ejecute `docker compose up -d --build`.
4. Compruebe: http://localhost:4200/api/asistente/estado debe decir `"disponible": true`. En la plataforma, la ventana del asistente dice «IA · Gemini (servidor de la plataforma)» y en *Parametrización* aparece el botón **Probar conexión**.

Cómo funciona: el navegador arma las instrucciones (rol, numeral y página de la norma, resumen de la evaluación) y las envía a `POST /api/asistente`; la API quita nombres de personas y fincas, documentos, correos y teléfonos, agrega la clave y llama a Gemini. La clave nunca llega al navegador y el texto de las preguntas no se guarda. Hay un límite de 20 preguntas por minuto por equipo (`ASISTENTE_CONSULTAS_MINUTO`).

> En el plan gratuito de Gemini, Google puede usar lo enviado para mejorar sus productos y revisores humanos pueden leerlo. Por eso se quitan los datos personales; para producción en el ICA conviene el plan pago.

## Base de datos

La API crea y actualiza las tablas sola al arrancar: aplica en orden los archivos de `apps/api/bd/migraciones/` que falten y lo anota en la tabla `esquema_version`. Funciona igual con un volumen de Docker nuevo o con uno que ya existía. Si MariaDB todavía no responde, la API lo reintenta cada 10 segundos.

| Migración | Tablas |
|---|---|
| `001_registro_fincas.sql` | `departamento` (33, DIVIPOLA), `especie`, `persona_responsable`, `finca`, `finca_especie`, `consecutivo`, `bitacora` |
| `002_prototipo_conectado.sql` | `evaluacion`, `proceso`, `usuario`; columnas `datos` (JSON) y `version` en `finca`; huella en `bitacora` |
| `003_perfiles_v0_25.sql` | `usuario` con perfil (reemplaza la lista de la v0.24), asignación y aprobación en `evaluacion`, `revision_evaluacion`, `reprogramacion`, `constancia`, `aviso`; vistas `v_bandeja_coordinador` y `v_constancias` |

Para ver los datos puede usar cualquier cliente de MariaDB (por ejemplo HeidiSQL, que viene con el instalador de MariaDB para Windows, o DBeaver) con `localhost`, puerto `3306` (o el de `DB_PUERTO`), usuario `eba_app` y la clave de `DB_CLAVE`.

## Rutas de la API

| Método y ruta | Qué hace |
|---|---|
| `GET /api` | Lista de rutas disponibles y módulos en construcción |
| `GET /api/salud` | Estado de la API y de MariaDB |
| `GET /api/norma/reglas` | Pesos (Tabla 1), niveles (Tabla 2), umbral de 200 aves y reglas de seguimiento |
| `POST /api/norma/plan-muestreo` | `{ "aves": 320, "conCorral": true }` → tramo y plan de muestreo |
| `POST /api/norma/resultado` | `{ "aves": 320, "medidas": { "MBA": 80, "MBR": 90, "MBG": 70 } }` → puntaje y nivel |
| `GET /api/catalogos` | Departamentos (DIVIPOLA), especies y tipos de documento |
| `GET /api/fincas?q=&estado=` | Listado de fincas con especies y tramo |
| `GET /api/fincas/FIN-2026-00001` | Ficha de la finca (datos personales enmascarados) |
| `POST /api/fincas` | Registro de finca: datos, especies con número de aves y persona responsable |
| `GET /api/sincronizacion` | Los datos que corresponden al perfil de quien pregunta (fincas, evaluaciones, procesos, usuarios, avisos y, solo al administrador, la bitácora) |
| `PUT` / `DELETE /api/sincronizacion/:coleccion/:id` | Guarda o elimina un registro con control de versión (409 si otra persona lo cambió) |
| `POST /api/sincronizacion/bitacora` | Agrega entradas a la bitácora sin repetirlas |
| `GET /api/asistente/estado` | ¿Gemini está configurado? (nunca devuelve la clave) |
| `POST /api/asistente` | Pregunta al asistente con Gemini (sin datos personales) |
| `POST /api/auth/ingresar` · `POST /api/auth/verificar` | Ingreso en dos pasos: correo y contraseña → código de 6 dígitos al correo → cookie de sesión |
| `POST /api/auth/reenviar-codigo` · `GET /api/auth/sesion` · `POST /api/auth/salir` | Reenviar el código, consultar la sesión, cerrar la sesión |
| `POST /api/auth/recuperar` · `GET`/`POST /api/auth/enlace/:token` | ¿Olvidó su contraseña? y crear la contraseña con el enlace (activar o restablecer) |
| `POST /api/auth/cambiar-clave` · `GET /api/auth/reglas` | Cambiar la contraseña (con sesión) y reglas vigentes |
| `GET`/`POST /api/usuarios` · `PATCH`/`DELETE /api/usuarios/:clave` | Usuarios (solo administrador): listar, crear (envía el enlace), editar, eliminar sin historial |
| `POST /api/usuarios/:clave/estado` · `POST /api/usuarios/:clave/enlace` | Inactivar o reactivar (cierra sus sesiones) y reenviar el enlace de activación |
| `/api/bitacora`, `/evaluaciones`, `/seguimiento`, `/reportes` | En construcción (501), con el caso de uso y la etapa |

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas del paquete de la norma, de la API y del frontend |
| `npm run build` | Compila todo para producción |
| `npm run db:up` | Enciende solo MariaDB y Mailpit en Docker (para desarrollar con `npm run dev`) |
| `npm run docker:subir` / `npm run docker:bajar` | Toda la plataforma en Docker |
| `npm run dev:red` | Igual que `dev`, pero el frontend también se abre por la IP del equipo |
| `npm run dev:api` / `npm run dev:web` | Solo la API o solo el frontend |

## Organización

```
plataforma/
├── apps/
│   ├── api/                 Node.js + Express · puerto 3085 · prefijo /api
│   │   ├── src/
│   │   │   ├── EBA_patosgansos.js  arranque de la API (IP y puerto de .env)
│   │   │   ├── app.js       middlewares y rutas
│   │   │   ├── config/      lectura de .env
│   │   │   ├── middlewares/ cors, seguridad, registro, errores
│   │   │   ├── rutas/       salud, norma y módulos en construcción
│   │   │   ├── bd/          conexión a MariaDB y aplicación de migraciones
│   │   │   ├── modulos/     catalogos, fincas (rutas y consultas SQL), bitácora
│   │   │   └── utilidades/  errores y validación
│   │   ├── bd/migraciones/  scripts SQL de MariaDB (001_registro_fincas.sql, …)
│   │   └── test/            pruebas con node:test (las de fincas usan MariaDB real)
│   ├── prototipo/           prototipo v0.25 (referencia y pruebas de comparación; ya no se publica)
│   └── web/                 Angular · environments/ (dirección de la API) · proxy.conf.mjs · Dockerfile y nginx.conf
│       └── src/app/
│           ├── diseno/      marco con el menú lateral (colores ICA)
│           ├── nucleo/      acceso a la API y menú por rol
│           ├── compartido/  componentes comunes
│           └── modulos/     ingreso, inicio, fincas, evaluaciones, reportes, asistente, ayuda, cuenta, administracion
├── packages/norma/          reglas de la Metodología ICA compartidas por la API y la web
├── docs/ARQUITECTURA.md     decisiones de arquitectura y etapas
├── docker-compose.yml       plataforma completa: mariadb, api (Dockerfile en apps/api), web (Dockerfile y nginx.conf en apps/web), mailpit
└── .env.example             variables de configuración (copiar como .env)
```

## Reglas de seguridad que se mantienen desde el prototipo

- La clave de la API de IA solo está en `.env` del servidor; nunca en el frontend ni en el código.
- El asistente no envía documento, correo ni teléfono, y la bitácora no guarda el texto de las preguntas (Ley 1581).
- Las exportaciones CSV no llevan datos personales.
- El archivo `.env` no se sube al repositorio.
- Contraseñas cifradas con scrypt; códigos, sesiones y enlaces guardados solo como huella (SHA-256). Los enlaces no quedan en los registros de Nginx ni de la API.
- Los mensajes del ingreso no revelan si un correo está registrado.
