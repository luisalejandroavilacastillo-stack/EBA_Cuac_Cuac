import { Router } from 'express';
import { config } from '../../config/config.js';
import { consultar, enTransaccion } from '../../bd/conexion.js';
import { ErrorApi } from '../../utilidades/errores.js';
import { cifrarClave, codigoSeisDigitos, problemaClave, sha256, tokenAleatorio, verificarClave } from './claves.js';
import { correos } from './correo.js';
import { NOMBRE_PERFIL, bitacora, buscarPorClave, buscarPorCorreo, crearEnlace, usuarioPublico } from './cuentas.js';
import { abrirSesion, cerrarSesion, cerrarSesionesDe } from './sesiones.js';

/**
 * Ingreso real (CU-01 ingresar con doble factor, CU-02 recuperar contraseña, CU-03 cerrar sesión).
 *   POST /api/auth/ingresar          { correo, clave }        → { desafio, correo }   (envía el código al correo)
 *   POST /api/auth/verificar         { desafio, codigo }      → { usuario }           (abre la sesión)
 *   POST /api/auth/reenviar-codigo   { desafio }
 *   GET  /api/auth/sesion            → { usuario } o 401      (también renueva la actividad)
 *   POST /api/auth/salir
 *   POST /api/auth/recuperar         { correo }               (responde igual exista o no el correo)
 *   GET  /api/auth/enlace/:token     → { tipo, nombre }       (activar cuenta o restablecer contraseña)
 *   POST /api/auth/enlace/:token     { clave }
 *   POST /api/auth/cambiar-clave     { actual, nueva }        (con sesión)
 *   GET  /api/auth/reglas            → reglas de contraseña y tiempos (para mostrarlas en pantalla)
 */
export const rutasAuth = Router();

const R = config.ingreso;
const ocultarCorreo = (c) => String(c ?? '').replace(/^(.)[^@]*(@.*)$/, '$1•••$2');
const GENERICO = 'Correo o contraseña incorrectos.';

/* Límite de intentos por equipo (además del bloqueo por usuario). */
const intentos = new Map();
function limitar(req, clave, max) {
  const k = `${clave}:${req.ip}`, ahora = Date.now();
  const l = (intentos.get(k) ?? []).filter((t) => ahora - t < 60_000);
  if (l.length >= max) throw new ErrorApi(429, 'Demasiados intentos seguidos. Espere un minuto.');
  l.push(ahora); intentos.set(k, l);
  if (intentos.size > 10_000) intentos.clear();
}
/** Solo para las pruebas automáticas. */
export const _limpiarLimites = () => intentos.clear();

rutasAuth.get('/reglas', (req, res) => {
  res.json({
    claveMinimo: 10, claveLetrasYNumeros: true, maxFallos: R.maxFallos, minutosBloqueo: R.minutosBloqueo,
    minutosCodigo: R.minutosCodigo, horasActivacion: R.horasActivacion, minutosRecuperacion: R.minutosRecuperacion,
    minutosInactividad: config.sesion.minutosInactividad,
  });
});

async function enviarCodigo(u, desafioHash) {
  const codigo = codigoSeisDigitos();
  await consultar('UPDATE codigo_verificacion SET codigo_hash = ?, expira_en = DATE_ADD(NOW(), INTERVAL ? MINUTE), intentos = 0 WHERE desafio = ?',
    [sha256(desafioHash + codigo), R.minutosCodigo, desafioHash]);
  try {
    await correos.codigo(u.correo, u.nombre, codigo);
  } catch (e) {
    console.error(`No se pudo enviar el código por correo: ${e.code ?? e.message}`);
    throw new ErrorApi(503, 'No se pudo enviar el código al correo. Intente de nuevo en unos minutos o avise al administrador.');
  }
}

