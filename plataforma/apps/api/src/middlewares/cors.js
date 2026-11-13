/**
 * CORS sin el paquete «cors»: solo las direcciones del frontend configuradas en WEB_ORIGEN
 * pueden llamar a la API desde el navegador.
 */
export function cors(origenesPermitidos) {
  const permitidos = new Set(origenesPermitidos);
  return (req, res, next) => {
    const origen = req.headers.origin;
    if (origen && permitidos.has(origen)) {
      res.setHeader('Access-Control-Allow-Origin', origen);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      if (!origen || !permitidos.has(origen)) return res.status(403).end();
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,ngsw-bypass');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  };
}
