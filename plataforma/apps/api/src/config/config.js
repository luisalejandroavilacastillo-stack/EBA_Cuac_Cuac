/**
 * Configuración de la API. Se lee de las variables de entorno (archivo .env en la raíz del proyecto,
 * cargado por Node con --env-file-if-exists; no se necesita el paquete dotenv).
 */
const texto = (nombre, defecto) => (process.env[nombre] ?? '').trim() || defecto;
const numero = (nombre, defecto) => {
  const v = Number(texto(nombre, String(defecto)));
  if (!Number.isInteger(v) || v <= 0) throw new Error(`La variable ${nombre} debe ser un número entero positivo`);
  return v;
};
const lista = (nombre, defecto) => texto(nombre, defecto).split(',').map((s) => s.trim()).filter(Boolean);

export const config = Object.freeze({
  entorno: texto('NODE_ENV', 'desarrollo'),
  version: '0.6.0',
  /** IP donde escucha la API. 0.0.0.0 = todas las interfaces de red del equipo (para entrar por IP desde otro equipo). */
  host: texto('API_HOST', '0.0.0.0'),
  puerto: numero('API_PUERTO', 3085),
  /** Direcciones del frontend Angular que pueden llamar a la API (CORS), separadas por coma. */
  origenesWeb: lista('WEB_ORIGEN', 'http://localhost:4200'),
  limiteCuerpo: texto('API_LIMITE_CUERPO', '8mb'),   // una inspección completa con recorridos puede pesar varios cientos de KB
  bd: Object.freeze({
    host: texto('DB_HOST', 'localhost'),
    puerto: numero('DB_PUERTO', 3306),
    nombre: texto('DB_NOMBRE', 'eba'),
    usuario: texto('DB_USUARIO', 'eba_app'),
    clave: process.env.DB_CLAVE ?? '',
    conexiones: numero('DB_CONEXIONES', 5),
  }),
  /** Datos de ejemplo del prototipo cuando la base está vacía: sí en desarrollo, no en producción. */
  datosEjemplo: ['si', 'sí', 'true', '1'].includes(texto('DATOS_EJEMPLO', texto('NODE_ENV', 'desarrollo') === 'produccion' ? 'no' : 'si').toLowerCase()),
  /** Asistente de la norma con Gemini. La clave solo vive en el servidor (.env); nunca se envía al navegador. */
  gemini: Object.freeze({
    clave: texto('GEMINI_API_KEY', ''),
    modelo: texto('GEMINI_MODELO', 'gemini-3.8-flash'),
    respaldo: texto('GEMINI_MODELO_RESPALDO', 'gemini-3.5-flash-lite'),   // si el principal está saturado
    url: texto('GEMINI_URL', 'https://generativelanguage.googleapis.com/v1beta'),
    consultasPorMinuto: numero('ASISTENTE_CONSULTAS_MINUTO', 20),
  }),
  get asistenteIA() { return Boolean(this.gemini.clave); },
});

export const esProduccion = () => config.entorno === 'produccion';
