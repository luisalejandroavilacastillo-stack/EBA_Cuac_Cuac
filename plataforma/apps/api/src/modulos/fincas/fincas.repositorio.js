import { limpiarDocumento, limpiarNombre, limpiarTelefono } from '@eba/norma';
import { consultar } from '../../bd/conexion.js';
import { registrarBitacora } from '../bitacora.js';

/** Acceso a datos de fincas en MariaDB. Todas las consultas usan parámetros «?» (sin concatenar texto). */

const SELECT_FINCA = `
  SELECT f.id, f.codigo, f.nombre, f.departamento, d.nombre AS departamento_nombre, f.municipio, f.vereda,
         f.estado, f.creado_en, p.nombre AS persona_nombre, p.tipo_documento, p.numero_documento, p.correo, p.telefono,
         p.autoriza_datos
  FROM finca f
  JOIN departamento d ON d.codigo_dane = f.departamento
  JOIN persona_responsable p ON p.id = f.persona_id`;

async function especiesDe(ids) {
  if (!ids.length) return new Map();
  const filas = await consultar(
    `SELECT finca_id, especie, numero_aves, proposito, sistema, con_corral FROM finca_especie
     WHERE finca_id IN (?) ORDER BY FIELD(especie, 'pato', 'ganso')`, [ids]);
  const m = new Map();
  for (const f of filas) {
    if (!m.has(f.finca_id)) m.set(f.finca_id, []);
    m.get(f.finca_id).push(f);
  }
  return m;
}

/** Lista de fincas con filtro por texto (nombre, código o municipio) y estado. */
export async function listarFincas({ q, estado } = {}) {
  const cond = [], par = [];
  if (q) { cond.push('(f.nombre LIKE ? OR f.codigo LIKE ? OR f.municipio LIKE ?)'); const t = `%${q}%`; par.push(t, t, t); }
  if (estado) { cond.push('f.estado = ?'); par.push(estado); }
  const filas = await consultar(`${SELECT_FINCA} ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY f.creado_en DESC, f.id DESC LIMIT 500`, par);
  const esp = await especiesDe(filas.map((f) => f.id));
  return filas.map((f) => ({ ...f, especies: esp.get(f.id) ?? [] }));
}

export async function buscarFinca(codigo) {
  const [f] = await consultar(`${SELECT_FINCA} WHERE f.codigo = ?`, [codigo]);
  if (!f) return null;
  return { ...f, especies: (await especiesDe([f.id])).get(f.id) ?? [] };
}

/** ¿Ya hay una finca con ese nombre en ese municipio y departamento? */
export async function existeFinca(nombre, departamento, municipio) {
  const [f] = await consultar(
    'SELECT codigo FROM finca WHERE nombre = ? AND departamento = ? AND municipio = ? LIMIT 1',
    [nombre, departamento, municipio]);
  return f?.codigo ?? null;
}

/**
 * Registra la finca, su persona responsable y sus especies en una sola transacción.
 * Si la persona ya existe (mismo tipo y número de documento), se actualizan sus datos de contacto.
 */
export async function crearFinca(con, r, usuario) {
  const p = r.persona;
  const tipo = p.tipoDocumento, doc = limpiarDocumento(tipo, p.numeroDocumento);
  const correo = String(p.correo ?? '').trim().toLowerCase() || null;
  await con.query(
    `INSERT INTO persona_responsable (nombre, tipo_documento, numero_documento, correo, telefono, autoriza_datos)
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), nombre = VALUES(nombre), correo = VALUES(correo),
       telefono = VALUES(telefono), autoriza_datos = TRUE, fecha_autorizacion = CURRENT_TIMESTAMP`,
    [limpiarNombre(p.nombre), tipo, doc, correo, limpiarTelefono(p.telefono)]);
  const [{ id: personaId }] = await con.query('SELECT LAST_INSERT_ID() AS id');

  // Código FIN-AAAA-NNNNN: siguiente consecutivo del año, saltando los que ya usó el prototipo.
  const anio = new Date().getFullYear();
  let codigo;
  do {
    await con.query(
      `INSERT INTO consecutivo (tipo, anio, ultimo) VALUES ('FIN', ?, 1) ON DUPLICATE KEY UPDATE ultimo = ultimo + 1`, [anio]);
    const [{ ultimo }] = await con.query(`SELECT ultimo FROM consecutivo WHERE tipo = 'FIN' AND anio = ? FOR UPDATE`, [anio]);
    codigo = `FIN-${anio}-${String(ultimo).padStart(5, '0')}`;
  } while ((await con.query('SELECT 1 FROM finca WHERE codigo = ?', [codigo])).length);

  const nombre = limpiarNombre(r.nombre);
  const ins = await con.query(
    `INSERT INTO finca (codigo, nombre, departamento, municipio, vereda, persona_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [codigo, nombre, r.departamento, limpiarNombre(r.municipio), limpiarNombre(r.vereda) || null, personaId]);
  const fincaId = Number(ins.insertId);
  for (const s of r.especies) {
    const pato = s.especie === 'pato';
    await con.query(
      `INSERT INTO finca_especie (finca_id, especie, numero_aves, permanencia_corral, con_cama) VALUES (?, ?, ?, ?, ?)`,
      [fincaId, s.especie, s.numeroAves, pato ? true : null, pato ? true : null]);
  }
  await registrarBitacora(con, usuario, `Registro de la finca ${codigo} · ${nombre}`);
  return codigo;
}
