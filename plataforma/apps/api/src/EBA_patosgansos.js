import os from 'node:os';
import { config } from './config/config.js';
import { crearApp } from './app.js';
import { cerrarBaseDeDatos } from './bd/conexion.js';
import { aplicarMigraciones } from './bd/migraciones.js';

const app = crearApp();

/** Crea o actualiza las tablas al arrancar. Si MariaDB aún no responde, lo vuelve a intentar cada 10 segundos. */
async function prepararBaseDeDatos(intento = 1) {
  try {
    await aplicarMigraciones();
  } catch (e) {
    console.warn(`  Base de datos no disponible (${e.code ?? e.message}); reintento ${intento} en 10 s…`);
    setTimeout(() => prepararBaseDeDatos(intento + 1), 10_000).unref();
  }
}
prepararBaseDeDatos();
const servidor = app.listen(config.puerto, config.host, () => {
  console.log(`API EBA Cuac Cuac ${config.version} (${config.entorno})`);
  console.log(`  Escuchando en ${config.host}:${config.puerto}`);
  if (process.env.EN_DOCKER) {
    // Dentro de Docker las IP son internas: se entra con localhost o con la IP del computador (ipconfig).
    console.log(`  En Docker: http://localhost:${config.puerto}/api o http://IP_DE_SU_EQUIPO:${config.puerto}/api`);
  } else {
    // Muestra las IP del equipo para configurar el frontend desde otro computador.
    const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4');
    for (const i of ips) console.log(`  http://${i.address}:${config.puerto}/api`);
  }
  console.log(`  Frontend permitido (CORS): ${config.origenesWeb.join(', ')}`);
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`El puerto ${config.puerto} ya está en uso. Cierre el otro programa o cambie API_PUERTO en .env`);
  else if (e.code === 'EADDRNOTAVAIL') console.error(`La IP ${config.host} no pertenece a este equipo. Revise API_HOST en .env`);
  else console.error(e);
  process.exit(1);
});

/** Apagado ordenado: termina las peticiones en curso y cierra la base de datos. */
async function apagar(senal) {
  console.log(`\n${senal}: cerrando la API…`);
  servidor.close(async () => { await cerrarBaseDeDatos(); process.exit(0); });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
