import { Directive, computed, inject } from '@angular/core';
import { contexto, fmt, nombreEspecie, siguientePendiente, type Evaluacion } from '@eba/norma';
import { Trabajo } from '../../../nucleo/trabajo';
import { PantallaVisita } from '../base';

/** Hora corta («07:42 a. m.»), igual que el prototipo. */
export const hora = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '');
export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export { fmt };

/**
 * Base de las pantallas de campo (apertura, recorrido, indicadores y cierre): trabajan sobre la copia de la visita
 * que guarda el servicio Trabajo, de modo que lo registrado no se pierde aunque falle la señal.
 */
@Directive()
export abstract class PantallaCampo extends PantallaVisita {
  protected readonly trabajo = inject(Trabajo);
  /** Copia de trabajo (la misma referencia cambia por dentro: se vuelve a leer con cada cambio). */
  protected readonly copia = computed<Evaluacion | undefined>(() => { this.trabajo.tick(); return this.trabajo.copia(this.id()); }, { equal: () => false });
  protected readonly ctx = computed(() => { const ev = this.copia(), f = this.f(); return ev && f ? contexto(ev, f) : null; }, { equal: () => false });
  /** El inspector asignado puede registrar (visita asignada, en proceso o devuelta). */
  protected readonly ed = computed(() => { const ev = this.copia(); return !!ev && this.flujo().puedeEvaluar(ev); });
  protected readonly nombreEsp = computed(() => (this.copia() ? nombreEspecie(this.copia()!.sp) : ''));
  protected readonly textoGuardado = computed(() => {
    const st = this.trabajo.estado(), ev = this.copia();
    if (st === 'sin-conexion') return '📶 Sin conexión: los cambios quedan en este equipo y se envían al volver la señal';
    if (st === 'guardando' || st === 'pendiente') return '⏳ Guardando…';
    const g = (ev?.['guardado'] as string | null | undefined) ?? null;
    return g ? '💾 Guardado ' + hora(g) : '';
  });
  /** Paso al que lleva «Continuar evaluando lista de indicadores»: el primer pendiente o el cierre. */
  protected readonly destinoLista = computed(() => { const ev = this.copia(), f = this.f(); return ev && f ? siguientePendiente(ev, f) ?? 'cierre' : 'cierre'; });

  /** Registra un cambio en la copia (se guarda solo). */
  protected cambio(): void { const ev = this.copia(); if (ev) this.trabajo.cambio(ev); }
  protected ir(paso: string): void { void this.router.navigate(['/visitas', this.id(), ...(paso ? paso.split('/') : [])]); }
}
