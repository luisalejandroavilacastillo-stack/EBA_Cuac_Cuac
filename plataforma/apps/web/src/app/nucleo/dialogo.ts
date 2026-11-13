import { Injectable, signal } from '@angular/core';

export interface OpcionesDialogo { titulo: string; mensaje: string; aceptar?: string; cancelar?: string; peligro?: boolean }
interface Abierto extends OpcionesDialogo { responder: (si: boolean) => void }

/** Ventana de confirmación (reemplaza los confirm() del navegador). Uso: if (await dialogo.confirmar({...})) … */
@Injectable({ providedIn: 'root' })
export class Dialogo {
  readonly abierto = signal<Abierto | null>(null);

  confirmar(o: OpcionesDialogo): Promise<boolean> {
    return new Promise((resolve) => this.abierto.set({ ...o, responder: (si) => { this.abierto.set(null); resolve(si); } }));
  }
}
