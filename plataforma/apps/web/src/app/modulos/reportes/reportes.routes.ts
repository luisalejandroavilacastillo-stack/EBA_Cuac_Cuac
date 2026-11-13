import { Routes } from '@angular/router';

/** Reportes (CU-21): consolidado con filtros, comparación entre visitas, CSV sin datos personales e informe por finca. */
export const RUTAS_REPORTES: Routes = [
  { path: '', title: 'Reportes · EBA', loadComponent: () => import('./reportes').then((m) => m.Reportes) },
  { path: 'finca/:id', title: 'Informe de la finca · EBA', loadComponent: () => import('./informe').then((m) => m.InformeFinca) },
];
