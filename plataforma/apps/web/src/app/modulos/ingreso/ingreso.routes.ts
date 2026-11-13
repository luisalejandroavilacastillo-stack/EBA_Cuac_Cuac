import { Routes } from '@angular/router';

/** Ingreso (CU-01 y CU-02). Los enlaces del correo (activar, restablecer) están en app.routes.ts. */
export const RUTAS_INGRESO: Routes = [
  { path: '', loadComponent: () => import('./ingreso').then((m) => m.Ingreso), title: 'Ingresar · EBA' },
];