rutasAuth.post('/ingresar', async (req, res) => {
  limitar(req, 'ingreso', 10);
  const correo = String(req.body?.correo ?? '').trim().toLowerCase(), clave = String(req.body?.clave ?? '');
  if (!correo || !clave) throw new ErrorApi(400, 'Escriba su correo y su contraseña.');
  const u = await buscarPorCorreo(correo);
  if (u?.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date())
    throw new ErrorApi(423, `Cuenta bloqueada por intentos fallidos. Intente de nuevo en ${R.minutosBloqueo} minutos o restablezca su contraseña.`);
  const ok = await verificarClave(clave, u?.clave_hash);   // se calcula igual aunque no exista: no revela si el correo existe
  if (!u || !ok || u.estado !== 'Activo' || !u.activado_en) {
    if (u && u.clave_hash) {
      const fallos = u.intentos_fallidos + 1, bloquear = fallos >= R.maxFallos;
      await consultar('UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = IF(?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NULL) WHERE clave = ?',
        [bloquear ? 0 : fallos, bloquear, R.minutosBloqueo, u.clave]);
      if (bloquear) {
        await bitacora(u.nombre, `Cuenta bloqueada ${R.minutosBloqueo} minutos por intentos fallidos`);
        throw new ErrorApi(423, `Se superaron ${R.maxFallos} intentos. La cuenta queda bloqueada ${R.minutosBloqueo} minutos.`);
      }
      if (ok && u.estado !== 'Activo') throw new ErrorApi(403, 'Su cuenta está inactiva. Comuníquese con el administrador.');
      throw new ErrorApi(401, `${GENERICO} Intentos restantes: ${R.maxFallos - fallos}.`);
    }
    throw new ErrorApi(401, GENERICO);
  }
  await consultar('UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE clave = ?', [u.clave]);
  const desafio = tokenAleatorio(), h = sha256(desafio);
  await consultar("INSERT INTO codigo_verificacion (desafio, usuario, codigo_hash, expira_en) VALUES (?, ?, '', NOW())", [h, u.clave]);
  await enviarCodigo(u, h);
  res.json({ desafio, correo: ocultarCorreo(u.correo), minutos: R.minutosCodigo });
});

async function leerDesafio(desafio) {
  const [c] = await consultar(
    'SELECT c.*, c.expira_en < NOW() AS vencido FROM codigo_verificacion c WHERE c.desafio = ? AND c.usado_en IS NULL', [sha256(String(desafio ?? ''))]);
  if (!c) throw new ErrorApi(400, 'La verificación ya no es válida. Ingrese de nuevo.', { reiniciar: true });
  return c;
}

rutasAuth.post('/verificar', async (req, res) => {
  limitar(req, 'codigo', 15);
  const desafio = String(req.body?.desafio ?? ''), codigo = String(req.body?.codigo ?? '').replace(/\D/g, '');
  const c = await leerDesafio(desafio);
  if (c.vencido) throw new ErrorApi(400, 'El código venció. Pida uno nuevo.');
  if (c.intentos >= 5) throw new ErrorApi(400, 'Se superaron los intentos del código. Ingrese de nuevo.', { reiniciar: true });
  if (sha256(c.desafio + codigo) !== c.codigo_hash) {
    await consultar('UPDATE codigo_verificacion SET intentos = intentos + 1 WHERE desafio = ?', [c.desafio]);
    const quedan = Math.max(0, 4 - c.intentos);
    throw new ErrorApi(400, quedan ? `Código incorrecto. Le quedan ${quedan} intentos.` : 'Código incorrecto. Ingrese de nuevo.', quedan ? undefined : { reiniciar: true });
  }
  await consultar('UPDATE codigo_verificacion SET usado_en = NOW() WHERE desafio = ?', [c.desafio]);
  const u = await buscarPorClave(c.usuario);
  if (!u || u.estado !== 'Activo') throw new ErrorApi(403, 'Su cuenta está inactiva.');
  await consultar('UPDATE usuario SET ultimo_ingreso = NOW() WHERE clave = ?', [u.clave]);
  await abrirSesion(req, res, u.clave);
  await bitacora(u.nombre, 'Inicio de sesión con verificación en dos pasos');
  res.json({ usuario: usuarioPublico(u) });
});

rutasAuth.post('/reenviar-codigo', async (req, res) => {
  limitar(req, 'reenvio', 5);
  const c = await leerDesafio(String(req.body?.desafio ?? ''));
  if (c.reenvios >= 3) throw new ErrorApi(429, 'Ya se reenvió el código 3 veces. Ingrese de nuevo.', { reiniciar: true });
  if (Date.now() - new Date(c.creado_en).getTime() < 30_000 && c.reenvios === 0) throw new ErrorApi(429, 'Espere unos segundos antes de pedir otro código.');
  await consultar('UPDATE codigo_verificacion SET reenvios = reenvios + 1 WHERE desafio = ?', [c.desafio]);
  await enviarCodigo(await buscarPorClave(c.usuario), c.desafio);
  res.json({ enviado: true });
});

rutasAuth.get('/sesion', async (req, res) => {
  if (!req.usuario) throw new ErrorApi(401, req.sesionVencida ? 'Su sesión se cerró por inactividad. Ingrese de nuevo.' : 'Sin sesión.');
  res.json({ usuario: usuarioPublico(await buscarPorClave(req.usuario.clave)), minutosInactividad: config.sesion.minutosInactividad });
});

