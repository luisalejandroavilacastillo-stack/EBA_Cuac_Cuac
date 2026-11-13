import { Injectable, signal } from '@angular/core';

/** Ruta de la barra superior cuando la pantalla necesita más de un nivel (Inicio / Fincas / Granja La Esperanza). */
@Injectable({ providedIn: 'root' })
export class Migas {
  readonly niveles = signal<{ texto: string; ruta?: string }[] | null>(null);
}
