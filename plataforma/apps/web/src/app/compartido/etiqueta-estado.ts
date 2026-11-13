import { Component, computed, input } from '@angular/core';
import { COLOR_ESTADO } from '@eba/norma';

/** Etiqueta de color de un estado del flujo (mismos colores del prototipo). */
@Component({
  selector: 'app-etiqueta-estado',
  template: `<span class="etiqueta" [class]="'etiqueta ' + clase()">{{ estado() }}</span>`,
})
export class EtiquetaEstado {
  readonly estado = input.required<string>();
  protected readonly clase = computed(() => (COLOR_ESTADO as Record<string, string>)[this.estado()] ?? 'e-gris');
}
