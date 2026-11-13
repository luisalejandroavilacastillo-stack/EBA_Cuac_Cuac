import { Injectable, signal } from '@angular/core';

export type TipoMensaje = 'ok' | 'error' | 'info';
export interface Mensaje { id: number; tipo: TipoMensaje; texto: string }

/** Mensajes cortos en la esquina de la pantalla (equivale a toast() del prototipo). */
@Injectable({ providedIn: 'root' })
export class Notificaciones {
  private n = 0;
  readonly mensajes = signal<Mensaje[]>([]);

  ok(texto: string): void { this.mostrar('ok', texto); }
  error(texto: string): void { this.mostrar('error', texto, 7000); }
  info(texto: string): void { this.mostrar('info', texto); }

  cerrar(id: number): void { this.mensajes.update((l) => l.filter((m) => m.id !== id)); }

  private mostrar(tipo: TipoMensaje, texto: string, ms = 4500): void {
    const id = ++this.n;
    this.mensajes.update((l) => [...l.slice(-3), { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), ms);
  }
}
