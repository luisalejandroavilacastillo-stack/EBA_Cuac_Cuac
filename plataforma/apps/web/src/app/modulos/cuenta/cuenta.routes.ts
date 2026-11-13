import { Routes } from '@angular/router';

/** Mi cuenta y seguridad (CU-03). */
export const RUTAS_CUENTA: Routes = [
  { path: '', title: 'Mi cuenta y seguridad · EBA', loadComponent: () => import('./cuenta').then((m) => m.Cuenta) },
];
