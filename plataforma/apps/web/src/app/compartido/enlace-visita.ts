import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { destinoVisita } from '../nucleo/datos';

/** Enlace a una pantalla de la visita: dentro de Angular si ya existe; si no, en el prototipo (misma sesión). */
@Component({
  selector: 'app-enlace-visita',
  imports: [RouterLink, NgTemplateOutlet],
  template: `<ng-template #texto><ng-content /></ng-template>
    @if (destino().interno; as r) { <a [class]="clase()" [routerLink]="r"><ng-container *ngTemplateOutlet="texto" /></a> }
    @else { <a [class]="clase()" [href]="destino().externo"><ng-container *ngTemplateOutlet="texto" /></a> }`,
  styles: `:host { display: contents; }`,
})
export class EnlaceVisita {
  readonly id = input.required<string>();
  readonly paso = input('');
  readonly clase = input('');
  protected readonly destino = computed(() => destinoVisita(this.id(), this.paso()) as { interno?: string[]; externo?: string });
}
