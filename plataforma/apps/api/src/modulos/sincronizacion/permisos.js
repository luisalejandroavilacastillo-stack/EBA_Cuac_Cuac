import { obtenerPool } from '../../bd/conexion.js';
import { ErrorApi } from '../../utilidades/errores.js';
import { identidad } from '../auth/sesiones.js';
import { buscarPorClave, tieneHistorial } from '../auth/cuentas.js';

/**
 * Permisos por perfil del prototipo v0.25 (RN-191 a RN-208).
 *   · admin: usuarios, fincas, asignar y seguimientos; NO aprueba ni devuelve.
 *   · coordinador: fincas, asignar, reasignar, aprobar o devolver, seguimientos.
 *   · inspector: solo modifica las visitas asignadas a él; las envía a aprobación; no crea fincas ni visitas.
 *   · productor: no modifica fincas nuevas, visitas, procesos ni usuarios.
 * El perfil y el usuario salen de la sesión real (cookie). Solo en desarrollo (INGRESO_DEMOSTRACION=si) y sin sesión real,
 * se toman de X-EBA-Rol y X-EBA-Clave, que envía el ingreso de demostración del prototipo.
 */
const GESTOR = ['coordinador', 'admin'];
const leer = (t) => (t == null ? null : typeof t === 'string' ? JSON.parse(t) : t);
const no = (msg) => { throw new ErrorApi(403, msg); };

async function previo(tabla, llave, id) {
  const [f] = await obtenerPool().query(`SELECT datos FROM ${tabla} WHERE ${llave} = ?`, [id]);
  return f ? leer(f.datos) : null;
}

/** Lanza 403 si el perfil no puede escribir (datos) o eliminar (datos = null) ese registro. */
export async function autorizar(col, id, version, datos, req) {
  const { rol, clave } = identidad(req);
  const eliminar = datos == null, nuevo = version == null && !eliminar;
  // Sin sesión no se cambia nada (los datos de ejemplo los carga la API al arrancar: src/bd/semilla.js).
  if (!rol) no('Inicie sesión para hacer cambios.');

  if (col === 'usuarios') {
    if (rol === 'admin') {
      if (!eliminar && clave && id === clave && datos.perfil !== 'admin') no('No puede cambiar su propio perfil.');
      if (eliminar) {
        if (id === clave) no('No puede eliminar su propia cuenta.');
        const u = await buscarPorClave(id);
        if (u && (await tieneHistorial(u))) throw new ErrorApi(409, 'Este usuario ya tiene historial (ingresos o visitas): inactívelo para conservarlo.');
      }
      return;
    }
    no('Solo el administrador crea, edita o elimina usuarios.');
  }

  if (col === 'avisos') return;            // cualquiera deja avisos y los marca como leídos

  if (col === 'fincas') {
    if (nuevo && !GESTOR.includes(rol)) no('Las fincas las registra el coordinador o el administrador.');
    if (eliminar && !GESTOR.includes(rol)) no('Solo el coordinador o el administrador eliminan fincas.');
    return;
  }

  if (col === 'procesos') {
    if (rol === 'productor') no('El productor no modifica procesos de seguimiento.');
    return;
  }

  if (col === 'evals') {
    if (rol === 'productor') no('El productor no modifica evaluaciones.');
    if (eliminar) { if (!GESTOR.includes(rol)) no('Solo el coordinador o el administrador eliminan visitas.'); return; }
    if (nuevo) { if (!GESTOR.includes(rol)) no('Las inspecciones las asigna el coordinador o el administrador.'); return; }
    const antes = await previo('evaluacion', 'codigo', id);
    if (!antes) return;
    const de = antes.estado, a = datos.estado;
    if (de !== a && (a === 'Finalizada' || a === 'Devuelta') && rol !== 'coordinador')
      no('Solo el coordinador aprueba o devuelve inspecciones.');
    if (rol === 'inspector') {
      if (antes.inspector !== clave) no('Esta visita está asignada a otro inspector.');
      if (datos.inspector !== antes.inspector) no('El inspector no puede reasignar visitas.');
      if (de !== a && !((de === 'Programada' && a === 'En proceso') || (['En proceso', 'Devuelta'].includes(de) && a === 'Pendiente de aprobación')))
        no(`El inspector no puede pasar la visita de «${de}» a «${a}».`);
    }
    if (de === 'Pendiente de aprobación' && a === 'Pendiente de aprobación' && rol === 'inspector')
      no('La visita está en revisión del coordinador: no se puede modificar.');
  }
}
