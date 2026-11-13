import { Component } from '@angular/core';

/** Columna de marca de las pantallas públicas (ingreso, activación y recuperación), igual a la del prototipo. */
@Component({
  selector: 'app-marca-ingreso',
  host: { class: 'ingreso-marca', role: 'presentation' },
  template: `<div><img src="logo-eba-blanco.svg" alt="EBA Cuac Cuac · Bienestar animal en patos y gansos">
    <h1>Bienestar animal en patos y gansos</h1>
    <p class="bajada">Evaluación en campo con la metodología oficial: recursos, animales y gestión, calificados en una sola visita.</p>
    <div class="mosaico" aria-hidden="true">@for (c of colores; track c) { <span [style.background]="c"></span> }</div></div>
    <div class="franja" aria-hidden="true"></div>`,
})
export class MarcaIngreso {
  protected readonly colores = ['var(--semilla)', 'var(--cosecha)', 'var(--siembra)', 'var(--campo)', 'var(--arena)'];
}
