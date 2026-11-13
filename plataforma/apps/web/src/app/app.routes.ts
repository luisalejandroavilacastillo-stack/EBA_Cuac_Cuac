import { Routes } from '@angular/router';
import { Marco } from './diseno/marco';
import { ingresoGuard, permisoGuard, sesionGuard } from './nucleo/guardas';

/**
 * Rutas. Cada módulo se carga solo cuando se abre (carga perezosa).
 * - El marco exige sesión (sesionGuard).
 * - Cada módulo declara data.modulo y permisoGuard revisa que el perfil lo tenga (PERMISOS de @eba/norma);
 *   el servidor vuelve a revisar los permisos en cada cambio (apps/api/src/sincronizacion/permisos.js).
 */
const m = (modulo: string) => ({ data: { modulo }, canMatch: [permisoGuard] });

export const routes: Routes = [
  { path: 'ingreso', canActivate: [ingresoGuard], loadChildren: () => import('./modulos/ingreso/ingreso.routes').then((r) => r.RUTAS_INGRESO) },
  // Enlaces del correo (activar cuenta, restablecer contraseña): públicos, de un solo uso.
  { path: 'activar/:token', title: 'Activar cuenta · EBA', loadComponent: () => import('./modulos/ingreso/activar').then((r) => r.Activar) },
  { path: 'restablecer/:token', title: 'Restablecer contraseña · EBA', loadComponent: () => import('./modulos/ingreso/activar').then((r) => r.Activar) },
  {
    path: '',
    component: Marco,
    canActivate: [sesionGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', ...m('inicio'), title: 'Inicio · EBA', loadComponent: () => import('./modulos/inicio/inicio').then((r) => r.Inicio) },
      { path: 'fincas', ...m('fincas'), loadChildren: () => import('./modulos/fincas/fincas.routes').then((r) => r.RUTAS_FINCAS) },
      { path: 'visitas', ...m('fincas'), loadChildren: () => import('./modulos/visitas/visitas.routes').then((r) => r.RUTAS_VISITAS) },
      { path: 'evaluaciones', ...m('evaluaciones'), loadChildren: () => import('./modulos/evaluaciones/evaluaciones.routes').then((r) => r.RUTAS_EVALUACIONES) },
      { path: 'reportes', ...m('reportes'), loadChildren: () => import('./modulos/reportes/reportes.routes').then((r) => r.RUTAS_REPORTES) },
      { path: 'asistente', ...m('asistente'), loadChildren: () => import('./modulos/asistente/asistente.routes').then((r) => r.RUTAS_ASISTENTE) },
      { path: 'ayuda', ...m('ayuda'), loadChildren: () => import('./modulos/ayuda/ayuda.routes').then((r) => r.RUTAS_AYUDA) },
      { path: 'cuenta', ...m('cuenta'), loadChildren: () => import('./modulos/cuenta/cuenta.routes').then((r) => r.RUTAS_CUENTA) },
      { path: 'sin-permiso', title: 'Acceso no autorizado · EBA', loadComponent: () => import('./compartido/sin-permiso').then((r) => r.SinPermiso) },
      { path: '', loadChildren: () => import('./modulos/administracion/administracion.routes').then((r) => r.RUTAS_ADMINISTRACION) },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
