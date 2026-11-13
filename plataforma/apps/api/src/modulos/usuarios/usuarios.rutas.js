import { Router } from 'express';
import { limpiarDocumento, limpiarNombre, limpiarTelefono, validarPersona } from '@eba/norma';
import { consultar } from '../../bd/conexion.js';
import { ErrorApi, datosInvalidos } from '../../utilidades/errores.js';
import {
  NOMBRE_PERFIL, bitacora, buscarPorClave, datosDe, enviarActivacion, tieneHistorial, usuarioPublico, visitasAbiertas,
} from '../auth/cuentas.js';
import { cerrarSesionesDe, requerirPerfil } from '../auth/sesiones.js';
import { asegurarPrimerAdministrador } from '../auth/primer_admin.js';
import { llaveUsuario } from '../sincronizacion/colecciones.js';

/**
 * Gestión de usuarios (CU-24). Solo el administrador. Las cuentas se crean sin contraseña: la persona recibe en su
 * correo un enlace de un solo uso (48 horas) para crearla.
 *   GET    /api/usuarios
 *   POST   /api/usuarios                 { nombre, tipoDocumento, documento, correo, telefono?, perfil }
 *   PATCH  /api/usuarios/:clave          { version, nombre?, tipoDocumento?, documento?, correo?, telefono?, perfil? }
 *   POST   /api/usuarios/:clave/estado   { estado: 'Activo' | 'Inactivo' }
 *   POST   /api/usuarios/:clave/enlace   reenvía el enlace de activación
 *   DELETE /api/usuarios/:clave          solo si no tiene historial; si lo tiene, se inactiva
 * Los datos quedan también en el formato del prototipo (columna «datos»), que los sigue leyendo por la sincronización.
 */
export const rutasUsuarios = Router();
rutasUsuarios.use(requerirPerfil('admin'));

const TIPOS = ['CC', 'CE', 'NIT', 'PAS', 'PPT'];

function validar(d) {
  const p = validarPersona({ nombre: d.nombre, tipoDocumento: d.tipoDocumento, numeroDocumento: d.documento, correo: d.correo,
    telefono: d.telefono ? d.telefono : '3000000000', autorizaDatos: true }, false);
  const e = {};
  if (p['persona.nombre']) e.nombre = p['persona.nombre'];
  if (p['persona.tipoDocumento'] || !TIPOS.includes(d.tipoDocumento)) e.tipoDocumento = 'Seleccione el tipo de documento.';
  else if (p['persona.numeroDocumento']) e.documento = p['persona.numeroDocumento'];
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(String(d.correo ?? '').trim())) e.correo = 'Escriba un correo válido: allí llegará el enlace para crear la contraseña.';
  if (d.telefono && p['persona.telefono']) e.telefono = p['persona.telefono'];
  if (!NOMBRE_PERFIL[d.perfil]) e.perfil = 'Seleccione el perfil.';
  if (Object.keys(e).length) throw datosInvalidos(e);
  return {
    nombre: limpiarNombre(d.nombre), tipoDoc: d.tipoDocumento, doc: llaveUsuario(limpiarDocumento(d.tipoDocumento, d.documento)),
    correo: String(d.correo).trim().toLowerCase(), tel: d.telefono ? limpiarTelefono(d.telefono) : '', perfil: d.perfil,
  };
}

async function repetidos(t, clave) {
  const filas = await consultar('SELECT clave, nombre, correo, tipo_documento, documento FROM usuario WHERE (correo = ? OR (tipo_documento = ? AND documento = ?)) AND clave <> ?',
    [t.correo, t.tipoDoc, t.doc, clave ?? '']);
  const e = {};
  for (const o of filas) {
    if (o.correo === t.correo) e.correo = `Ese correo ya lo usa ${o.nombre}.`;
    if (o.tipo_documento === t.tipoDoc && o.documento === t.doc) e.documento = `Ese documento ya está registrado a nombre de ${o.nombre}.`;
  }
  if (Object.keys(e).length) throw new ErrorApi(409, 'Ya existe un usuario con ese correo o documento.', { campos: e });
}

