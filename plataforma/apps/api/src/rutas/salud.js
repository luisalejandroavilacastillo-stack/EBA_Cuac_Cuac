import { Router } from 'express';
import { config } from '../config/config.js';
import { estadoBaseDeDatos } from '../bd/conexion.js';

/** GET /api/salud · el frontend lo usa para saber si la API y la base de datos responden. */
export const rutasSalud = Router();

rutasSalud.get('/', async (req, res) => {
  res.json({
    estado: 'ok',
    servicio: 'API EBA Cuac Cuac',
    version: config.version,
    entorno: config.entorno,
    baseDeDatos: await estadoBaseDeDatos(),
    asistenteIA: config.gemini.clave ? `Gemini (${config.gemini.modelo})` : 'modo local',
    hora: new Date().toISOString(),
  });
});
