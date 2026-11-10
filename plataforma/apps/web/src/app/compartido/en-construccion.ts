import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

/** Pantalla temporal de un módulo que aún no se implementa. Lee el título y los casos de uso de la ruta. */
@Component({
  selector: 'app-en-construccion',
  template: `
    <h1>{{ datos()?.['titulo'] }}</h1>
    <p class="muted">{{ datos()?.['descripcion'] }}</p>
    <section class="panel">
      <span class="etiqueta e-pend">Por implementar</span>
      <p>Casos de uso: <b>{{ datos()?.['cu'] }}</b>. Ver <code>docs/requerimientos/CASOS_DE_USO.md</code> del prototipo.</p>
    </section>
  `,
})
export class EnConstruccion {
  protected readonly datos = toSignal(inject(ActivatedRoute).data);
}
