import { Component, computed, inject, input, output } from '@angular/core';
import { INDICADOR, type Evaluacion, type Finca } from '@eba/norma';
import { BotonFicha } from '../../../compartido/graficas';
import { Datos } from '../../../nucleo/datos';
import { Trabajo } from '../../../nucleo/trabajo';
import { hora } from './base';
import { Captura } from './captura';

const MEDIDA: Record<string, string> = { MBR: 'Medidas basadas en los recursos', MBA: 'Medidas basadas en el animal', MBG: 'Medidas basadas en la gestión' };

/** Ventana para calificar un indicador sin salir de la pantalla (p. ej., jadeo y amontonamiento desde el recorrido). */
@Component({
  selector: 'app-indicador-flotante',
  imports: [Captura, BotonFicha],
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
<div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="ind().num + ' ' + ind().name" (click)="$event.target === $event.currentTarget && cerrar.emit()">
  <div class="modal-ancho">
    <div class="modal-cab"><div class="num-ind">{{ ind().num }} · {{ medida() }}</div><h3>{{ ind().name }} <app-btn-ficha [code]="code()" /></h3><p class="pregunta">{{ ind().q }}</p></div>
    <div class="modal-cuerpo"><app-captura class="ficha-flotante" [ev]="ev()" [code]="code()" [finca]="finca()" /></div>
    <div class="acciones"><span class="guardado" style="margin-right:auto" role="status">{{ guardado() }}</span>
      <button type="button" class="btn btn-primario" (click)="cerrar.emit()">{{ ed() ? 'Guardar y volver' : 'Cerrar' }}</button></div>
  </div>
</div>`,
})
export class IndicadorFlotante {
  readonly ev = input.required<Evaluacion>();
  readonly code = input.required<string>();
  readonly finca = input.required<Finca>();
  readonly cerrar = output<void>();
  private readonly datos = inject(Datos);
  private readonly trabajo = inject(Trabajo);
  protected readonly ind = computed(() => INDICADOR[this.code()]);
  protected readonly medida = computed(() => MEDIDA[this.ind().g]);
  protected readonly ed = computed(() => this.datos.flujo().puedeEvaluar(this.ev()));
  protected readonly guardado = computed(() => { this.trabajo.tick(); const g = this.ev()['guardado'] as string | undefined; return g ? '💾 Guardado ' + hora(g) : ''; });
}
