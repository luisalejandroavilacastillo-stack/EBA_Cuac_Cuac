import { Routes } from '@angular/router';
import { Marco } from './diseno/marco';

/** Cada módulo se carga solo cuando se abre (carga perezosa). */
export const routes: Routes = [
  { path: 'ingreso', loadChildren: () => import('./modulos/ingreso/ingreso.routes').then((m) => m.RUTAS_INGRESO) },
  {
    path: '',
    component: Marco,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./modulos/inicio/inicio').then((m) => m.Inicio) },
      { path: 'fincas', loadChildren: () => import('./modulos/fincas/fincas.routes').then((m) => m.RUTAS_FINCAS) },
      { path: 'evaluaciones', loadChildren: () => import('./modulos/evaluaciones/evaluaciones.routes').then((m) => m.RUTAS_EVALUACIONES) },
      { path: 'reportes', loadChildren: () => import('./modulos/reportes/reportes.routes').then((m) => m.RUTAS_REPORTES) },
      { path: 'asistente', loadChildren: () => import('./modulos/asistente/asistente.routes').then((m) => m.RUTAS_ASISTENTE) },
      { path: 'ayuda', loadChildren: () => import('./modulos/ayuda/ayuda.routes').then((m) => m.RUTAS_AYUDA) },
      { path: 'cuenta', loadChildren: () => import('./modulos/cuenta/cuenta.routes').then((m) => m.RUTAS_CUENTA) },
      { path: '', loadChildren: () => import('./modulos/administracion/administracion.routes').then((m) => m.RUTAS_ADMINISTRACION) },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