/** Fincas cuya persona responsable tiene el mismo documento (el productor las ve). */
async function fincasDe(t) {
  const [{ n }] = await consultar(`SELECT COUNT(*) AS n FROM finca f JOIN persona_responsable p ON p.id = f.persona_id
    WHERE p.tipo_documento = ? AND REPLACE(REPLACE(UPPER(p.numero_documento), '-', ''), '.', '') = ?`, [t.tipoDoc, t.doc]);
  return Number(n);
}

async function usuarioDeRuta(req) {
  const u = await buscarPorClave(req.params.clave);
  if (!u) throw new ErrorApi(404, 'El usuario no existe.');
  return u;
}

/** Último administrador activo: no se le quita el perfil ni se inactiva. */
async function esUltimoAdmin(u) {
  if (u.perfil !== 'admin') return false;
  const [{ n }] = await consultar("SELECT COUNT(*) AS n FROM usuario WHERE perfil = 'admin' AND estado = 'Activo' AND clave <> ?", [u.clave]);
  return !Number(n);
}

async function guardarDatos(u, cambios) {
  const datos = { ...datosDe(u), nombre: u.nombre, perfil: u.perfil, tipoDoc: u.tipo_documento, doc: u.documento, correo: u.correo,
    tel: u.telefono ?? '', estado: u.estado, ...cambios };
  delete datos.activacion;
  await consultar(`UPDATE usuario SET nombre = ?, perfil = ?, tipo_documento = ?, documento = ?, correo = ?, telefono = ?, estado = ?, datos = ?,
    version = version + 1 WHERE clave = ?`,
  [datos.nombre, datos.perfil, datos.tipoDoc, datos.doc, datos.correo, datos.tel || null, datos.estado, JSON.stringify(datos), u.clave]);
}

rutasUsuarios.get('/', async (req, res) => {
  const filas = await consultar("SELECT * FROM usuario ORDER BY FIELD(perfil, 'admin', 'coordinador', 'inspector', 'productor'), nombre");
  res.json({ usuarios: filas.map(usuarioPublico) });
});

