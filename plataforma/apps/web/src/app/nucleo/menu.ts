import { PERMISOS, type Modulo, type Rol } from '@eba/norma';

/** Opciones del menú lateral, en el mismo orden del prototipo; cada perfil ve las de sus permisos (PERMISOS de @eba/norma). */
export interface OpcionMenu { modulo: Modulo; ruta: string; texto: string }
export const MENU: OpcionMenu[] = [
  { modulo: 'inicio', ruta: 'inicio', texto: 'Inicio' },
  { modulo: 'fincas', ruta: 'fincas', texto: 'Fincas' },
  { modulo: 'reportes', ruta: 'reportes', texto: 'Reportes' },
  { modulo: 'usuarios', ruta: 'usuarios', texto: 'Usuarios' },
  { modulo: 'parametros', ruta: 'parametrizacion', texto: 'Parametrización' },
  { modulo: 'bitacora', ruta: 'bitacora', texto: 'Bitácora' },
  { modulo: 'ayuda', ruta: 'ayuda', texto: 'Ayuda de la norma' },
  { modulo: 'cuenta', ruta: 'cuenta', texto: 'Mi cuenta y seguridad' },
];
export const menuDe = (perfil: Rol | null): OpcionMenu[] => (perfil ? MENU.filter((o) => PERMISOS[perfil].includes(o.modulo)) : []);
