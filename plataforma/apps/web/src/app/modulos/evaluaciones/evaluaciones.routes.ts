import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Inspección: Apertura, recorrido por puntos de patos y gansos, lista de chequeo, ficha del indicador y cierre. */
export const RUTAS_EVALUACIONES: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Inspección', descripcion: 'Apertura, recorrido por puntos de patos y gansos, lista de chequeo, ficha del indicador y cierre.', cu: 'CU-08 a CU-16' } },
];
