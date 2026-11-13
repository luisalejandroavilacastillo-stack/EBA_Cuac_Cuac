# Arquitectura · EBA Cuac Cuac

## Decisiones

| Decisión | Elección | Motivo |
|---|---|---|
| Estilo | Monolito modular (un frontend, una API) | Tamaño de la plataforma; los microservicios solo añaden complejidad |
| Frontend | Angular + TypeScript | Formularios robustos, estructura por módulos, carga perezosa |
| Backend | Node.js 24 + Express 5 en JavaScript, puerto 3085 | Decisión del proyecto: simple y sin dependencias innecesarias (solo express y mariadb) |
| Conexión web ↔ API | Proxy de Angular en desarrollo; IP:3085 en producción; CORS por lista en `WEB_ORIGEN` | Se puede entrar por la IP del equipo desde otro computador |
| Reglas de la norma | Paquete `@eba/norma` | Una sola fuente del cálculo: el servidor da el resultado oficial y la web muestra el avance |
| Base de datos | MariaDB (decisión del proyecto) | El esquema del prototipo (PostgreSQL) se adapta en la etapa 2 |
| Trabajo sin conexión | PWA con IndexedDB y sincronización (etapa 6) | Las fincas pueden no tener señal |
| IA | Gemini API llamada solo desde la API (`POST /api/asistente`, sin dependencias) | La clave no sale del servidor (.env); se quitan nombres, documentos, correos y teléfonos antes de enviar |
| Letra | Nunito Sans incluida en la aplicación | Funciona sin internet |
| Despliegue | Docker Compose: `mariadb`, `api` (node:24-slim), `web` (Nginx con proxy `/api` → `api:3085`), `mailpit` | Igual en su computador y en un servidor; el frontend llama a `/api` en su misma dirección, sin CORS |

## Transición desde el prototipo

Docker sirve el prototipo v0.25 completo en `/` (perfiles reorganizados, revisión del coordinador y constancia, migración `003_perfiles_v0_25.sql` y permisos por perfil en `modulos/sincronizacion/permisos.js`; antes, v0.24) (decisión del 7 de noviembre de 2026) para trabajar ya con todas las pantallas, **guardando en MariaDB**: cada registro (finca, evaluación, proceso, usuario) se envía a la API con su versión (bloqueo optimista) y se guarda en tablas con columnas de consulta más una columna JSON con el registro completo. La versión definitiva (Angular + API + MariaDB) vive en `/plataforma/` y reemplaza los módulos del prototipo uno por uno, conservando el mismo diseño y los mismos flujos.

## Etapas

1. Estructura del proyecto: monorepo, web con menú por rol, paquete de reglas con pruebas.
1b. **API con Express** (esta entrega): puerto 3085, conexión por IP, salud con MariaDB, rutas de la norma.
2. Base de datos en MariaDB: esquema adaptado, datos base (norma, roles, catálogos, primer administrador) y datos de ejemplo solo para desarrollo.
3. Ingreso con doble factor, roles y bitácora.
4. Fincas: registro con especies y número de aves, ficha, persona responsable.
5. Evaluación: apertura, recorridos de patos y gansos, lista de chequeo, ficha del indicador, cierre.
6. Seguimiento, tablero, reportes, asistente y trabajo sin conexión.

## Entornos

| Entorno | Dónde | Datos |
|---|---|---|
| Desarrollo | Su computador | Datos base + datos de ejemplo |
| Producción | Servidor del ICA o de la universidad | Solo datos base y el primer administrador; sin código de demostración |

## Angular: plan por módulos (desde 0.8.0)

