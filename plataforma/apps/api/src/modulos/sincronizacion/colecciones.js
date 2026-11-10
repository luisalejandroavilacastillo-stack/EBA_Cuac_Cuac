import { limpiarDocumento, limpiarTelefono } from '@eba/norma';
import { ErrorApi } from '../../utilidades/errores.js';

/**
 * Cómo se guarda cada colección del prototipo en MariaDB.
 * Cada registro viaja como { id, version, datos } donde «datos» es el objeto tal como lo usa la aplicación.
 */

const json = (v) => JSON.stringify(v);
// El driver de MariaDB puede entregar la columna JSON ya convertida en objeto.
const leer = (t) => (t == null ? null : typeof t === 'string' ? JSON.parse(t) : t);
const fechaISO = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : null);

/** Documento sin puntos ni espacios: es la llave del usuario. */
export const llaveUsuario = (d) => String(d ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 20);

/* ---------------------------------------------------------------- fincas */

/** Arma el objeto del prototipo para fincas registradas desde /plataforma/ (sin columna «datos»). */
function fincaDesdeTablas(f, especies) {
  return {
    id: f.codigo, nombre: f.nombre, productor: f.persona_nombre ?? '',
    titular: f.persona_nombre ? { nombre: f.persona_nombre, tipoDoc: f.tipo_documento, doc: f.numero_documento,
      correo: f.correo ?? '', tel: f.telefono, autoriza: Boolean(f.autoriza_datos) } : null,
    depto: f.departamento_nombre, mpio: f.municipio, vereda: f.vereda ?? '', estado: f.estado, area: 0,
    especies: especies.map((e) => ({
      sp: e.especie, proposito: e.proposito, sistema: e.sistema ?? undefined, conCorral: Boolean(e.con_corral),
      ...(e.especie === 'pato' ? { permanencia: Boolean(e.permanencia_corral), cama: Boolean(e.con_cama) } : {}),
      inventario: [{ cat: 'General', n: e.numero_aves, edad: 0, peso: 0 }],
    })),
  };
}

async function leerFincas(con) {
  const filas = await con.query(`
    SELECT f.id, f.codigo, f.nombre, f.municipio, f.vereda, f.estado, f.datos, f.version, d.nombre AS departamento_nombre,
           p.nombre AS persona_nombre, p.tipo_documento, p.numero_documento, p.correo, p.telefono, p.autoriza_datos
    FROM finca f JOIN departamento d ON d.codigo_dane = f.departamento
    LEFT JOIN persona_responsable p ON p.id = f.persona_id ORDER BY f.id`);
  const esp = await con.query('SELECT * FROM finca_especie ORDER BY FIELD(especie, \'pato\', \'ganso\')');
  return filas.map((f) => ({
    id: f.codigo, version: f.version,
    datos: leer(f.datos) ?? fincaDesdeTablas(f, esp.filter((e) => e.finca_id === f.id)),
  }));
}

/** La persona responsable se guarda en su tabla solo si sus datos cumplen las reglas; si no, queda en «datos». */
async function guardarPersona(con, t) {
  if (!t || !['CC', 'CE', 'NIT', 'PAS', 'PPT'].includes(t.tipoDoc) || t.autoriza !== true) return null;
  const tel = limpiarTelefono(t.tel), correo = String(t.correo ?? '').trim().toLowerCase();
  if (!/^(3\d{9}|60\d{8})$/.test(tel) || (correo && correo !== '—' && !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(correo))) return null;
  const doc = limpiarDocumento(t.tipoDoc, t.doc);
  if (!doc) return null;
  await con.query(
    `INSERT INTO persona_responsable (nombre, tipo_documento, numero_documento, correo, telefono, autoriza_datos)
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), nombre = VALUES(nombre), correo = VALUES(correo), telefono = VALUES(telefono)`,
    [String(t.nombre ?? '').trim().slice(0, 120), t.tipoDoc, doc, correo && correo !== '—' ? correo : null, tel]);
  const [{ id }] = await con.query('SELECT LAST_INSERT_ID() AS id');
  return id;
}

