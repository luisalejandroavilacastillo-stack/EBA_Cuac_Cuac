import mariadb from 'mariadb';
import { config } from '../config/config.js';

/**
 * Conexión a MariaDB con un grupo (pool) de conexiones. Se crea la primera vez que se usa,
 * así la API arranca aunque la base de datos aún no exista (etapa 2).
 */
let pool;

export function obtenerPool() {
  pool ??= mariadb.createPool({
    host: config.bd.host,
    port: config.bd.puerto,
    database: config.bd.nombre,
    user: config.bd.usuario,
    password: config.bd.clave,
    connectionLimit: config.bd.conexiones,
    acquireTimeout: 3000,
    timezone: '-05:00',
    charset: 'utf8mb4',
    bigIntAsNumber: true,
    insertIdAsNumber: true,
    decimalAsNumber: true,
  });
  return pool;
}

/** Ejecuta una consulta con parámetros (siempre con «?», nunca concatenando texto: evita inyección SQL). */
export async function consultar(sql, parametros = []) {
  return obtenerPool().query(sql, parametros);
}

/**
 * Estado de la base de datos para /api/salud. Usa una conexión aparte y corta (1,5 s),
 * para no dejar el grupo de conexiones reintentando cuando MariaDB está apagada.
 */
export async function estadoBaseDeDatos() {
  let con;
  try {
    con = await mariadb.createConnection({
      host: config.bd.host, port: config.bd.puerto, database: config.bd.nombre,
      user: config.bd.usuario, password: config.bd.clave, connectTimeout: 1500,
    });
    const [fila] = await con.query('SELECT VERSION() AS version');
    return { estado: 'conectada', version: fila.version };
  } catch (e) {
    return { estado: 'sin conexión', motivo: e.code ?? e.message };
  } finally {
    await con?.end().catch(() => {});
  }
}

/**
 * Ejecuta varias consultas como una sola operación: si algo falla, no queda nada a medias.
 * @param {(con: import('mariadb').PoolConnection) => Promise<T>} trabajo
 * @template T
 */
export async function enTransaccion(trabajo) {
  const con = await obtenerPool().getConnection();
  try {
    await con.beginTransaction();
    const r = await trabajo(con);
    await con.commit();
    return r;
  } catch (e) {
    await con.rollback().catch(() => {});
    throw e;
  } finally {
    con.release();
  }
}

export async function cerrarBaseDeDatos() {
  if (pool) await pool.end();
  pool = undefined;
}
