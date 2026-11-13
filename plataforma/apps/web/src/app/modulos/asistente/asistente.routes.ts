import { Routes } from '@angular/router';

/** Asistente de bienestar animal: conversación con el contexto de una finca o evaluación (también en ventana flotante). */
export const RUTAS_ASISTENTE: Routes = [
  { path: '', title: 'Asistente · EBA', loadComponent: () => import('./asistente').then((m) => m.PaginaAsistente) },
  { path: ':id', title: 'Asistente · EBA', loadComponent: () => import('./asistente').then((m) => m.PaginaAsistente) },
];
