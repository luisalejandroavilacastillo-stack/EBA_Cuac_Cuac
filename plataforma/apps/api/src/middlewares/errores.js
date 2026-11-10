import { ErrorApi } from '../utilidades/errores.js';

/** Rutas que no existen. */
export function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl.split('?')[0]}` });
}

/**
 * Manejo central de errores. Responde siempre JSON en español.
 * Los errores inesperados no muestran detalles internos al usuario; se registran en la consola.
 */
// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorApi) {
    return res.status(err.estado).json({ error: err.message, ...(err.detalles && { detalles: err.detalles }) });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
  if (sinBaseDeDatos(err)) {
    console.error(`Base de datos no disponible: ${err.cause?.code ?? err.code ?? err.message}`);
    return res.status(503).json({ error: 'La base de datos no está disponible en este momento. Intente de nuevo en unos minutos.' });
  }
  console.error('Error inesperado:', err);
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Intente de nuevo.' });
}

/** Errores del driver de MariaDB cuando no hay conexión (servidor apagado, clave errada, tiempo agotado). */
function sinBaseDeDatos(err) {
  const codigos = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ER_GET_CONNECTION_TIMEOUT', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'];
  return [45012, 45028].includes(err?.errno) || codigos.includes(err?.code) || codigos.includes(err?.cause?.code);
}
