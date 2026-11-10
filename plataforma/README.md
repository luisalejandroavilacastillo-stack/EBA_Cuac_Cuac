# EBA Cuac Cuac · Plataforma

Plataforma para evaluar el bienestar animal en patos y gansos según la Metodología ICA v1.0 (2024). Es la versión real del prototipo `EBA Cuac Cuac v0.24`: se toman de allí los casos de uso, los diagramas y las reglas de la norma.

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
| http://localhost:4200/ | **Prototipo EBA Cuac Cuac v0.24 completo, guardando en MariaDB** (todas las pantallas; ingreso de prueba con el código 482073). |
| http://localhost:4200/plataforma/ | Versión Angular + API + MariaDB que se construye módulo por módulo (hoy: registro de fincas). |

Todo lo que se hace en el prototipo (fincas, inspecciones con recorridos, respuestas, cierre, firmas, plan de mejora, seguimientos, usuarios y bitácora) se guarda en MariaDB y se ve igual desde cualquier navegador o equipo. Ver [`apps/prototipo/LEEME.md`](apps/prototipo/LEEME.md).

**Primera vez con la base vacía:** si su navegador ya tenía datos del prototipo, se suben a la base; si no, con `DATOS_EJEMPLO=si` se cargan los datos de ejemplo. Para empezar de cero: `docker compose down -v` (borra la base) y `docker compose up -d --build`.

**Pendiente (siguiente entrega):** ingreso real con usuario, contraseña y código al correo, y protección de la API por rol. Mientras tanto, cualquier persona que abra la página en su red puede ver y modificar los datos: úsela solo en su equipo o en una red de confianza.

Etapa actual: **prototipo conectado a MariaDB**. La API (puerto 3085) crea sola las tablas al arrancar.

### Dependencias de la API (solo dos)

| Paquete | Para qué |
|---|---|
| `express` | Servidor HTTP y rutas |
| `mariadb` | Conexión a la base de datos (driver oficial) |

Lo demás usa lo que ya trae Node.js 24: `--env-file` en lugar de dotenv, `--watch` en lugar de nodemon, `node:test` en lugar de Jest, y CORS, cabeceras de seguridad y validación escritos en el propio proyecto.

## Ejecutar todo con Docker (recomendado para su computador)

Con Docker no necesita instalar Node.js ni MariaDB: cada parte corre en su propio contenedor.

| Contenedor | Qué es | Dirección |
|---|---|---|
| `eba-web` | Nginx: prototipo v0.24 en `/` y Angular en `/plataforma/` | http://localhost:4200 |
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
4. Compruebe: http://localhost:4200/api/asistente/estado debe decir `"disponible": true`. En el prototipo, el panel del asistente dice «IA · Gemini (servidor de la plataforma)» y en *Parametrización* aparece el botón **Probar conexión**.

Cómo funciona: el navegador arma las instrucciones (rol, numeral y página de la norma, resumen de la evaluación) y las envía a `POST /api/asistente`; la API quita nombres de personas y fincas, documentos, correos y teléfonos, agrega la clave y llama a Gemini. La clave nunca llega al navegador y el texto de las preguntas no se guarda. Hay un límite de 20 preguntas por minuto por equipo (`ASISTENTE_CONSULTAS_MINUTO`).

> En el plan gratuito de Gemini, Google puede usar lo enviado para mejorar sus productos y revisores humanos pueden leerlo. Por eso se quitan los datos personales; para producción en el ICA conviene el plan pago.

## Base de datos

La API crea y actualiza las tablas sola al arrancar: aplica en orden los archivos de `apps/api/bd/migraciones/` que falten y lo anota en la tabla `esquema_version`. Funciona igual con un volumen de Docker nuevo o con uno que ya existía. Si MariaDB todavía no responde, la API lo reintenta cada 10 segundos.

| Migración | Tablas |
|---|---|
| `001_registro_fincas.sql` | `departamento` (33, DIVIPOLA), `especie`, `persona_responsable`, `finca`, `finca_especie`, `consecutivo`, `bitacora` |
| `002_prototipo_conectado.sql` | `evaluacion`, `proceso`, `usuario`; columnas `datos` (JSON) y `version` en `finca`; huella en `bitacora` |

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
| `GET /api/sincronizacion` | Todos los datos del prototipo (fincas, evaluaciones, procesos, usuarios, bitácora) |
| `PUT` / `DELETE /api/sincronizacion/:coleccion/:id` | Guarda o elimina un registro con control de versión (409 si otra persona lo cambió) |
| `POST /api/sincronizacion/bitacora` | Agrega entradas a la bitácora sin repetirlas |
| `GET /api/asistente/estado` | ¿Gemini está configurado? (nunca devuelve la clave) |
| `POST /api/asistente` | Pregunta al asistente con Gemini (sin datos personales) |
| `/api/autenticacion`, `/usuarios`, `/bitacora`, `/evaluaciones`, `/seguimiento`, `/reportes` | En construcción (501), con el caso de uso y la etapa |

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
│   ├── prototipo/           prototipo v0.24 conectado a la API (js/arranque.js, js/nucleo/conexion.js); Docker lo sirve en /
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
