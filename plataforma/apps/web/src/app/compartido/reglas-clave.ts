import { Component, computed, input } from '@angular/core';

/** Reglas de contraseña acordadas (las valida también el servidor): 10 caracteres o más, con letras y números. */
export function reglasClave(clave: string, confirmacion: string): { texto: string; cumple: boolean }[] {
  return [
    { texto: 'Al menos 10 caracteres', cumple: clave.length >= 10 },
    { texto: 'Letras y números', cumple: /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave) && /\d/.test(clave) },
    { texto: 'Las dos contraseñas coinciden', cumple: clave.length > 0 && clave === confirmacion },
  ];
}

/** Lista que se va marcando mientras la persona escribe la contraseña nueva. */
@Component({
  selector: 'app-reglas-clave',
  template: `<ul class="reglas-clave" aria-label="Requisitos de la contraseña">
    @for (r of reglas(); track r.texto) { <li [class.cumple]="r.cumple">{{ r.texto }}<span class="sr">{{ r.cumple ? ' (cumple)' : ' (falta)' }}</span></li> }</ul>`,
})
export class ReglasClave {
  readonly clave = input('');
  readonly confirmacion = input('');
  protected readonly reglas = computed(() => reglasClave(this.clave(), this.confirmacion()));
}
