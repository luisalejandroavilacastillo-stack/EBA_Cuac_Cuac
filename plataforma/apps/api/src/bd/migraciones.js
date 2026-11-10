import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mariadb from 'mariadb';
import { config } from '../config/config.js';

/**
 * Aplica, en orden, los archivos bd/migraciones/NNN_*.sql que falten.
 * Lleva el control en la tabla esquema_version. Así la base se crea sola la primera vez
 * y se actualiza en cada versión nueva, también si el volumen de Docker ya existía.
 */
const CARPETA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'bd', 'migraciones');

export async function aplicarMigraciones({ registrar = console.log } = {}) {
  const con = await mariadb.createConnection({
    host: config.bd.host, port: config.bd.puerto, database: config.bd.nombre,
    user: config.bd.usuario, password: config.bd.clave, multipleStatements: true, connectTimeout: 5000,
  });
  try {
    await con.query(`CREATE TABLE IF NOT EXISTS esquema_version (
      version    VARCHAR(100) NOT NULL PRIMARY KEY,
      aplicada   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
    const hechas = new Set((await con.query('SELECT version FROM esquema_version')).map((f) => f.version));
    const archivos = (await readdir(CARPETA)).filter((a) => /^\d{3}_.+\.sql$/.test(a)).sort();
    let nuevas = 0;
    for (const a of archivos) {
      if (hechas.has(a)) continue;
      const sql = await readFile(path.join(CARPETA, a), 'utf8');
      // En MariaDB los CREATE TABLE confirman solos; si una migración falla a medias, hay que revisarla a mano.
      await con.query(sql);
      await con.query('INSERT INTO esquema_version (version) VALUES (?)', [a]);
      registrar(`  Migración aplicada: ${a}`);
      nuevas++;
    }
    registrar(nuevas ? `  Base de datos actualizada (${nuevas} ${nuevas > 1 ? 'migraciones' : 'migración'}).` : '  Base de datos al día.');
  } finally {
    await con.end();
  }
}
