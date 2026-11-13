import { config } from '../../config/config.js';
import { consultar } from '../../bd/conexion.js';
import { ErrorApi } from '../../utilidades/errores.js';
import { sha256, tokenAleatorio } from './claves.js';

/**
 * Sesiones con la cookie «eba_sesion»: HttpOnly (JavaScript no la puede leer), SameSite=Strict
 * y Secure cuando la plataforma usa https (COOKIE_SEGURA=si). En la base solo se guarda el hash del identificador.
 * Se cierra sola tras SESION_MINUTOS sin actividad (15) o SESION_HORAS_MAX desde el ingreso (12).
 */
export const COOKIE = 'eba_sesion';

function leerCookie(req) {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) { try { return decodeURIComponent(v.join('=')); } catch { return null; } }
  }
  return null;
}
function ponerCookie(res, valor, segundos) {
  const partes = [`${COOKIE}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${segundos}`];
  if (config.sesion.cookieSegura) partes.push('Secure');
  res.append('Set-Cookie', partes.join('; '));
}

export async function abrirSesion(req, res, clave) {
  const token = tokenAleatorio();
  await consultar(
    'INSERT INTO sesion (id, usuario, expira_en, ip, navegador) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), ?, ?)',
    [sha256(token), clave, config.sesion.horasMaximas, String(req.ip ?? '').slice(0, 45), String(req.get('user-agent') ?? '').slice(0, 200)]);
  ponerCookie(res, token, config.sesion.horasMaximas * 3600);
}

export async function cerrarSesion(req, res) {
  const token = leerCookie(req);
  if (token) await consultar('UPDATE sesion SET cerrada_en = NOW() WHERE id = ? AND cerrada_en IS NULL', [sha256(token)]);
  ponerCookie(res, '', 0);
}

/** Cierra todas las sesiones de un usuario (cambio de perfil, inactivación o contraseña nueva). */
export const cerrarSesionesDe = (clave) => consultar('UPDATE sesion SET cerrada_en = NOW() WHERE usuario = ? AND cerrada_en IS NULL', [clave]);

/** Lee la sesión si existe (no la exige). Deja req.usuario = { clave, nombre, perfil, correo }. */
export async function leerSesion(req, res, next) {
  const token = leerCookie(req);
  if (!token) return next();
  let s;
  try {
    [s] = await consultar(
      `SELECT s.id, TIMESTAMPDIFF(SECOND, s.ultima_actividad, NOW()) AS inactiva, s.expira_en < NOW() AS vencida,
              u.clave, u.nombre, u.perfil, u.correo, u.estado
       FROM sesion s JOIN usuario u ON u.clave = s.usuario WHERE s.id = ? AND s.cerrada_en IS NULL`, [sha256(token)]);
  } catch (e) {
    // Base de datos sin la migración 004 todavía (arranque): se sigue sin sesión.
    if (e.code === 'ER_NO_SUCH_TABLE') return next();
    throw e;
  }
  if (!s || s.vencida || s.inactiva > config.sesion.minutosInactividad * 60 || s.estado !== 'Activo') {
    if (s) await consultar('UPDATE sesion SET cerrada_en = NOW() WHERE id = ?', [s.id]);
    ponerCookie(res, '', 0);
    req.sesionVencida = true;
    return next();
  }
  if (s.inactiva > 20) await consultar('UPDATE sesion SET ultima_actividad = NOW() WHERE id = ?', [s.id]);
  req.usuario = { clave: s.clave, nombre: s.nombre, perfil: s.perfil, correo: s.correo };
  next();
}

/**
 * Quién hace la petición: la sesión real si existe; si no, y solo con INGRESO_DEMOSTRACION=si (desarrollo),
 * el perfil que envía el prototipo en X-EBA-Rol y X-EBA-Clave. Sin ninguno de los dos: { rol: '' }.
 */
export function identidad(req) {
  if (req.usuario) return { rol: req.usuario.perfil, clave: req.usuario.clave, nombre: req.usuario.nombre, real: true };
  if (!config.ingresoDemostracion) return { rol: '', clave: '', nombre: '', real: false };
  let nombre = String(req.get('X-EBA-Usuario') ?? '');
  try { nombre = decodeURIComponent(nombre); } catch { /* se deja como llegó */ }
  return { rol: String(req.get('X-EBA-Rol') ?? ''), clave: String(req.get('X-EBA-Clave') ?? ''), nombre: nombre.slice(0, 80), real: false };
}

const mensaje401 = (req) => (req.sesionVencida ? 'Su sesión se cerró por inactividad. Ingrese de nuevo.' : 'Debe ingresar a la plataforma.');

/** Exige la sesión real (no acepta el ingreso de demostración). */
export function requerirSesion(req, res, next) {
  if (!req.usuario) throw new ErrorApi(401, mensaje401(req));
  next();
}

/** Exige uno de los perfiles: con la sesión real o, en desarrollo, con el ingreso de demostración. */
export const requerirPerfil = (...perfiles) => (req, res, next) => {
  const yo = identidad(req);
  if (!yo.rol) throw new ErrorApi(401, mensaje401(req));
  if (!perfiles.includes(yo.rol)) throw new ErrorApi(403, 'Su perfil no tiene permiso para esta acción.');
  req.yo = yo;
  next();
};

/** Sin sesión real, en producción no se entrega ni se cambia ningún dato. */
export function requerirIdentidad(req, res, next) {
  if (!req.usuario && !config.ingresoDemostracion) throw new ErrorApi(401, mensaje401(req));
  next();
}

/**
 * Protección contra peticiones desde otros sitios (CSRF): además de SameSite=Strict, las peticiones que cambian datos
 * deben venir de la misma dirección de la plataforma o de una de WEB_ORIGEN.
 */
export function mismoOrigen(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origen = req.get('origin');
  if (!origen) return next();                                   // herramientas y pruebas sin navegador
  let host;
  try { host = new URL(origen).host; } catch { throw new ErrorApi(403, 'Origen no permitido.'); }
  const propio = [req.get('x-forwarded-host'), req.get('host')].filter(Boolean);
  if (propio.includes(host) || config.origenesWeb.includes(origen)) return next();
  throw new ErrorApi(403, 'Origen no permitido.');
}
