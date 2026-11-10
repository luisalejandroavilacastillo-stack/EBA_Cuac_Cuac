import type { Rol } from '@eba/norma';

/** Módulos del menú y roles que los ven (igual que PERMISOS del prototipo). */
export interface OpcionMenu { ruta: string; texto: string; roles: Rol[] }
const TODOS: Rol[] = ['inspector', 'coordinador', 'productor', 'admin'];
export const MENU: OpcionMenu[] = [
  { ruta: 'inicio', texto: 'Inicio', roles: TODOS },
  { ruta: 'fincas', texto: 'Fincas', roles: TODOS },
  { ruta: 'reportes', texto: 'Reportes', roles: ['inspector', 'coordinador', 'admin'] },
  { ruta: 'usuarios', texto: 'Usuarios', roles: ['admin'] },
  { ruta: 'parametrizacion', texto: 'Parametrización', roles: ['admin'] },
  { ruta: 'bitacora', texto: 'Bitácora', roles: ['admin'] },
  { ruta: 'ayuda', texto: 'Ayuda de la norma', roles: TODOS },
  { ruta: 'cuenta', texto: 'Mi cuenta y seguridad', roles: TODOS },
];
