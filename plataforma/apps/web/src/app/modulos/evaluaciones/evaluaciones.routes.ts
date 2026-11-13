import { Routes } from '@angular/router';

/** Las visitas se gestionan desde Fincas (igual que el prototipo): la dirección antigua lleva allí. */
export const RUTAS_EVALUACIONES: Routes = [{ path: '**', redirectTo: '/fincas' }];
