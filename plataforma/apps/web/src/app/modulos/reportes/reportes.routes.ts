import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Reportes: Filtros, comparación entre visitas, impresión y CSV sin datos personales. */
export const RUTAS_REPORTES: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Reportes', descripcion: 'Filtros, comparación entre visitas, impresión y CSV sin datos personales.', cu: 'CU-21' } },
];
