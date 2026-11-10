import { Router } from 'express';
import { PESOS, planMuestreo, tramo, validarRegistroFinca } from '@eba/norma';
import { enTransaccion } from '../../bd/conexion.js';
import { ErrorApi, datosInvalidos, noEncontrado } from '../../utilidades/errores.js';
import { enmascararCorreo, enmascararDocumento, enmascararTelefono } from '../../utilidades/privacidad.js';
import { buscarFinca, crearFinca, existeFinca, listarFincas } from './fincas.repositorio.js';

/**
 * Fincas (CU-04 y CU-05).
 *   GET  /api/fincas?q=&estado=   listado
 *   GET  /api/fincas/:codigo      ficha
 *   POST /api/fincas              registro
 */
export const rutasFincas = Router();

/** Convierte las filas de MariaDB al formato que usa Angular, con el tramo y la muestra por especie. */
function aRespuesta(f, { detalle = false } = {}) {
  const especies = f.especies.map((e) => {
    const t = tramo(e.numero_aves);
    const base = { especie: e.especie, numeroAves: e.numero_aves, tramo: t };
    if (!detalle) return base;
    return { ...base, proposito: e.proposito, sistema: e.sistema, conCorral: Boolean(e.con_corral),
      pesos: PESOS[t], muestra: planMuestreo(e.numero_aves, Boolean(e.con_corral)).texto };
  });
  return {
    codigo: f.codigo, nombre: f.nombre,
    departamento: { codigo: f.departamento, nombre: f.departamento_nombre },
    municipio: f.municipio, vereda: f.vereda, estado: f.estado, creadoEn: f.creado_en,
    totalAves: especies.reduce((t, e) => t + e.numeroAves, 0),
    especies,
    responsable: detalle
      ? { nombre: f.persona_nombre, tipoDocumento: f.tipo_documento, numeroDocumento: enmascararDocumento(f.numero_documento),
          correo: enmascararCorreo(f.correo), telefono: enmascararTelefono(f.telefono), autorizaDatos: Boolean(f.autoriza_datos) }
      : { nombre: f.persona_nombre },
  };
}

rutasFincas.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  const estado = ['ACTIVA', 'INACTIVA'].includes(req.query.estado) ? req.query.estado : undefined;
  const fincas = await listarFincas({ q, estado });
  res.json({ total: fincas.length, fincas: fincas.map((f) => aRespuesta(f)) });
});

rutasFincas.get('/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo).toUpperCase();
  if (!/^FIN-\d{4}-\d{5}$/.test(codigo)) throw noEncontrado('La finca');
  const f = await buscarFinca(codigo);
  if (!f) throw noEncontrado('La finca');
  res.json(aRespuesta(f, { detalle: true }));
});

rutasFincas.post('/', async (req, res) => {
  if (req.get('X-EBA-Rol') === 'productor')
    throw new ErrorApi(403, 'El productor no puede registrar fincas: las registra el ICA (inspector, coordinador o administrador).');
  const errores = validarRegistroFinca(req.body);
  if (Object.keys(errores).length) throw datosInvalidos(errores);
  const r = req.body;
  const repetida = await existeFinca(r.nombre.trim().replace(/\s+/g, ' '), r.departamento, r.municipio.trim().replace(/\s+/g, ' '));
  if (repetida) throw new ErrorApi(409, `Ya existe una finca con ese nombre en ese municipio (${repetida}).`, { campos: { nombre: 'Ya está registrada en este municipio.' } });
  let codigo;
  try {
    codigo = await enTransaccion((con) => crearFinca(con, r, req.usuario));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw datosInvalidos({ departamento: 'El departamento no existe.' });
    throw e;
  }
  res.status(201).location(`/api/fincas/${codigo}`).json(aRespuesta(await buscarFinca(codigo), { detalle: true }));
});
