import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DESDE_RECORRIDO_G, INDICADOR, fmt, aplica, avance, calcular, indicadoresDe, siguientePendiente, type Medida } from '@eba/norma';
import { FichaIndicador, colorPuntaje } from '../../../compartido/graficas';
import { Notificaciones } from '../../../nucleo/notificaciones';
import { PantallaCampo } from './base';
import { Captura } from './captura';

const MEDIDA: Record<Medida, string> = { MBR: 'Medidas basadas en los recursos', MBA: 'Medidas basadas en el animal', MBG: 'Medidas basadas en la gestión' };
const CAP = { pato: { MBR: '6.1', MBA: '6.2', MBG: '6.3' }, ganso: { MBR: '7.1', MBA: '7.2', MBG: '7.3' } } as const;
const leerPref = (k: string) => { try { return sessionStorage.getItem('eba.pref.' + k) === '1'; } catch { return false; } };
const guardarPref = (k: string, v: boolean) => { try { sessionStorage.setItem('eba.pref.' + k, v ? '1' : '0'); } catch { /* en memoria */ } };

interface ItemIndice { go: string; nombre: string; num: string; est: 'hecho' | 'pend' | 'na'; color: string; extra: string }

/** Pantalla de un indicador (numerales 6.x y 7.x): índice con el avance, captura, cálculo en vivo, gráfica y observación. */
@Component({
  selector: 'app-indicador',
  imports: [RouterLink, Captura, NgTemplateOutlet],
  templateUrl: './indicador.html',
})
export class Indicador extends PantallaCampo {
  readonly code = input.required<string>();
  private readonly ficha = inject(FichaIndicador);
  private readonly avisos = inject(Notificaciones);
  protected readonly MEDIDA = MEDIDA;
  protected get titulo() { const i = INDICADOR[this.code()]; return i ? `${i.num} ${i.name}` : ''; }

  protected readonly ind = computed(() => INDICADOR[this.code()]);
  protected readonly soloPend = signal(leerPref('soloPend'));
  protected readonly listaAbierta = signal(false);
  protected readonly na = computed(() => { const c = this.ctx(); return c ? aplica(this.ind(), c) : null; });

  constructor() {
    super();
    // un código que no es de esta especie lleva a la apertura (igual que el prototipo)
    effect(() => { const ev = this.copia(), i = this.ind(); if (ev && (!i || i.sp !== ev.sp)) this.ir('apertura'); });
    effect(() => { this.code(); this.listaAbierta.set(false); });
  }

  protected readonly todos = computed(() => (this.copia() ? indicadoresDe(this.copia()!.sp) : []));
  protected readonly vecinos = computed(() => { const t = this.todos(), k = t.findIndex((i) => i.code === this.code()); return { prev: t[k - 1], next: t[k + 1] }; });
  protected readonly av = computed(() => (this.copia() && this.f() ? avance(this.copia()!, this.f()!) : { ap: 0, hechos: 0, pct: 0 }));

  protected readonly indice = computed(() => {
    const ev = this.copia(), ctx = this.ctx(); if (!ev || !ctx) return null;
    const item = (go: string, nombre: string, num: string, est: ItemIndice['est'], color: string, extra = ''): ItemIndice => ({ go, nombre, num, est, color, extra });
    const grupos = (['MBR', 'MBA', 'MBG'] as const).map((g) => ({
      titulo: `${CAP[ev.sp][g]} · ${MEDIDA[g]}`,
      items: this.todos().filter((i) => i.g === g).map((i) => { const n = aplica(i, ctx), c = calcular(i, ev.resp[i.code], ctx);
        return item(i.code, i.name, i.num, n ? 'na' : c.done ? 'hecho' : 'pend', n ? '' : c.done ? colorPuntaje(c.score!) : '', c.done && !n ? fmt(c.score) + ' puntos' : ''); }),
    }));
    const unidades = this.todos().filter((i) => !aplica(i, ctx) && i.m.kind === 'units');
    const recOk = unidades.length > 0 && unidades.every((i) => calcular(i, ev.resp[i.code], ctx).done);
    const recOkG = ev.sp === 'ganso' && !!ev['rg'] && DESDE_RECORRIDO_G.filter((c) => !aplica(INDICADOR[c], ctx)).every((c) => calcular(INDICADOR[c], ev.resp[c], ctx).done);
    return {
      inicio: [item('apertura', 'Apertura y muestreo', '5.5', ev.apertura?.atiende ? 'hecho' : 'pend', 'var(--semilla)'),
        item('recorrido', 'Recorrido por puntos (aves y recursos)', '5.6', (ev.sp === 'pato' ? recOk : recOkG) ? 'hecho' : 'pend', 'var(--cosecha)')],
      grupos,
      fin: item('cierre', 'Cierre y resultado', '5.5', ev.estado === 'Finalizada' ? 'hecho' : 'pend', 'var(--tierra)'),
    };
  }, { equal: () => false });
  protected tituloItem(i: ItemIndice): string { return (i.est === 'hecho' ? 'Calificado' : i.est === 'na' ? 'No aplica en esta finca' : 'Pendiente') + (i.extra ? ' · ' + i.extra : ''); }
  protected cambiarSoloPend(v: boolean): void { this.soloPend.set(v); guardarPref('soloPend', v); }

  /** Pie: anterior y cómo seguir (siguiente pendiente, siguiente en orden o cierre). */
  protected readonly pie = computed(() => {
    const ev = this.copia(), f = this.f(), ctx = this.ctx(); if (!ev || !f || !ctx) return null;
    const sig = siguientePendiente(ev, f, this.code()), { prev, next } = this.vecinos(), i = this.ind();
    const hechoActual = !!aplica(i, ctx) || calcular(i, ev.resp[i.code], ctx).done;
    const t = (c: string) => `${INDICADOR[c].num} ${INDICADOR[c].name}`;
    let prim: { go: string; texto: string; title: string }, sec: { go: string; title: string } | null = null;
    if (sig && next && sig === next.code) prim = { go: sig, texto: 'Siguiente', title: t(sig) };
    else if (sig) { prim = { go: sig, texto: 'Siguiente pendiente', title: t(sig) }; if (next) sec = { go: next.code, title: t(next.code) }; }
    else { prim = { go: 'cierre', texto: hechoActual ? 'Todo calificado · Ir al cierre' : 'Ir al cierre', title: '' }; if (next) sec = { go: next.code, title: t(next.code) }; }
    return { ant: prev ? { go: prev.code, texto: 'Anterior', title: t(prev.code) } : { go: 'apertura', texto: 'Apertura', title: '' }, prim, sec };
  });

  protected abrirFicha(): void { this.ficha.abierta.set(this.code()); }
  /** El inspector indica en el nidal (6.1.10) si la finca produce huevo. */
  protected async huevo(h: boolean): Promise<void> {
    const ev = this.copia(); if (!ev) return;
    await this.trabajo.propositoFinca(ev, h).catch(() => null);
    this.avisos.info(h ? 'Finca de huevo: se evalúa el nidal y la condición corporal usa la escala de huevo (Tabla 28).' : 'Finca de carne: el nidal no aplica y la condición corporal usa la escala de carne (Tabla 27).');
  }
}
