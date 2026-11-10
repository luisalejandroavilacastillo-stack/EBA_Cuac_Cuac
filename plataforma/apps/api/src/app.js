import express from 'express';
import { config } from './config/config.js';
import { cors } from './middlewares/cors.js';
import { seguridad } from './middlewares/seguridad.js';
import { registro } from './middlewares/registro.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { rutas } from './rutas/index.js';

/** Crea la aplicación Express (separada del arranque para poder probarla). */
export function crearApp({ registrar = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback, uniquelocal');   // Nginx de Docker: la IP real llega en X-Forwarded-For
  if (registrar) app.use(registro);
  app.use(seguridad);
  app.use(cors(config.origenesWeb));
  app.use(express.json({ limit: config.limiteCuerpo }));
  app.use('/api', rutas);
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
