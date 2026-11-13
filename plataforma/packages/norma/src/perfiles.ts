/**
 * Perfiles, permisos y estados del flujo (prototipo v0.25, RN-191 a RN-208).
 * Única fuente para la API y para Angular: el menú, las rutas protegidas y las validaciones del servidor leen de aquí.
 */
import type { EstadoEspecie, EstadoEvaluacion, EstadoProductor, Rol } from './tipos.js';

export const PERFILES: readonly Rol[] = ['inspector', 'coordinador', 'productor', 'admin'];

/** Nombre visible del perfil: el mismo para hombres y mujeres (RN-191). */
export const NOMBRE_PERFIL: Record<Rol, string> = {
  inspector: 'Inspector ICA', coordinador: 'Coordinador ICA', productor: 'Productor', admin: 'Administrador',
};

export type Modulo = 'inicio' | 'fincas' | 'evaluaciones' | 'reportes' | 'asistente' | 'usuarios' | 'parametros' | 'bitacora' | 'ayuda' | 'cuenta';

/** Módulos que ve cada perfil (igual que PERMISOS del prototipo). */
export const PERMISOS: Record<Rol, readonly Modulo[]> = {
  inspector: ['inicio', 'fincas', 'evaluaciones', 'reportes', 'asistente', 'ayuda', 'cuenta'],
  coordinador: ['inicio', 'fincas', 'evaluaciones', 'reportes', 'asistente', 'ayuda', 'cuenta'],
  productor: ['inicio', 'fincas', 'evaluaciones', 'asistente', 'ayuda', 'cuenta'],
  admin: ['inicio', 'fincas', 'evaluaciones', 'reportes', 'asistente', 'usuarios', 'parametros', 'bitacora', 'ayuda', 'cuenta'],
};
export const puede = (perfil: Rol | null | undefined, modulo: Modulo): boolean => !!perfil && PERMISOS[perfil].includes(modulo);

/** Acciones del flujo y quién puede hacerlas. */
export type Accion = 'registrarFinca' | 'asignar' | 'reasignar' | 'aprobar' | 'devolver' | 'ampliarProceso' | 'gestionarUsuarios' | 'evaluar';
const ACCIONES: Record<Accion, readonly Rol[]> = {
  registrarFinca: ['coordinador', 'admin'],
  asignar: ['coordinador', 'admin'],
  reasignar: ['coordinador', 'admin'],
  ampliarProceso: ['coordinador', 'admin'],
  aprobar: ['coordinador'],                 // RN-200: solo el coordinador aprueba o devuelve
  devolver: ['coordinador'],
  gestionarUsuarios: ['admin'],
  evaluar: ['inspector'],                   // y solo el inspector asignado (RN-198)
};
export const puedeHacer = (perfil: Rol | null | undefined, accion: Accion): boolean => !!perfil && ACCIONES[accion].includes(perfil);

/** Visitas sin aprobar: no puede haber otra para la misma finca y especie (RN-196). */
export const ESTADOS_ABIERTOS: readonly EstadoEvaluacion[] = ['Programada', 'En proceso', 'Devuelta', 'Pendiente de aprobación'];
export const esAbierta = (estado: EstadoEvaluacion): boolean => ESTADOS_ABIERTOS.includes(estado);
/** Nombre visible del estado de una visita. */
export const nombreEstadoVisita = (e: EstadoEvaluacion): string => ({ Programada: 'Asignada', Finalizada: 'Aprobada' } as Record<string, string>)[e] ?? e;

export const ESTADOS_ESPECIE: readonly EstadoEspecie[] = ['Por asignar', 'Asignada', 'En proceso', 'Devuelta', 'Pendiente de aprobación', 'Aprobada', 'Seguimiento programado'];
export const ESTADOS_PRODUCTOR: readonly EstadoProductor[] = ['Sin programar', 'En evaluación', 'En revisión del ICA', 'Plan de mejora', 'Certificada', 'Constancia vencida'];

/** Cómo ve el productor el estado de la especie (RN-204). Para «Aprobada» depende de la constancia. */
export function estadoParaProductor(e: EstadoEspecie, constancia?: { vigente: boolean } | null): EstadoProductor {
  switch (e) {
    case 'Por asignar': return 'Sin programar';
    case 'Asignada': case 'En proceso': case 'Devuelta': return 'En evaluación';
    case 'Pendiente de aprobación': return 'En revisión del ICA';
    case 'Seguimiento programado': return 'Plan de mejora';
    default: return constancia ? (constancia.vigente ? 'Certificada' : 'Constancia vencida') : 'Plan de mejora';
  }
}

/** Clase de color de la etiqueta de cada estado (mismos colores del prototipo). */
export const COLOR_ESTADO: Record<EstadoEspecie | EstadoProductor, string> = {
  'Por asignar': 'e-gris', Asignada: 'e-info', 'En proceso': 'e-medio', Devuelta: 'e-alerta', 'Pendiente de aprobación': 'e-rev',
  Aprobada: 'e-ok', 'Seguimiento programado': 'e-seg',
  'Sin programar': 'e-gris', 'En evaluación': 'e-medio', 'En revisión del ICA': 'e-rev', 'Plan de mejora': 'e-seg', Certificada: 'e-ok', 'Constancia vencida': 'e-gris',
};
