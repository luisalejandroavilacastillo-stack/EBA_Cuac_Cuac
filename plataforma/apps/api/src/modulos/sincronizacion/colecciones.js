import { limpiarDocumento, limpiarTelefono } from '@eba/norma';
import { ErrorApi } from '../../utilidades/errores.js';
import { activacion } from '../auth/cuentas.js';

/**
 * Cómo se guarda cada colección del prototipo en MariaDB.
 * Cada registro viaja como { id, version, datos } donde «datos» es el objeto tal como lo usa la aplicación.
 */

const json = (v) => JSON.stringify(v);
// El driver de MariaDB puede entregar la columna JSON ya convertida en objeto.
const leer = (t) => (t == null ? null : typeof t === 'string' ? JSON.parse(t) : t);
const fechaISO = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v ?? '')) ? String(v).slice(0, 10) : null);

/** Documento sin puntos ni espacios: es la llave del usuario. */
const sinActivacion = ({ activacion: _a, ...u }) => u;
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

/* ---------------------------------------------------------------- evaluación: revisión, reprogramaciones y constancia (v0.25) */

export const PERFILES = ['admin', 'coordinador', 'inspector', 'productor'];
const fecha = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v) : null);
const REVISION = { Enviada: 'Enviada', Reenviada: 'Reenviada', Devuelta: 'Devuelta', Aprobada: 'Aprobada' };

