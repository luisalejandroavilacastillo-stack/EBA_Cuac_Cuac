/**
 * En desarrollo, Angular (puerto 4200) reenvía las llamadas a /api hacia la API Express.
 * La dirección de la API se toma de API_URL; por defecto, este mismo equipo en el puerto 3085.
 * Para usar la API de otro equipo:  set API_URL=http://192.168.1.20:3085   (PowerShell: $env:API_URL="...")
 */
const destino = process.env.API_URL || 'http://localhost:3085';
console.log(`[proxy] /api → ${destino}`);

export default {
  '/api': { target: destino, secure: false, changeOrigin: true },
};
