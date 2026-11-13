import { Component, inject } from '@angular/core';
import { Dialogo } from '../nucleo/dialogo';
import { Notificaciones } from '../nucleo/notificaciones';

/** Mensajes cortos y ventana de confirmación de toda la aplicación (equivale a js/ui/capas.js del prototipo). */
@Component({
  selector: 'app-capas',
  template: `
    <div class="mensajes" aria-live="polite">
      @for (m of avisos.mensajes(); track m.id) {
        <div class="toast" [class.toast-error]="m.tipo === 'error'" [class.toast-ok]="m.tipo === 'ok'" role="status">
          <span>{{ m.texto }}</span><button type="button" (click)="avisos.cerrar(m.id)" aria-label="Cerrar mensaje">×</button>
        </div>
      }
    </div>
    @if (dialogo.abierto(); as d) {
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="d.titulo" (click)="$event.target === $event.currentTarget && d.responder(false)">
        <div>
          <h3>{{ d.titulo }}</h3>
          <p>{{ d.mensaje }}</p>
          <div class="acciones">
            <button type="button" class="btn btn-sec" (click)="d.responder(false)">{{ d.cancelar ?? 'Cancelar' }}</button>
            <button type="button" class="btn" [class.btn-peligro]="d.peligro" [class.btn-primario]="!d.peligro" (click)="d.responder(true)">{{ d.aceptar ?? 'Aceptar' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .mensajes { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 70; display: grid; gap: 8px; width: min(560px, calc(100vw - 32px)); }
    .mensajes .toast { position: static; transform: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .toast-error { background: var(--rojo) !important; }
    .toast-ok { background: var(--semilla) !important; }
    .toast button { background: none; border: 0; color: inherit; font-size: 20px; cursor: pointer; line-height: 1; }
  `,
})
export class Capas {
  protected readonly avisos = inject(Notificaciones);
  protected readonly dialogo = inject(Dialogo);
}
