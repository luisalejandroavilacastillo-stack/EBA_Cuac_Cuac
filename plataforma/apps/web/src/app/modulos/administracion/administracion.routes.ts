import { Routes } from '@angular/router';
import { EnConstruccion } from '../../compartido/en-construccion';

/** Módulos del administrador: usuarios, parametrización y bitácora. */
export const RUTAS_ADMINISTRACION: Routes = [
  { path: 'usuarios', component: EnConstruccion, data: { titulo: 'Usuarios', descripcion: 'Crear, cambiar rol, inactivar o eliminar usuarios.', cu: 'CU-24' } },
  { path: 'parametrizacion', component: EnConstruccion, data: { titulo: 'Parametrización', descripcion: 'Versiones de la lista por especie, pesos por tramo y asistente de IA.', cu: 'CU-25' } },
  { path: 'bitacora', component: EnConstruccion, data: { titulo: 'Bitácora', descripcion: 'Acciones con fecha y usuario.', cu: 'CU-26' } },
];
