import { config } from '../../config/config.js';
import { consultar } from '../../bd/conexion.js';
import { correos } from './correo.js';
import { sha256, tokenAleatorio } from './claves.js';

/** Perfiles y su nombre en pantalla (iguales al prototipo y a @eba/norma). */
export const NOMBRE_PERFIL = Object.freeze({
  admin: 'Administrador', coordinador: 'Coordinador ICA', inspector: 'Inspector ICA', productor: 'Productor',
});
export const ESTADOS_ABIERTOS = ['Programada', 'En proceso', 'Pendiente de aprobación', 'Devuelta'];

const leerJson = (t) => { try { return typeof t === 'string' ? JSON.parse(t) : t ?? {}; } catch { return {}; } };

/** Estado de activación de la cuenta: Activa, Pendiente de activación, Enlace vencido o Sin enlace. */
export function activacion(u) {
  if (u.activado_en) return 'Activa';
  if (!u.enlace_enviado_en) return 'Sin enlace';
  return new Date(u.enlace_vence) < new Date() ? 'Enlace vencido' : 'Pendiente de activación';
}

/** Lo que el navegador puede saber de un usuario (nunca la contraseña ni los datos internos de seguridad). */
export function usuarioPublico(u) {
  return {
    clave: u.clave, nombre: u.nombre, perfil: u.perfil, rol: NOMBRE_PERFIL[u.perfil] ?? u.perfil,
    tipoDocumento: u.tipo_documento, documento: u.documento, correo: u.correo, telefono: u.telefono ?? '',
    estado: u.estado, activacion: activacion(u), bloqueada: Boolean(u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()),
    enlaceVence: u.enlace_vence ?? null, ultimoIngreso: u.ultimo_ingreso ?? null, version: u.version,
  };
}

export async function buscarPorClave(clave) {
  const [u] = await consultar('SELECT * FROM usuario WHERE clave = ?', [String(clave ?? '')]);
  return u ?? null;
}
export async function buscarPorCorreo(correo) {
  const [u] = await consultar('SELECT * FROM usuario WHERE correo = ?', [String(correo ?? '').trim().toLowerCase()]);
  return u ?? null;
}

/** Crea un enlace de un solo uso y devuelve la dirección completa para el correo. */
export async function crearEnlace(clave, tipo) {
  const token = tokenAleatorio();
  const minutos = tipo === 'activacion' ? config.ingreso.horasActivacion * 60 : config.ingreso.minutosRecuperacion;
  // Un enlace nuevo anula los anteriores del mismo tipo.
  await consultar('UPDATE enlace_cuenta SET usado_en = NOW() WHERE usuario = ? AND tipo = ? AND usado_en IS NULL', [clave, tipo]);
  await consultar('INSERT INTO enlace_cuenta (token_hash, usuario, tipo, expira_en) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
    [sha256(token), clave, tipo, minutos]);
  // La versión sube para que el prototipo vea el nuevo estado de acceso en su próxima revisión.
  if (tipo === 'activacion')
    await consultar('UPDATE usuario SET enlace_enviado_en = NOW(), enlace_vence = DATE_ADD(NOW(), INTERVAL ? MINUTE), version = version + 1 WHERE clave = ?', [minutos, clave]);
  return `${config.publicoUrl}/plataforma/${tipo === 'activacion' ? 'activar' : 'restablecer'}/${token}`;
}

/**
 * Envía el enlace para crear la contraseña. Devuelve «enviado» o «sin enviar» (si el correo del servidor falla,
 * el enlace igual queda creado y se muestra en el registro de la API para no dejar a la persona sin acceso).
 */
export async function enviarActivacion(u, registrar = console.log) {
  const url = await crearEnlace(u.clave, 'activacion');
  try {
    await correos.invitacion(u.correo, u.nombre, NOMBRE_PERFIL[u.perfil] ?? u.perfil, url);
    return 'enviado';
  } catch (e) {
    registrar(`  No se pudo enviar el enlace de activación a ${u.nombre} (${e.code ?? e.message}).`);
    if (config.entorno !== 'produccion') registrar(`  Enlace (vence en ${config.ingreso.horasActivacion} horas): ${url}`);
    return 'sin enviar';
  }
}

/** Visitas sin aprobar asignadas a un inspector (no se puede inactivar ni cambiar de perfil mientras las tenga). */
export async function visitasAbiertas(clave) {
  const [{ n }] = await consultar(`SELECT COUNT(*) AS n FROM evaluacion WHERE inspector = ? AND estado IN (${ESTADOS_ABIERTOS.map(() => '?').join(',')})`,
    [clave, ...ESTADOS_ABIERTOS]);
  return Number(n);
}

/** El usuario tiene historial (ingresó alguna vez o tiene visitas): no se elimina, se inactiva. */
export async function tieneHistorial(u) {
  if (u.ultimo_ingreso) return true;
  const [{ n }] = await consultar('SELECT COUNT(*) AS n FROM evaluacion WHERE inspector = ? OR asignado_por = ? OR aprobada_por = ?', [u.clave, u.clave, u.clave]);
  return Number(n) > 0;
}

/** Registra en la bitácora (sin documento, correo ni teléfono). */
export async function bitacora(usuario, accion) {
  try { await consultar('INSERT INTO bitacora (usuario, accion) VALUES (?, ?)', [String(usuario || 'sistema').slice(0, 80), String(accion).slice(0, 300)]); }
  catch { /* la bitácora no debe impedir la operación */ }
}

export const datosDe = (u) => leerJson(u.datos);
