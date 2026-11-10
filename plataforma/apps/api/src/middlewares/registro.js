/**
 * Registro de cada petición en la consola: método, ruta, estado y duración.
 * No registra el cuerpo de la petición (puede llevar datos personales, Ley 1581).
 */
export function registro(req, res, next) {
  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(1)} ms`);
  });
  next();
}
