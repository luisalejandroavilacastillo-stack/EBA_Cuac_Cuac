import { HttpContextToken } from '@angular/common/http';

/** Para pedir que un error no se muestre (la pantalla lo maneja): http.get(url, { context: new HttpContext().set(SIN_MENSAJE, true) }). */
export const SIN_MENSAJE = new HttpContextToken<boolean>(() => false);
