import { Router } from 'express';
import { createHash } from 'node:crypto';
import { config } from '../../config/config.js';
import { enTransaccion, obtenerPool } from '../../bd/conexion.js';
import { ErrorApi } from '../../utilidades/errores.js';
import { COLECCIONES } from './colecciones.js';

/**
 * Sincronización del prototipo con MariaDB.
 *   GET    /api/sincronizacion                     todos los datos (fincas, evals, procesos, usuarios y bitácora)
 *   GET    /api/sincronizacion/sello               huella corta para saber si algo cambió (consulta periódica)
 *   PUT    /api/sincronizacion/:coleccion/:id      crea o actualiza un registro { version, datos }
 *   DELETE /api/sincronizacion/:coleccion/:id      elimina un registro (?version=N)
 *   POST   /api/sincronizacion/bitacora            agrega entradas { entradas: [{ h, t, u, a }] }
 * «version» evita sobrescrituras: si otra persona cambió el registro, responde 409 con la versión actual.
 */
export const rutasSincronizacion = Router();

const usuarioDe = (req) => {
  let u = String(req.get('X-EBA-Usuario') ?? '');
  try { u = decodeURIComponent(u); } catch { /* se deja como llegó */ }
  return u.slice(0, 80) || 'sin sesión';
};
const coleccion = (nombre) => {
  const c = COLECCIONES[nombre];
  if (!c) throw new ErrorApi(404, `La colección «${nombre}» no existe`);
  return c;
};

async function leerBitacora(con) {
  const filas = await con.query('SELECT * FROM (SELECT id, fecha, fecha_original, usuario, accion, huella FROM bitacora ORDER BY id DESC LIMIT 300) b ORDER BY id');
  return filas.map((b) => ({ h: b.huella ?? `srv-${b.id}`, t: b.fecha_original ?? new Date(b.fecha).toISOString(), u: b.usuario, a: b.accion }));
}

async function sello(con) {
  const filas = await con.query(`
    SELECT 'f' k, COUNT(*) n, COALESCE(SUM(version), 0) v FROM finca UNION ALL
    SELECT 'e', COUNT(*), COALESCE(SUM(version), 0) FROM evaluacion UNION ALL
    SELECT 'p', COUNT(*), COALESCE(SUM(version), 0) FROM proceso UNION ALL
    SELECT 'u', COUNT(*), COALESCE(SUM(version), 0) FROM usuario UNION ALL
    SELECT 'b', COUNT(*), COALESCE(MAX(id), 0) FROM bitacora`);
  return createHash('sha1').update(filas.map((f) => `${f.k}${f.n}.${f.v}`).join('|')).digest('hex').slice(0, 16);
}

rutasSincronizacion.get('/', async (req, res) => {
  const con = await obtenerPool().getConnection();
  try {
    const colecciones = {};
    for (const [nombre, c] of Object.entries(COLECCIONES)) colecciones[nombre] = await c.leer(con);
    const vacio = !colecciones.fincas.length && !colecciones.evals.length && !colecciones.usuarios.length;
    res.json({
      vacio, datosEjemplo: config.datosEjemplo, sello: await sello(con), colecciones, bitacora: await leerBitacora(con),
      asistente: { disponible: Boolean(config.gemini.clave), modelo: config.gemini.clave ? config.gemini.modelo : null },
      catalogos: { departamentos: (await con.query('SELECT nombre FROM departamento ORDER BY nombre')).map((d) => d.nombre) },
    });
  } finally {
    con.release();
  }
});

rutasSincronizacion.get('/sello', async (req, res) => {
  const con = await obtenerPool().getConnection();
  try { res.json({ sello: await sello(con) }); } finally { con.release(); }
});

rutasSincronizacion.post('/bitacora', async (req, res) => {
  const entradas = Array.isArray(req.body?.entradas) ? req.body.entradas.slice(0, 500) : [];
  let insertadas = 0;
  await enTransaccion(async (con) => {
    for (const e of entradas) {
      if (!e?.h || !e?.a) continue;
      const t = String(e.t ?? ''), fecha = isNaN(Date.parse(t)) ? new Date() : new Date(t);
      const r = await con.query(
        'INSERT IGNORE INTO bitacora (fecha, fecha_original, usuario, accion, huella) VALUES (?, ?, ?, ?, ?)',
        [fecha, t.slice(0, 30) || null, String(e.u ?? '—').slice(0, 80), String(e.a).slice(0, 300), String(e.h).slice(0, 40)]);
      insertadas += r.affectedRows;
    }
  });
  res.json({ insertadas });
});

/** Respuesta 409 con lo que hay ahora en la base, para que la pantalla se actualice. */
async function conflicto(c, id, mensaje) {
  const con = await obtenerPool().getConnection();
  try {
    const actual = (await c.leer(con)).find((r) => r.id === id) ?? null;
    return new ErrorApi(409, mensaje, { actual });
  } finally { con.release(); }
}

rutasSincronizacion.put('/:coleccion/:id', async (req, res) => {
  const c = coleccion(req.params.coleccion), id = req.params.id;
  const { version = null, datos } = req.body ?? {};
  if (!datos || typeof datos !== 'object') throw new ErrorApi(400, 'Faltan los datos del registro');
  if (version !== null && !Number.isInteger(version)) throw new ErrorApi(400, 'Versión inválida');
  // Solo el ICA registra fincas (RN-51, CU-04). Mientras llega el ingreso real, el rol viene en X-EBA-Rol;
  // con el ingreso real se tomará de la sesión y no se podrá cambiar desde el navegador.
  if (req.params.coleccion === 'fincas' && version === null && req.get('X-EBA-Rol') === 'productor')
    throw new ErrorApi(403, 'El productor no puede registrar fincas: las registra el ICA (inspector, coordinador o administrador).');
  let ok;
  try {
    ok = await enTransaccion((con) => c.escribir(con, id, datos, version, usuarioDe(req)));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw await conflicto(c, id, 'Ese registro ya existe: otra persona lo creó al mismo tiempo.');
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new ErrorApi(422, 'El registro hace referencia a una finca que todavía no está guardada.');
    throw e;
  }
  if (!ok) throw await conflicto(c, id, 'Otra persona modificó este registro. Se cargó la versión más reciente.');
  const con = await obtenerPool().getConnection();
  try {
    const [f] = await con.query(`SELECT version FROM ${c.tabla} WHERE ${c.llave} = ?`, [id]);
    res.json({ id, version: f.version });
  } finally { con.release(); }
});

rutasSincronizacion.delete('/:coleccion/:id', async (req, res) => {
  const c = coleccion(req.params.coleccion), id = req.params.id, version = Number(req.query.version);
  if (!Number.isInteger(version)) throw new ErrorApi(400, 'Falta la versión');
  let r;
  try {
    r = await obtenerPool().query(`DELETE FROM ${c.tabla} WHERE ${c.llave} = ? AND version = ?`, [id, version]);
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new ErrorApi(409, 'No se puede eliminar: tiene evaluaciones registradas.');
    throw e;
  }
  if (!r.affectedRows) {
    const [existe] = await obtenerPool().query(`SELECT 1 FROM ${c.tabla} WHERE ${c.llave} = ?`, [id]);
    if (existe) throw await conflicto(c, id, 'Otra persona modificó este registro antes de eliminarlo.');
  }
  res.status(204).end();
});
