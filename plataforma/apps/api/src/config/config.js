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
const si = (v) => ['si', 'sí', 'true', '1'].includes(String(v).toLowerCase());
const lista = (nombre, defecto) => texto(nombre, defecto).split(',').map((s) => s.trim()).filter(Boolean);

export const config = Object.freeze({
  entorno: texto('NODE_ENV', 'desarrollo'),
  version: '1.0.0',
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
  /** Dirección con la que las personas abren la plataforma: se usa en los enlaces de los correos. */
  publicoUrl: texto('PUBLICO_URL', 'http://localhost:4200').replace(/\/+$/, ''),
  /**
   * Ingreso de demostración del prototipo (perfil, Ica2026* y 482073). Solo para desarrollo: el perfil llega en
   * encabezados del navegador y no se verifica. En producción debe ser «no»: todo exige la sesión real.
   */
  ingresoDemostracion: si(texto('INGRESO_DEMOSTRACION', texto('NODE_ENV', 'desarrollo') === 'produccion' ? 'no' : 'si')),
  sesion: Object.freeze({
    minutosInactividad: numero('SESION_MINUTOS', 15),       // RF01: cierre por inactividad
    horasMaximas: numero('SESION_HORAS_MAX', 12),
    /** «si» cuando la plataforma se abre con https:// (servidor con certificado): la cookie solo viaja cifrada. */
    cookieSegura: si(texto('COOKIE_SEGURA', 'no')),
  }),
  /** Reglas de ingreso acordadas (módulo 1). */
  ingreso: Object.freeze({ maxFallos: 5, minutosBloqueo: 15, minutosCodigo: 10, horasActivacion: 48, minutosRecuperacion: 30 }),
  correo: Object.freeze({
    // En Docker, «localhost» no es el buzón de prueba: se usa el servicio «mailpit».
    host: (() => { const h = texto('CORREO_HOST', 'localhost'); return process.env.EN_DOCKER && h === 'localhost' ? 'mailpit' : h; })(),
    puerto: numero('CORREO_PUERTO', 1025),
    seguro: si(texto('CORREO_SEGURO', 'no')),   // si = TLS directo (puerto 465)
    usuario: texto('CORREO_USUARIO', ''),
    clave: process.env.CORREO_CLAVE ?? '',
    remitente: texto('CORREO_REMITENTE', 'EBA Cuac Cuac <no-responder@eba.local>'),
  }),
  /**
   * Primer administrador: si no hay ningún administrador con la cuenta activada, se crea (o se toma el usuario con
   * ese correo) y recibe el enlace para crear su contraseña. En desarrollo, la cuenta de ejemplo de Andrés Felipe Rojas.
   */
  admin: Object.freeze({
    correo: texto('ADMIN_CORREO', texto('NODE_ENV', 'desarrollo') === 'produccion' ? '' : 'a.rojas@ica.gov.co').toLowerCase(),
    nombre: texto('ADMIN_NOMBRE', 'Administrador EBA'),
    documento: texto('ADMIN_DOCUMENTO', '1000000001'),
  }),
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

/**
 * Revisión de la configuración de producción (módulo 7): devuelve los problemas que impiden arrancar con seguridad.
 * La API no arranca en producción con el ingreso de demostración, con datos de ejemplo ni con claves de ejemplo.
 */
export function problemasProduccion(c = config) {
  if (c.entorno !== 'produccion') return [];
  const p = [];
  if (c.ingresoDemostracion) p.push('INGRESO_DEMOSTRACION debe ser «no» en producción.');
  if (c.datosEjemplo) p.push('DATOS_EJEMPLO debe ser «no» en producción.');
  if (/cambie_esta_clave/.test(String(c.bd?.clave ?? ''))) p.push('Cambie DB_CLAVE (todavía tiene la clave de ejemplo).');
  if (/^https:/.test(c.publicoUrl) && !c.sesion.cookieSegura) p.push('Con https, COOKIE_SEGURA debe ser «si».');
  if (/localhost/.test(c.publicoUrl)) p.push('Escriba en PUBLICO_URL la dirección real de la plataforma (no localhost).');
  return p;
}