async function escribirFinca(con, id, f, version, usuario) {
  if (!/^FIN-\d{4}-\d{5}$/.test(id) || f.id !== id) throw new ErrorApi(400, 'Código de finca inválido');
  const [dep] = await con.query('SELECT codigo_dane FROM departamento WHERE nombre = ?', [String(f.depto ?? '').trim()]);
  if (!dep) throw new ErrorApi(422, `El departamento «${f.depto}» no está en el catálogo`);
  const personaId = await guardarPersona(con, f.titular);
  const cols = [String(f.nombre ?? '').trim().slice(0, 120) || id, dep.codigo_dane, String(f.mpio ?? '').trim().slice(0, 80),
    String(f.vereda ?? '').trim().slice(0, 80) || null, personaId, f.estado === 'INACTIVA' ? 'INACTIVA' : 'ACTIVA',
    f.estado === 'INACTIVA' ? 'Inactivada desde la aplicación' : null, json(f), usuario];
  let fincaId;
  if (version == null) {
    const r = await con.query(
      `INSERT INTO finca (codigo, nombre, departamento, municipio, vereda, persona_id, estado, motivo_estado, datos, modificado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, ...cols]);
    fincaId = r.insertId;
  } else {
    const r = await con.query(
      `UPDATE finca SET nombre = ?, departamento = ?, municipio = ?, vereda = ?, persona_id = ?, estado = ?, motivo_estado = ?,
              datos = ?, modificado_por = ?, version = version + 1 WHERE codigo = ? AND version = ?`, [...cols, id, version]);
    if (!r.affectedRows) return null;
    [{ id: fincaId }] = await con.query('SELECT id FROM finca WHERE codigo = ?', [id]);
  }
  await con.query('DELETE FROM finca_especie WHERE finca_id = ?', [fincaId]);
  for (const e of Array.isArray(f.especies) ? f.especies : []) {
    if (!['pato', 'ganso'].includes(e.sp)) continue;
    const aves = (e.inventario ?? []).reduce((t, c) => t + (Math.max(0, Number(c.n) || 0)), 0);
    await con.query(
      `INSERT INTO finca_especie (finca_id, especie, numero_aves, proposito, sistema, con_corral, permanencia_corral, con_cama)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fincaId, e.sp, Math.min(aves, 1_000_000), String(e.proposito ?? 'Carne').slice(0, 40), e.sistema ? String(e.sistema).slice(0, 30) : null,
        e.conCorral !== false, e.sp === 'pato' ? e.permanencia !== false : null, e.sp === 'pato' ? e.cama !== false : null]);
  }
  return true;
}

/* ---------------------------------------------------------------- definición de colecciones */

export const COLECCIONES = {
  fincas: {
    tabla: 'finca', llave: 'codigo',
    leer: leerFincas,
    escribir: escribirFinca,
  },
  evals: {
    tabla: 'evaluacion', llave: 'codigo',
    async leer(con) {
      return (await con.query('SELECT codigo, version, datos FROM evaluacion ORDER BY codigo')).map((f) => ({ id: f.codigo, version: f.version, datos: leer(f.datos) }));
    },
    async escribir(con, id, e, version, usuario) {
      if (!/^EVA-\d{4}-\d{5}$/.test(id) || e.id !== id) throw new ErrorApi(400, 'Código de evaluación inválido');
      if (!['pato', 'ganso'].includes(e.sp)) throw new ErrorApi(400, 'Especie inválida');
      const cols = [e.finca, e.sp, String(e.estado ?? 'Programada').slice(0, 30), fechaISO(e.fecha), e.inspector ? String(e.inspector).slice(0, 30) : null,
        e.proceso ? String(e.proceso).slice(0, 14) : null, Math.max(0, Math.min(255, Number(e.visita) || 0)), json(e), usuario];
      if (version == null) {
        await con.query(`INSERT INTO evaluacion (finca_codigo, especie, estado, fecha, inspector, proceso, visita, datos, modificado_por, codigo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...cols, id]);
        return true;
      }
      const r = await con.query(`UPDATE evaluacion SET finca_codigo = ?, especie = ?, estado = ?, fecha = ?, inspector = ?, proceso = ?, visita = ?,
        datos = ?, modificado_por = ?, version = version + 1 WHERE codigo = ? AND version = ?`, [...cols, id, version]);
      return r.affectedRows ? true : null;
    },
  },
  procesos: {
    tabla: 'proceso', llave: 'codigo',
    async leer(con) {
      return (await con.query('SELECT codigo, version, datos FROM proceso ORDER BY codigo')).map((f) => ({ id: f.codigo, version: f.version, datos: leer(f.datos) }));
    },
    async escribir(con, id, p, version, usuario) {
      if (!/^PRC-[0-9A-Z-]{4,10}$/.test(id)) throw new ErrorApi(400, 'Código de proceso inválido');
      if (version == null) { await con.query('INSERT INTO proceso (codigo, datos, modificado_por) VALUES (?, ?, ?)', [id, json(p), usuario]); return true; }
      const r = await con.query('UPDATE proceso SET datos = ?, modificado_por = ?, version = version + 1 WHERE codigo = ? AND version = ?', [json(p), usuario, id, version]);
      return r.affectedRows ? true : null;
    },
  },
  usuarios: {
    tabla: 'usuario', llave: 'documento',
    async leer(con) {
      return (await con.query('SELECT documento, version, datos FROM usuario ORDER BY creado_en, documento')).map((f) => ({ id: f.documento, version: f.version, datos: leer(f.datos) }));
    },
    async escribir(con, id, u, version) {
      if (!id || llaveUsuario(u.d) !== id) throw new ErrorApi(400, 'Documento de usuario inválido');
      const cols = [String(u.n ?? '').slice(0, 120), String(u.r ?? '').slice(0, 60), u.c && u.c !== '—' ? String(u.c).slice(0, 120) : null, String(u.e ?? 'Activo').slice(0, 20), json(u)];
      if (version == null) { await con.query('INSERT INTO usuario (nombre, rol, correo, estado, datos, documento) VALUES (?, ?, ?, ?, ?, ?)', [...cols, id]); return true; }
      const r = await con.query('UPDATE usuario SET nombre = ?, rol = ?, correo = ?, estado = ?, datos = ?, version = version + 1 WHERE documento = ? AND version = ?', [...cols, id, version]);
      return r.affectedRows ? true : null;
    },
  },
};
