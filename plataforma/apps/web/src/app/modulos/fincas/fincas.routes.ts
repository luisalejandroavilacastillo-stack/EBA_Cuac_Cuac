import { Routes } from '@angular/router';

/** Fincas (CU-04 y CU-05): centro de trabajo, registro y ficha. */
export const RUTAS_FINCAS: Routes = [
  { path: '', loadComponent: () => import('./lista').then((m) => m.ListaFincas), title: 'Fincas · EBA' },
  { path: ':id', loadComponent: () => import('./ficha').then((m) => m.FichaFinca), title: 'Finca · EBA' },
];
