import { datosInvalidos } from './errores.js';

/**
 * Validación mínima de datos de entrada, sin librerías.
 * Cada regla devuelve un mensaje si el valor no sirve, o nada si está bien.
 */
export const reglas = {
  requerido: (v) => (v === undefined || v === null || v === '' ? 'Es obligatorio' : undefined),
  entero: (min = -Infinity, max = Infinity) => (v) =>
    Number.isInteger(v) && v >= min && v <= max ? undefined : `Debe ser un número entero entre ${min} y ${max}`,
  numero: (min = -Infinity, max = Infinity) => (v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? undefined : `Debe ser un número entre ${min} y ${max}`,
  booleano: (v) => (typeof v === 'boolean' ? undefined : 'Debe ser verdadero o falso'),
  unoDe: (...opciones) => (v) => (opciones.includes(v) ? undefined : `Debe ser uno de: ${opciones.join(', ')}`),
};

/**
 * Valida un objeto contra un esquema { campo: [regla, ...] }. Los campos sin "requerido" son opcionales.
 * Lanza un error 400 con todos los campos que fallan.
 */
export function validar(datos, esquema) {
  const campos = {};
  for (const [campo, lista] of Object.entries(esquema)) {
    const v = datos?.[campo];
    const obligatorio = lista.includes(reglas.requerido);
    if (!obligatorio && (v === undefined || v === null)) continue;
    for (const regla of lista) {
      const error = regla(v);
      if (error) { campos[campo] = error; break; }
    }
  }
  if (Object.keys(campos).length) throw datosInvalidos(campos);
  return datos;
}
