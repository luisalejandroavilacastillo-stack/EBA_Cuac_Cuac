import { Router } from 'express';
import { ESPECIES, TIPOS_DOCUMENTO } from '@eba/norma';
import { consultar } from '../../bd/conexion.js';

/** GET /api/catalogos · listas para los formularios (departamentos, especies, tipos de documento). */
export const rutasCatalogos = Router();

rutasCatalogos.get('/', async (req, res) => {
  const departamentos = await consultar('SELECT codigo_dane AS codigo, nombre FROM departamento ORDER BY nombre');
  res.json({ departamentos, especies: ESPECIES, tiposDocumento: TIPOS_DOCUMENTO });
});
