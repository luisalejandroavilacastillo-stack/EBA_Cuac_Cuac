import { Routes } from '@angular/router';

/** Ayuda de la norma: secciones de la metodología y ficha de cada indicador (es el único acceso a la norma completa). */
export const RUTAS_AYUDA: Routes = [
  { path: '', title: 'Ayuda de la norma · EBA', loadComponent: () => import('./ayuda').then((m) => m.Ayuda) },
  { path: ':clave', title: 'Ayuda de la norma · EBA', loadComponent: () => import('./ayuda').then((m) => m.Ayuda) },
];
