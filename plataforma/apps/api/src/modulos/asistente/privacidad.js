import { consultar } from '../../bd/conexion.js';

/**
 * Antes de enviar algo a Gemini se quitan los datos personales (Ley 1581 de 2012):
 * correos, teléfonos, números de documento y los nombres de personas y fincas que están en la base de datos.
 * En el plan gratuito de Gemini, Google puede usar lo enviado para mejorar sus productos: por eso este filtro es obligatorio.
 */
let nombres = { personas: [], fincas: [], hasta: 0 };

async function nombresConocidos() {
  if (Date.now() < nombres.hasta) return nombres;
  try {
    const [p, f, u] = await Promise.all([
      consultar('SELECT nombre FROM persona_responsable'),
      consultar('SELECT nombre, JSON_VALUE(datos, \'$.productor\') AS productor, JSON_VALUE(datos, \'$.titular.nombre\') AS titular FROM finca'),
      consultar('SELECT nombre FROM usuario'),
    ]);
    const limpiar = (l) => [...new Set(l.filter((x) => x && String(x).trim().length >= 4).map((x) => String(x).trim()))]
      .sort((a, b) => b.length - a.length);                       // primero los más largos
    nombres = {
      personas: limpiar([...p.map((x) => x.nombre), ...f.flatMap((x) => [x.productor, x.titular]), ...u.map((x) => x.nombre)]),
      fincas: limpiar(f.map((x) => x.nombre)),
      hasta: Date.now() + 60_000,
    };
  } catch { /* sin base de datos: se aplican solo los patrones */ }
  return nombres;
}

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function quitarDatosPersonales(texto) {
  const { personas, fincas } = await nombresConocidos();
  let t = String(texto ?? '');
  for (const n of personas) t = t.replace(new RegExp(escaparRegex(n), 'gi'), '[persona]');
  for (const n of fincas) t = t.replace(new RegExp(escaparRegex(n), 'gi'), '[finca]');
  return t
    .replace(/[^\s@<>()[\]]+@[^\s@<>()[\]]+\.[A-Za-z]{2,}/g, '[correo]')
    .replace(/(?<!\d)(?:\+?57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g, '[teléfono]')
    .replace(/(?<!\d)60\d[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g, '[teléfono]')
    .replace(/(?<![\d-])\d{1,3}(?:\.\d{3}){2,}(?![\d.])/g, '[número]')       // 1.098.765.432
    .replace(/(?<![\d-])\d{6,}(?!\d)/g, '[número]');                         // documentos sin puntos
}

/** Solo para pruebas. */
export const _reiniciarNombres = () => { nombres = { personas: [], fincas: [], hasta: 0 }; };
