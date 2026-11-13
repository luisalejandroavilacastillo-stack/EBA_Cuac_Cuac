import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import type { Modulo } from '@eba/norma';
import { Sesion } from './sesion';

/** Sin sesión → pantalla de ingreso (y vuelve a donde iba). */
export const sesionGuard: CanActivateFn = async (_r, estado) => {
  const sesion = inject(Sesion), router = inject(Router);
  await sesion.restaurar();
  return sesion.usuario() ? true : router.createUrlTree(['/ingreso'], { queryParams: estado.url && estado.url !== '/' ? { volver: estado.url } : {} });
};

/** Módulo fuera de los permisos del perfil → pantalla «sin permiso». La ruta declara data: { modulo }. */
export const permisoGuard: CanMatchFn = async (ruta) => {
  const sesion = inject(Sesion), router = inject(Router);
  await sesion.restaurar();
  const modulo = ruta.data?.['modulo'] as Modulo | undefined;
  if (!modulo || sesion.puede(modulo)) return true;
  return router.createUrlTree(['/sin-permiso'], { queryParams: { modulo } });
};

/** Si ya hay sesión, el ingreso lleva al inicio. */
export const ingresoGuard: CanActivateFn = async () => {
  const sesion = inject(Sesion), router = inject(Router);
  await sesion.restaurar();
  return sesion.usuario() ? router.createUrlTree(['/inicio']) : true;
};
