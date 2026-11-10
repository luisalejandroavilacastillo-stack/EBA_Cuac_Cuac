import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Mi cuenta y seguridad: Datos de acceso y sesiones activas. */
export const RUTAS_CUENTA: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Mi cuenta y seguridad', descripcion: 'Datos de acceso y sesiones activas.', cu: 'CU-03' } },
];
