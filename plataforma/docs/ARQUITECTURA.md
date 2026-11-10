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

Docker sirve el prototipo v0.24 completo en `/` (decisión del 7 de noviembre de 2026) para trabajar ya con todas las pantallas, **guardando en MariaDB**: cada registro (finca, evaluación, proceso, usuario) se envía a la API con su versión (bloqueo optimista) y se guarda en tablas con columnas de consulta más una columna JSON con el registro completo. La versión definitiva (Angular + API + MariaDB) vive en `/plataforma/` y reemplaza los módulos del prototipo uno por uno, conservando el mismo diseño y los mismos flujos.

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
