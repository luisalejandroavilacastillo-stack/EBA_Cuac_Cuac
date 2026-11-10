/**
 * Desarrollo (npm run dev): Angular llama a /api y el proxy (proxy.conf.mjs) lo reenvía a la API Express en el puerto 3085.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
};
