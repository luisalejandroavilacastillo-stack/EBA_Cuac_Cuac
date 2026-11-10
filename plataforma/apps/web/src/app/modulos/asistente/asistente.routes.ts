import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Asistente de la norma: Panel flotante disponible en todas las pantallas; responde solo sobre la norma. */
export const RUTAS_ASISTENTE: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Asistente de la norma', descripcion: 'Panel flotante disponible en todas las pantallas; responde solo sobre la norma.', cu: 'CU-22' } },
];
