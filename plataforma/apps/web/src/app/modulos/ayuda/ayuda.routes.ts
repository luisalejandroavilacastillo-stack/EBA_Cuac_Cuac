import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Ayuda de la norma: Documento completo de la Metodología ICA v1.0 (2024). Es el único acceso a la norma completa. */
export const RUTAS_AYUDA: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Ayuda de la norma', descripcion: 'Documento completo de la Metodología ICA v1.0 (2024). Es el único acceso a la norma completa.', cu: 'CU-23' } },
];
