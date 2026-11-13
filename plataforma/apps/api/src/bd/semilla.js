import { readFile } from 'node:fs/promises';
import { config } from '../config/config.js';
import { COLECCIONES } from '../modulos/sincronizacion/colecciones.js';
import { enTransaccion, consultar } from './conexion.js';

const ARCHIVO = new URL('../../bd/semilla/datos_ejemplo.json', import.meta.url);

/**
 * Datos de ejemplo (solo con DATOS_EJEMPLO=si y la base vacía): usuarios, fincas y visitas de la demostración,
 * los mismos que subía el prototipo v0.25. Antes los subía el navegador sin sesión; ahora los carga la API al arrancar,
 * así la sincronización ya no acepta escrituras sin sesión. En producción (DATOS_EJEMPLO=no) no hace nada.
 */
export async function sembrarDatosEjemplo(registrar = console.log) {
  if (!config.datosEjemplo) return 'apagado';
  const [{ usuarios, datos }] = await consultar('SELECT (SELECT COUNT(*) FROM usuario) AS usuarios, (SELECT COUNT(*) FROM finca) + (SELECT COUNT(*) FROM evaluacion) AS datos');
  // Cada parte por separado: al pasar de la v0.24 a la v0.25 la base conserva fincas y visitas pero no los usuarios
  // (la migración 003 cambió los perfiles), y antes el navegador los volvía a subir sin sesión.
  const cols = [...(Number(usuarios) ? [] : ['usuarios']), ...(Number(datos) ? [] : ['fincas', 'procesos', 'evals'])];
  if (!cols.length) return 'con datos';
  const semilla = JSON.parse(await readFile(ARCHIVO, 'utf8'));
  await enTransaccion(async (con) => {
    // en orden: los usuarios y las fincas antes que las visitas que las referencian
    for (const col of cols) for (const r of semilla[col] ?? []) await COLECCIONES[col].escribir(con, r.id, r.datos, null, 'instalación');
  });
  registrar(`  Datos de ejemplo cargados: ${cols.map((c) => `${semilla[c].length} ${{ usuarios: 'usuarios', fincas: 'fincas', procesos: 'procesos', evals: 'visitas' }[c]}`).join(', ')}.`);
  return 'sembrado';
}
