import { environment } from '../../environments/environment';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SIN_MENSAJE } from './contexto';
import { Notificaciones } from './notificaciones';
import { Sesion } from './sesion';

export { SIN_MENSAJE } from './contexto';

/**
 * Errores de la API → mensaje claro para el usuario.
 * 401 fuera del ingreso = la sesión venció o se cerró (inactividad, contraseña nueva, cuenta inactivada): se vuelve al ingreso.
 * La identidad viaja sola en la cookie de sesión (HttpOnly); el navegador no envía encabezados de perfil.
 */
export const erroresInterceptor: HttpInterceptorFn = (req, next) => {
  const avisos = inject(Notificaciones), sesion = inject(Sesion);
  // La API nunca pasa por el service worker (solo guarda la aplicación): así, sin señal, la petición falla de verdad
  // y la plataforma usa la copia del equipo en lugar de esperar al service worker.
  if (req.url.startsWith(environment.apiUrl)) req = req.clone({ setHeaders: { 'ngsw-bypass': '1' } });
  return next(req).pipe(
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse) {
        if (e.status === 401 && !req.url.includes('/auth/')) { sesion.expirada(); return throwError(() => e); }
        if (!req.context.get(SIN_MENSAJE)) avisos.error(mensajeDeError(e));
      }
      return throwError(() => e);
    }),
  );
};

export function mensajeDeError(e: HttpErrorResponse): string {
  const del = typeof e.error === 'object' && e.error && 'error' in e.error ? String(e.error.error) : '';
  switch (e.status) {
    case 0: return 'No hay conexión con el servidor. Revise su internet e intente de nuevo.';
    case 401: return del || 'Su sesión terminó. Vuelva a ingresar.';
    case 403: return del || 'Su perfil no tiene permiso para hacer esto.';
    case 404: return del || 'No se encontró lo que busca.';
    case 409: return del || 'Otra persona modificó este registro. Se cargó la versión más reciente.';
    case 422: case 400: return del || 'Revise los datos del formulario.';
    case 423: case 429: return del || 'Demasiados intentos. Espere unos minutos.';
    default: return del || 'Ocurrió un error en el servidor. Intente de nuevo en unos minutos.';
  }
}

/** Errores por campo que devuelve la API ({ detalles: { campos: { correo: '…' } } }). */
export function camposConError(e: unknown): Record<string, string> {
  if (!(e instanceof HttpErrorResponse)) return {};
  const c = (e.error as { detalles?: { campos?: Record<string, string> } } | null)?.detalles?.campos;
  return c && typeof c === 'object' ? c : {};
}
