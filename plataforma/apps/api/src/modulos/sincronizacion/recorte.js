/**
 * Lo que cada perfil recibe de /api/sincronizacion (privacidad por perfil, revisión de seguridad del módulo 7).
 * - Administrador: todo, incluida la bitácora.
 * - Coordinador: todas las fincas y visitas; de los usuarios solo nombre, perfil y estado; sin bitácora.
 * - Inspector: las fincas con una visita asignada a él y sus visitas; usuarios recortados; sin bitácora.
 * - Productor: sus fincas; de las visitas que aún no aprueba el ICA, solo el estado y la fecha (sin lo registrado);
 *   usuarios recortados; sin bitácora.
 * Los avisos llegan solo a quien van dirigidos (su clave o su perfil). Correo, documento y teléfono de los usuarios
 * solo los ve el administrador (y cada persona los suyos).
 */
const CAMPOS_PUBLICOS = ['nombre', 'perfil', 'estado', 'mp'];

export function recortar(colecciones, bitacora, yo) {
  const { rol, clave, nombre } = yo;
  if (rol === 'admin') return { colecciones, bitacora };
  // cada persona recibe completo su propio registro (Mi cuenta); de los demás, solo nombre, perfil y estado
  const usuarios = colecciones.usuarios.map((r) => (r.id === clave ? r : { id: r.id, version: r.version,
    datos: Object.fromEntries(CAMPOS_PUBLICOS.filter((k) => r.datos[k] !== undefined).map((k) => [k, r.datos[k]])) }));
  const avisos = colecciones.avisos.filter((r) => r.datos?.para === clave || r.datos?.para === rol);
  let { fincas, evals, procesos } = colecciones;
  if (rol === 'inspector') {
    const ids = new Set(evals.filter((r) => r.datos.inspector === clave && r.datos.estado !== 'Anulada').map((r) => r.datos.finca));
    fincas = fincas.filter((r) => ids.has(r.id));
    evals = evals.filter((r) => ids.has(r.datos.finca));
  } else if (rol === 'productor') {
    const ids = new Set(fincas.filter((r) => r.datos.productor === nombre).map((r) => r.id));
    fincas = fincas.filter((r) => ids.has(r.id));
    evals = evals.filter((r) => ids.has(r.datos.finca)).map((r) => (r.datos.estado === 'Finalizada' ? r : {
      ...r, datos: { ...r.datos, resp: {}, obs: {}, plan: {}, firmas: {}, anterior: undefined, revision: undefined, obsGeneral: undefined, rg: undefined },
    }));
  } else if (rol !== 'coordinador') {
    fincas = []; evals = [];
  }
  const pids = new Set(evals.map((r) => r.datos.proceso));
  procesos = procesos.filter((r) => pids.has(r.id));
  return { colecciones: { ...colecciones, fincas, evals, procesos, usuarios, avisos }, bitacora: [] };
}
