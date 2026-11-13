import { Component, computed, inject, input } from '@angular/core';
import { Datos } from '../../../nucleo/datos';
import { RecorridoGanso } from './recorrido-ganso';
import { RecorridoPato } from './recorrido-pato';

/** Recorrido por puntos: el de patos (ave por ave, con niveles) o el de gansos (novedades por ganso), según la especie. */
@Component({
  selector: 'app-recorrido',
  imports: [RecorridoPato, RecorridoGanso],
  template: `@if (sp() === 'pato') { <app-recorrido-pato [id]="id()" [pt]="pt()" [av]="av()" /> }
    @else if (sp() === 'ganso') { <app-recorrido-ganso [id]="id()" [pt]="pt()" /> }`,
})
export class Recorrido {
  readonly id = input.required<string>();
  readonly pt = input<string>();
  readonly av = input<string>();
  private readonly datos = inject(Datos);
  protected readonly sp = computed(() => this.datos.evals().find((e) => e.id === this.id())?.sp);
}