/** Copia en tablas consultables lo que la aplicación guarda dentro de la evaluación (se ven en DBeaver). */
async function escribirHijosEvaluacion(con, id, e) {
  await con.query('DELETE FROM revision_evaluacion WHERE evaluacion = ?', [id]);
  for (const r of Array.isArray(e.revision) ? e.revision : []) {
    if (!REVISION[r.accion] || !fecha(r.fecha)) continue;
    await con.query('INSERT IGNORE INTO revision_evaluacion (evaluacion, accion, usuario, fecha, observacion) VALUES (?, ?, ?, ?, ?)',
      [id, r.accion, String(r.por ?? '—').slice(0, 40), fecha(r.fecha), r.obs ? String(r.obs).slice(0, 1000) : null]);
  }
  await con.query('DELETE FROM reprogramacion WHERE evaluacion = ?', [id]);
  for (const r of Array.isArray(e.reprogramaciones) ? e.reprogramaciones : []) {
    if (!fechaISO(r.antes) || !fechaISO(r.nueva) || r.antes === r.nueva || !fecha(r.fecha)) continue;
    await con.query('INSERT IGNORE INTO reprogramacion (evaluacion, fecha_anterior, fecha_nueva, motivo, usuario, registrada_en) VALUES (?, ?, ?, ?, ?, ?)',
      [id, fechaISO(r.antes), fechaISO(r.nueva), String(r.motivo ?? '').slice(0, 300) || '—', r.por ? String(r.por).slice(0, 40) : null, fecha(r.fecha)]);
  }
  const c = e.constancia;
  if (c && /^CER-\d{4}-\d{5}$/.test(c.codigo) && fecha(c.emitida) && fechaISO(c.vence)) {
    // La constancia no cambia una vez emitida: solo se inserta.
    await con.query(`INSERT IGNORE INTO constancia (codigo, verificacion, evaluacion, finca_codigo, especie, puntaje, nivel, emitida_en, vence, aprobada_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [c.codigo, String(c.verificacion ?? '').slice(0, 9), id, e.finca, e.sp,
      Number.isFinite(c.puntaje) ? c.puntaje : null, c.nivel ? String(c.nivel).slice(0, 20) : null, fecha(c.emitida), fechaISO(c.vence),
      e.aprobada && e.aprobada.por ? String(e.aprobada.por).slice(0, 40) : null]);
  }
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
      const asig = e.asignacion || {}, apr = e.aprobada || {};
      const cols = [e.finca, e.sp, String(e.estado ?? 'Programada').slice(0, 30), fechaISO(e.fecha), e.inspector ? String(e.inspector).slice(0, 40) : null,
        asig.por ? String(asig.por).slice(0, 40) : null, fecha(asig.fecha), e.estado === 'Programada' ? null : fecha(e.finalizada),
        apr.por ? String(apr.por).slice(0, 40) : null, fecha(apr.fecha),
        e.proceso ? String(e.proceso).slice(0, 14) : null, Math.max(0, Math.min(255, Number(e.visita) || 0)), json(e), usuario];
      if (version == null) {
        await con.query(`INSERT INTO evaluacion (finca_codigo, especie, estado, fecha, inspector, asignado_por, asignado_en, enviada_en, aprobada_por, aprobada_en,
          proceso, visita, datos, modificado_por, codigo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...cols, id]);
      } else {
        const r = await con.query(`UPDATE evaluacion SET finca_codigo = ?, especie = ?, estado = ?, fecha = ?, inspector = ?, asignado_por = ?, asignado_en = ?,
          enviada_en = ?, aprobada_por = ?, aprobada_en = ?, proceso = ?, visita = ?, datos = ?, modificado_por = ?, version = version + 1
          WHERE codigo = ? AND version = ?`, [...cols, id, version]);
        if (!r.affectedRows) return null;
      }
      await escribirHijosEvaluacion(con, id, e);
      return true;
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
    tabla: 'usuario', llave: 'clave',
    async leer(con) {
      // «activacion» (Activa, Pendiente de activación, Enlace vencido, Sin enlace) la calcula el servidor; no se guarda.
      return (await con.query('SELECT * FROM usuario ORDER BY creado_en, clave'))
        .map((f) => ({ id: f.clave, version: f.version, datos: { ...leer(f.datos), activacion: activacion(f) } }));
    },
    async escribir(con, id, u, version) {
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new ErrorApi(400, 'Clave de usuario inválida');
      if (!PERFILES.includes(u.perfil)) throw new ErrorApi(400, 'Perfil inválido');
      const correo = String(u.correo ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(correo)) throw new ErrorApi(400, 'Correo inválido');
      const doc = llaveUsuario(u.doc);
      if (!doc) throw new ErrorApi(400, 'Documento inválido');
      const cols = [String(u.nombre ?? '').trim().slice(0, 120), u.perfil, String(u.tipoDoc ?? 'CC').slice(0, 5), doc, correo,
        limpiarTelefono(u.tel ?? '') || null, u.estado === 'Inactivo' ? 'Inactivo' : 'Activo', json(sinActivacion(u))];
      try {
        if (version == null) { await con.query('INSERT INTO usuario (nombre, perfil, tipo_documento, documento, correo, telefono, estado, datos, clave) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [...cols, id]); return true; }
        const r = await con.query(`UPDATE usuario SET nombre = ?, perfil = ?, tipo_documento = ?, documento = ?, correo = ?, telefono = ?, estado = ?, datos = ?,
          version = version + 1 WHERE clave = ? AND version = ?`, [...cols, id, version]);
        return r.affectedRows ? true : null;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY' && /correo|documento/.test(e.message)) throw new ErrorApi(422, 'Ya existe un usuario con ese correo o documento.');
        throw e;
      }
    },
  },
  avisos: {
    tabla: 'aviso', llave: 'id',
    async leer(con) {
      return (await con.query('SELECT * FROM (SELECT id, version, datos, creado_en FROM aviso ORDER BY creado_en DESC LIMIT 500) a ORDER BY creado_en')).map((f) => ({ id: f.id, version: f.version, datos: leer(f.datos) }));
    },
    async escribir(con, id, a, version) {
      if (!/^AV-[a-z0-9]{4,24}$/.test(id) || a.id !== id) throw new ErrorApi(400, 'Aviso inválido');
      const t = isNaN(Date.parse(a.t)) ? new Date() : new Date(a.t);
      const cols = [String(a.para ?? '').slice(0, 40), a.tipo ? String(a.tipo).slice(0, 20) : null, String(a.txt ?? '').slice(0, 400), String(a.href ?? '').slice(0, 200) || null, Boolean(a.leido), t, json(a)];
      if (version == null) { await con.query('INSERT INTO aviso (para, tipo, texto, enlace, leido, creado_en, datos, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [...cols, id]); return true; }
      const r = await con.query('UPDATE aviso SET para = ?, tipo = ?, texto = ?, enlace = ?, leido = ?, creado_en = ?, datos = ?, version = version + 1 WHERE id = ? AND version = ?', [...cols, id, version]);
      return r.affectedRows ? true : null;
    },
  },
};
