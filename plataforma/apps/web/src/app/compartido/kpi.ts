import { Component, input } from '@angular/core';

/** Tarjeta de indicador del tablero (clase .kpi del prototipo). */
@Component({
  selector: 'app-kpi',
  template: `<div class="kpi kpi-tab" [style.--c]="color()"><div class="v">{{ valor() }}</div><div class="l">{{ texto() }}</div>@if (detalle()) {<div class="det">{{ detalle() }}</div>}</div>`,
})
export class Kpi {
  readonly valor = input.required<string | number>();
  readonly texto = input.required<string>();
  readonly detalle = input<string>('');
  readonly color = input<string>('var(--campo)');
}
