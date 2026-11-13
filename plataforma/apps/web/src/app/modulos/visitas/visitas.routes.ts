import { Routes } from '@angular/router';

/** Pantallas de una visita: apertura, recorrido por puntos, indicadores, cierre, resultado y constancia. */
export const RUTAS_VISITAS: Routes = [
  { path: ':id', title: 'Apertura · EBA', loadComponent: () => import('./campo/apertura').then((m) => m.Apertura) },
  { path: ':id/apertura', title: 'Apertura · EBA', loadComponent: () => import('./campo/apertura').then((m) => m.Apertura) },
  { path: ':id/recorrido', title: 'Recorrido · EBA', loadComponent: () => import('./campo/recorrido').then((m) => m.Recorrido) },
  { path: ':id/recorrido/:pt', title: 'Recorrido · EBA', loadComponent: () => import('./campo/recorrido').then((m) => m.Recorrido) },
  { path: ':id/recorrido/:pt/:av', title: 'Recorrido · EBA', loadComponent: () => import('./campo/recorrido').then((m) => m.Recorrido) },
  { path: ':id/cierre', title: 'Cierre · EBA', loadComponent: () => import('./campo/cierre').then((m) => m.Cierre) },
  { path: ':id/resultado', title: 'Resultado · EBA', loadComponent: () => import('./resultado').then((m) => m.Resultado) },
  { path: ':id/constancia', title: 'Constancia · EBA', loadComponent: () => import('./constancia').then((m) => m.Constancia) },
  { path: ':id/:code', title: 'Indicador · EBA', loadComponent: () => import('./campo/indicador').then((m) => m.Indicador) },
];
