# Prototipo EBA Cuac Cuac v0.24 conectado a MariaDB

Prototipo validado (versión 0.24, commit 80b399a del repositorio del prototipo) con todas sus pantallas, ahora
**guardando en MariaDB** a través de la API. Docker lo sirve en http://localhost:4200/.

## Cómo funciona

1. `js/arranque.js` pide a la API todos los datos (`GET /api/sincronizacion`) y después carga los scripts de la aplicación.
2. La aplicación trabaja igual que antes con sus listas (FINCAS, EVALS, USUARIOS_LISTA, PROCESOS, BITACORA) y llama a `guardar()`.
3. `js/nucleo/conexion.js` detecta qué registros cambiaron y los envía a la API uno por uno, con su versión:
   - si otra persona cambió el mismo registro, la API lo rechaza y se carga la versión más reciente (con un aviso);
   - si la API no responde, se reintenta solo y aparece un aviso arriba en el centro;
   - cada 15 segundos revisa si hubo cambios de otras personas y actualiza las pantallas de consulta
     (inicio, fincas, ficha de finca, reportes, usuarios, bitácora). Las pantallas de la inspección no se refrescan
     mientras se trabaja en ellas, para no perder lo que se está escribiendo.
4. Sin API (por ejemplo, abriendo `index.html` directamente), funciona solo en el navegador y lo avisa.

El asistente usa **Gemini desde el servidor** cuando `GEMINI_API_KEY` está en el `.env` (`js/vistas/asistente.js` › `preguntarServidor`). Sin esa clave, responde en modo local o con la configuración de Claude del prototipo, que se queda solo en el navegador.

## Cambios frente al prototipo original

| Archivo | Cambio |
|---|---|
| `index.html` | Carga `js/arranque.js` en lugar de la lista de scripts |
| `js/arranque.js`, `js/nucleo/conexion.js` | Nuevos: conexión con la API |
| `js/vistas/fincas.js` | Código de finca consecutivo del año (antes aleatorio) |
| `js/norma/seguimiento.js` | Código de evaluación con el año actual |
| `js/vistas/administracion.js` | «Restablecer datos de ejemplo» no aparece cuando `DATOS_EJEMPLO=no` |
| `js/vistas/asistente.js` | Modo «IA · Gemini (servidor de la plataforma)» por medio de `/api/asistente` |

- Ingreso de prueba: escoja un perfil; código de verificación **482073** (el ingreso real llega en la siguiente entrega).
