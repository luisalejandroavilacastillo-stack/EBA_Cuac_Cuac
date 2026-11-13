import { Routes } from '@angular/router';
import { permisoGuard } from '../../nucleo/guardas';

/** Módulos del administrador: usuarios, parametrización y bitácora. */
export const RUTAS_ADMINISTRACION: Routes = [
  { path: 'usuarios', canMatch: [permisoGuard], data: { modulo: 'usuarios' }, title: 'Usuarios · EBA', loadComponent: () => import('./usuarios').then((m) => m.Usuarios) },
  { path: 'parametrizacion', canMatch: [permisoGuard], data: { modulo: 'parametros' }, title: 'Parametrización · EBA', loadComponent: () => import('./parametrizacion').then((m) => m.Parametrizacion) },
  { path: 'bitacora', canMatch: [permisoGuard], data: { modulo: 'bitacora' }, title: 'Bitácora · EBA', loadComponent: () => import('./bitacora').then((m) => m.Bitacora) },
];