| Módulo | Contenido | Estado |
|---|---|---|
| 0 | Fundamentos: diseño del prototipo (`src/estilos/eba.css`), marco con menú por perfil, guardas de sesión y permisos, interceptor de errores, avisos, mensajes y confirmaciones | Listo (0.8.0) |
| 1 | Ingreso real (contraseña cifrada, código por correo, bloqueo por intentos, cierre por inactividad), activación por enlace, recuperación, Usuarios y Mi cuenta | Listo (0.9.0) |
| 2 | Inicio por perfil y Fincas (lista, registro, ficha, persona responsable, historial, población); motor de cálculo y flujo en `@eba/norma` | Listo (0.10.0) |
| 3 | Asignación y revisión del coordinador (asignar, reasignar, reprogramar, devolver, aprobar, ampliar) | Listo (0.11.0) |
| 4 | Evaluación en campo: apertura, indicadores, recorrido de patos y gansos, ficha del ave, cierre y envío; copia de trabajo que se guarda sin señal y se envía al volver | Listo (0.11.0) |
| 5 | Resultado y constancia | Listo (0.11.0) |
| 6 | Reportes e informe de finca, ayuda de la norma, bitácora, parametrización y asistente (flotante y página) | Listo (1.0.0) |
| 7 | Cierre: retiro del prototipo, trabajo sin señal (service worker y copia de datos), datos de ejemplo cargados por la API, privacidad por perfil, cabeceras de seguridad y revisión de la configuración de producción | Listo (1.0.0) |

Reglas del módulo 0:
- Perfiles, permisos por módulo y acciones del flujo salen de `packages/norma/src/perfiles.ts` (una sola fuente para la API y Angular).
- Cada ruta declara `data: { modulo }` y `permisoGuard` la revisa; el servidor vuelve a revisar en cada cambio (`permisos.js`).
- Prueba en Docker del ingreso: `python3 pruebas/prueba_ingreso_m1.py` (lee los correos en Mailpit).

### Sesión e identidad (desde 0.9.0)

- La identidad sale de la cookie `eba_sesion` (`HttpOnly`, `SameSite=Strict`, `Secure` con `COOKIE_SEGURA=si`). En la base solo queda su huella (tabla `sesion`).
- `apps/api/src/modulos/auth/sesiones.js` → `identidad(req)`: la sesión real; solo si `INGRESO_DEMOSTRACION=si` y no hay sesión, el perfil de los encabezados `X-EBA-Rol`/`X-EBA-Clave` del ingreso de prueba del prototipo. `permisos.js` usa esa identidad sin cambiar sus reglas.
- Peticiones que cambian datos: deben venir de la misma dirección de la plataforma o de `WEB_ORIGEN` (protección CSRF además de `SameSite`).
- Migración `004_ingreso_real.sql`: columnas de seguridad en `usuario` y tablas `sesion`, `codigo_verificacion`, `enlace_cuenta`; vista `v_cuentas`.
- Angular escribe en `sessionStorage` («eba.ses») quién ingresó, para que el prototipo abra en la misma pestaña sin volver a ingresar; la API igual exige la cookie.

### Motor de la visita en `@eba/norma` (desde 0.10.0)

- `packages/norma/src/motor/`: cálculo de la visita (`calculo.ts`: plan de muestreo, aplicabilidad, puntaje de cada indicador, resultado y avance),
  flujo por finca y especie, procesos de seguimiento y cumplimiento (`flujo.ts`, clase `Flujo`) y los 58 indicadores (`indicadores.ts`, generado).
- Es la traducción del prototipo (`calculo.js`, `flujo.js`, `seguimiento.js`). La prueba `motor.spec.ts` ejecuta el código del prototipo en una caja
  aislada con las mismas visitas y compara resultado, avance, cumplimiento, procesos, estados y acciones para los cuatro perfiles.
- `indicadores.ts` se regenera desde el prototipo con `node packages/norma/herramientas/generar_indicadores.cjs`.
- Angular lee los datos de `/api/sincronizacion` (servicio `Datos`, revisa cambios cada 15 s) y calcula con `Flujo`; escribe con `PUT/DELETE /api/sincronizacion/fincas/:id`.
- Pantallas que aún no están en Angular (visita, asignar, reasignar, revisar, constancia) se abren en el prototipo con la misma sesión (`enPrototipo()`).
- Prueba en Docker: `python3 pruebas/prueba_fincas_m2.py` (compara Fincas e Inicio de Angular con el prototipo para cada perfil).
