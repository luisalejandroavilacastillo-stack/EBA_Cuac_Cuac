import { config } from '../../config/config.js';
import { consultar } from '../../bd/conexion.js';
import { bitacora, buscarPorCorreo, datosDe, enviarActivacion } from './cuentas.js';

/**
 * Primer administrador (instalación). Si no hay ningún administrador activo con la cuenta activada:
 *   · toma el usuario con ADMIN_CORREO (y le da el perfil de administrador) o lo crea con ADMIN_NOMBRE y ADMIN_DOCUMENTO;
 *   · le envía el enlace para crear su contraseña (salvo que ya tenga uno vigente).
 * En desarrollo, ADMIN_CORREO es la cuenta de ejemplo a.rojas@ica.gov.co: se espera a que el prototipo suba los
 * usuarios de ejemplo para no crear un usuario repetido.
 * Se llama al arrancar la API y cada vez que se crean usuarios mientras no haya administrador activado.
 */
let enCurso = null;
/** crear = false: solo envía el enlace si el usuario con ADMIN_CORREO ya existe (lo usa la sincronización). */
export function asegurarPrimerAdministrador(registrar = console.log, { crear = true } = {}) {
  enCurso ??= revisar(registrar, crear).catch((e) => registrar(`  Primer administrador: ${e.code ?? e.message}`)).finally(() => { enCurso = null; });
  return enCurso;
}

async function revisar(registrar, crear) {
  const [{ n }] = await consultar("SELECT COUNT(*) AS n FROM usuario WHERE perfil = 'admin' AND estado = 'Activo' AND activado_en IS NOT NULL");
  if (Number(n)) return 'listo';
  const correo = config.admin.correo;
  if (!correo) {
    registrar('  ⚠ No hay administrador. Escriba ADMIN_CORREO (y ADMIN_NOMBRE) en el archivo .env y reinicie la API para crearlo.');
    return 'sin correo';
  }
  let u = await buscarPorCorreo(correo);
  if (!u) {
    const [{ total }] = await consultar('SELECT COUNT(*) AS total FROM usuario');
    if (!crear || (config.datosEjemplo && !Number(total))) return 'esperando datos de ejemplo';
    const [{ libre }] = await consultar("SELECT COUNT(*) = 0 AS libre FROM usuario WHERE clave = 'admin'");
    const clave = Number(libre) ? 'admin' : `u_admin${Date.now().toString(36)}`;
    const doc = String(config.admin.documento).replace(/\D/g, '').slice(0, 20) || '1000000001';
    const datos = { nombre: config.admin.nombre, perfil: 'admin', correo, tipoDoc: 'CC', doc, tel: '', estado: 'Activo', creado: { por: 'instalación', fecha: new Date().toISOString() } };
    await consultar(
      "INSERT INTO usuario (clave, nombre, perfil, tipo_documento, documento, correo, estado, datos) VALUES (?, ?, 'admin', 'CC', ?, ?, 'Activo', ?)",
      [clave, config.admin.nombre, doc, correo, JSON.stringify(datos)]);
    await bitacora('instalación', `Creación del primer administrador ${config.admin.nombre}`);
    u = await buscarPorCorreo(correo);
  } else if (u.perfil !== 'admin' || u.estado !== 'Activo') {
    const datos = { ...datosDe(u), perfil: 'admin', estado: 'Activo' };
    await consultar("UPDATE usuario SET perfil = 'admin', estado = 'Activo', datos = ?, version = version + 1 WHERE clave = ?", [JSON.stringify(datos), u.clave]);
    await bitacora('instalación', `${u.nombre} queda como administrador (ADMIN_CORREO)`);
    u = await buscarPorCorreo(correo);
  }
  if (u.enlace_vence && new Date(u.enlace_vence) > new Date()) {
    registrar(`  Primer administrador: ${u.nombre} tiene un enlace de activación vigente en su correo.`);
    return 'pendiente';
  }
  const r = await enviarActivacion(u, registrar);
  registrar(r === 'enviado'
    ? `  Primer administrador: se envió a ${u.nombre} el enlace para crear su contraseña${config.correo.host === 'mailpit' || config.correo.host === 'localhost' ? ' (véalo en http://localhost:8025)' : ''}.`
    : '  Primer administrador: revise la configuración del correo (CORREO_HOST) en el archivo .env.');
  return r;
}
