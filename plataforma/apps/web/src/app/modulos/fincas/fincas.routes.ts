import { Routes } from '@angular/router';

/** Fincas (CU-04 y CU-05): listado, registro y ficha. */
export const RUTAS_FINCAS: Routes = [
  { path: '', loadComponent: () => import('./lista/lista-fincas').then((m) => m.ListaFincas), title: 'Fincas · EBA' },
  { path: 'nueva', loadComponent: () => import('./registro/registro-finca').then((m) => m.RegistroFincaPagina), title: 'Registrar finca · EBA' },
  { path: ':codigo', loadComponent: () => import('./ficha/ficha-finca').then((m) => m.FichaFinca), title: 'Finca · EBA' },
];
