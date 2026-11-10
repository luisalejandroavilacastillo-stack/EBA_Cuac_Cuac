/**
 * Producción y Docker (npm run build): el frontend llama a /api en la misma dirección donde se abrió
 * y Nginx lo reenvía a la API (apps/web/nginx.conf). Así funciona igual por localhost o por la IP del equipo.
 * Si la API estuviera en otro servidor, escriba aquí su dirección completa, p. ej. 'http://192.168.1.20:3085/api',
 * y agregue la dirección del frontend en WEB_ORIGEN.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
