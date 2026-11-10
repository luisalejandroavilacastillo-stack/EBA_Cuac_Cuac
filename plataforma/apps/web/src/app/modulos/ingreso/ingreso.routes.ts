import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Ingreso: Usuario, contraseña y código de verificación en dos pasos. */
export const RUTAS_INGRESO: Routes = [
  { path: '', component: EnConstruccion, data: { titulo: 'Ingreso', descripcion: 'Usuario, contraseña y código de verificación en dos pasos.', cu: 'CU-01 y CU-02' } },
];
