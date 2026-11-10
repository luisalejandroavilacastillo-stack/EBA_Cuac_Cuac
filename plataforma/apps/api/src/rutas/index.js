import { Router } from 'express';
import { config } from '../config/config.js';
import { rutasSalud } from './salud.js';
import { rutasNorma } from './norma.js';
import { MODULOS, rutaPendiente } from './pendientes.js';
import { rutasCatalogos } from '../modulos/catalogos/catalogos.rutas.js';
import { rutasFincas } from '../modulos/fincas/fincas.rutas.js';
import { rutasSincronizacion } from '../modulos/sincronizacion/sincronizacion.rutas.js';
import { rutasAsistente } from '../modulos/asistente/asistente.rutas.js';

/** Todas las rutas de la API, bajo el prefijo /api. */
export const rutas = Router();

rutas.get('/', (req, res) => {
  res.json({
    servicio: 'API EBA Cuac Cuac',
    version: config.version,
    disponibles: [
      'GET /api/salud', 'GET /api/norma/reglas', 'POST /api/norma/plan-muestreo', 'POST /api/norma/resultado',
      'GET /api/catalogos', 'GET /api/fincas', 'GET /api/fincas/:codigo', 'POST /api/fincas',
      'GET /api/sincronizacion', 'PUT|DELETE /api/sincronizacion/:coleccion/:id', 'POST /api/sincronizacion/bitacora',
      'GET /api/asistente/estado', 'POST /api/asistente',
    ],
    enConstruccion: MODULOS.map((m) => ({ ruta: `/api/${m.ruta}`, nombre: m.nombre, casosDeUso: m.cu, etapa: m.etapa })),
  });
});
rutas.use('/salud', rutasSalud);
rutas.use('/norma', rutasNorma);
rutas.use('/catalogos', rutasCatalogos);
rutas.use('/fincas', rutasFincas);
rutas.use('/sincronizacion', rutasSincronizacion);
rutas.use('/asistente', rutasAsistente);
for (const m of MODULOS) rutas.use(`/${m.ruta}`, rutaPendiente(m));