rutasAuth.post('/salir', async (req, res) => {
  if (req.usuario) await bitacora(req.usuario.nombre, String(req.body?.motivo || 'Cierre de sesión').slice(0, 120));
  await cerrarSesion(req, res);
  res.json({ salio: true });
});

rutasAuth.post('/recuperar', async (req, res) => {
  limitar(req, 'recuperar', 5);
  const correo = String(req.body?.correo ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new ErrorApi(400, 'Escriba un correo válido.');
  const u = await buscarPorCorreo(correo);
  if (u && u.estado === 'Activo') {
    try {
      // Si la cuenta aún no se activó, se reenvía el enlace de activación en lugar del de recuperación.
      const tipo = u.activado_en ? 'recuperacion' : 'activacion';
      const url = await crearEnlace(u.clave, tipo);
      if (tipo === 'recuperacion') await correos.recuperacion(u.correo, u.nombre, url);
      else await correos.invitacion(u.correo, u.nombre, NOMBRE_PERFIL[u.perfil], url);
      await bitacora(u.nombre, 'Solicitud de recuperación de contraseña');
    } catch (e) { console.error(`No se pudo enviar el correo de recuperación: ${e.code ?? e.message}`); }
  }
  res.json({ mensaje: 'Si el correo está registrado, recibirá un enlace en unos minutos.' });
});

async function leerEnlace(token) {
  const [e] = await consultar(
    `SELECT e.*, e.expira_en < NOW() AS vencido, u.nombre, u.correo, u.documento, u.estado, u.perfil
     FROM enlace_cuenta e JOIN usuario u ON u.clave = e.usuario WHERE e.token_hash = ? AND e.usado_en IS NULL`, [sha256(String(token ?? ''))]);
  if (!e || e.vencido) throw new ErrorApi(400, 'El enlace no es válido o ya venció. Pida uno nuevo.');
  if (e.estado !== 'Activo') throw new ErrorApi(403, 'La cuenta está inactiva. Comuníquese con el administrador.');
  return e;
}

rutasAuth.get('/enlace/:token', async (req, res) => {
  const e = await leerEnlace(req.params.token);
  res.json({ tipo: e.tipo, nombre: e.nombre, correo: ocultarCorreo(e.correo) });
});

rutasAuth.post('/enlace/:token', async (req, res) => {
  limitar(req, 'enlace', 10);
  const e = await leerEnlace(req.params.token);
  const clave = String(req.body?.clave ?? '');
  const problema = problemaClave(clave, { correo: e.correo, documento: e.documento });
  if (problema) throw new ErrorApi(400, problema, { campos: { clave: problema } });
  const hash = await cifrarClave(clave);
  await enTransaccion(async (con) => {
    await con.query('UPDATE enlace_cuenta SET usado_en = NOW() WHERE token_hash = ?', [e.token_hash]);
    // MariaDB asigna de izquierda a derecha: la versión se calcula antes de marcar la activación.
    await con.query(`UPDATE usuario SET version = version + IF(activado_en IS NULL, 1, 0), clave_hash = ?, activado_en = COALESCE(activado_en, NOW()),
      intentos_fallidos = 0, bloqueado_hasta = NULL WHERE clave = ?`,
      [hash, e.usuario]);
  });
  await cerrarSesionesDe(e.usuario);
  await bitacora(e.nombre, e.tipo === 'activacion' ? 'Activó su cuenta' : 'Restableció su contraseña');
  res.json({ listo: true, tipo: e.tipo });
});

rutasAuth.post('/cambiar-clave', async (req, res) => {
  if (!req.usuario) throw new ErrorApi(401, 'Debe ingresar a la plataforma.');
  limitar(req, 'cambiar', 5);
  const u = await buscarPorClave(req.usuario.clave);
  if (!(await verificarClave(String(req.body?.actual ?? ''), u.clave_hash)))
    throw new ErrorApi(400, 'La contraseña actual no es correcta.', { campos: { actual: 'No es correcta.' } });
  const nueva = String(req.body?.nueva ?? '');
  const problema = problemaClave(nueva, { correo: u.correo, documento: u.documento });
  if (problema) throw new ErrorApi(400, problema, { campos: { nueva: problema } });
  await consultar('UPDATE usuario SET clave_hash = ? WHERE clave = ?', [await cifrarClave(nueva), u.clave]);
  await bitacora(u.nombre, 'Cambió su contraseña');
  res.json({ listo: true });
});