rutasUsuarios.post('/', async (req, res) => {
  const t = validar(req.body ?? {});
  await repetidos(t);
  const clave = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const datos = { ...t, estado: 'Activo', creado: { por: req.yo.clave, fecha: new Date().toISOString() } };
  await consultar('INSERT INTO usuario (clave, nombre, perfil, tipo_documento, documento, correo, telefono, estado, datos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [clave, t.nombre, t.perfil, t.tipoDoc, t.doc, t.correo, t.tel || null, 'Activo', JSON.stringify(datos)]);
  const u = await buscarPorClave(clave);
  const enlace = await enviarActivacion(u);
  const fincas = t.perfil === 'productor' ? await fincasDe(t) : 0;
  await bitacora(req.yo.nombre, `Creación del usuario ${t.nombre} con perfil ${NOMBRE_PERFIL[t.perfil]}${fincas ? ` (vinculado a ${fincas} finca${fincas > 1 ? 's' : ''})` : ''}`);
  if (t.perfil === 'admin') asegurarPrimerAdministrador();
  res.status(201).json({ usuario: usuarioPublico(await buscarPorClave(clave)), enlace, fincas });
});

rutasUsuarios.patch('/:clave', async (req, res) => {
  const u = await usuarioDeRuta(req), d = req.body ?? {};
  if (Number.isInteger(d.version) && d.version !== u.version)
    throw new ErrorApi(409, 'Otra persona modificó este usuario. Se cargó la versión más reciente.', { actual: usuarioPublico(u) });
  const t = validar({
    nombre: d.nombre ?? u.nombre, tipoDocumento: d.tipoDocumento ?? u.tipo_documento, documento: d.documento ?? u.documento,
    correo: d.correo ?? u.correo, telefono: d.telefono ?? u.telefono ?? '', perfil: d.perfil ?? u.perfil,
  });
  await repetidos(t, u.clave);
  const propio = u.clave === req.yo.clave, cambiaPerfil = t.perfil !== u.perfil;
  if (cambiaPerfil && propio) throw new ErrorApi(400, 'No puede cambiar su propio perfil.', { campos: { perfil: 'No puede cambiar su propio perfil.' } });
  if (cambiaPerfil && (await esUltimoAdmin(u))) throw new ErrorApi(400, 'Debe quedar al menos un administrador activo.', { campos: { perfil: 'Es el único administrador activo.' } });
  if (cambiaPerfil && u.perfil === 'inspector') {
    const n = await visitasAbiertas(u.clave);
    if (n) { const m = `Tiene ${n} visita${n > 1 ? 's' : ''} sin aprobar: el coordinador debe reasignarla${n > 1 ? 's' : ''} antes de cambiar el perfil.`; throw new ErrorApi(400, m, { campos: { perfil: m } }); }
  }
  const correoNuevo = t.correo !== u.correo;
  await guardarDatos(u, t);
  if (cambiaPerfil || correoNuevo) await cerrarSesionesDe(u.clave);   // el cambio aplica de inmediato
  // Si cambia el correo de una cuenta sin activar, el enlace se envía al correo nuevo.
  let enlace = null;
  if (correoNuevo && !u.activado_en) enlace = await enviarActivacion(await buscarPorClave(u.clave));
  const fincas = t.perfil === 'productor' ? await fincasDe(t) : 0;
  await bitacora(req.yo.nombre, `Edición del usuario ${t.nombre}${cambiaPerfil ? `: perfil ${NOMBRE_PERFIL[u.perfil]} → ${NOMBRE_PERFIL[t.perfil]}` : ''}`);
  res.json({ usuario: usuarioPublico(await buscarPorClave(u.clave)), enlace, fincas });
});

rutasUsuarios.post('/:clave/estado', async (req, res) => {
  const u = await usuarioDeRuta(req), estado = req.body?.estado;
  if (!['Activo', 'Inactivo'].includes(estado)) throw new ErrorApi(400, 'Estado inválido.');
  if (estado === u.estado) return res.json({ usuario: usuarioPublico(u) });
  if (estado === 'Inactivo') {
    if (u.clave === req.yo.clave) throw new ErrorApi(400, 'No puede inactivar su propia cuenta.');
    if (await esUltimoAdmin(u)) throw new ErrorApi(400, 'Debe quedar al menos un administrador activo.');
    const n = u.perfil === 'inspector' ? await visitasAbiertas(u.clave) : 0;
    if (n) throw new ErrorApi(400, `Tiene ${n} visita${n > 1 ? 's' : ''} sin aprobar: el coordinador debe reasignarla${n > 1 ? 's' : ''} antes de inactivarlo.`);
  }
  await guardarDatos(u, { estado });
  if (estado === 'Inactivo') await cerrarSesionesDe(u.clave);
  await bitacora(req.yo.nombre, `${estado === 'Activo' ? 'Reactivación' : 'Inactivación'} del usuario ${u.nombre}`);
  res.json({ usuario: usuarioPublico(await buscarPorClave(u.clave)) });
});

rutasUsuarios.post('/:clave/enlace', async (req, res) => {
  const u = await usuarioDeRuta(req);
  if (u.estado !== 'Activo') throw new ErrorApi(400, 'Reactive la cuenta antes de enviar el enlace.');
  if (u.activado_en) throw new ErrorApi(400, 'Esta cuenta ya está activada. Si olvidó la contraseña, puede restablecerla desde «¿Olvidó su contraseña?».');
  const enlace = await enviarActivacion(u);
  if (enlace !== 'enviado') throw new ErrorApi(503, 'No se pudo enviar el correo. Revise la configuración del correo del servidor.');
  await bitacora(req.yo.nombre, `Envío del enlace de activación a ${u.nombre}`);
  res.json({ usuario: usuarioPublico(await buscarPorClave(u.clave)), enlace });
});

rutasUsuarios.delete('/:clave', async (req, res) => {
  const u = await usuarioDeRuta(req);
  if (u.clave === req.yo.clave) throw new ErrorApi(400, 'No puede eliminar su propia cuenta.');
  if (await esUltimoAdmin(u)) throw new ErrorApi(400, 'Debe quedar al menos un administrador activo.');
  if (await tieneHistorial(u)) throw new ErrorApi(409, 'Este usuario ya tiene historial (ingresos o visitas): inactívelo para conservarlo.');
  await consultar('DELETE FROM usuario WHERE clave = ?', [u.clave]);
  await bitacora(req.yo.nombre, `Eliminación del usuario ${u.nombre} (sin historial)`);
  res.status(204).end();
});
